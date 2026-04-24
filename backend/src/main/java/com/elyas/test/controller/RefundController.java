package com.elyas.test.controller;

import com.elyas.test.model.EarningsByDay;
import com.elyas.test.model.Order;
import com.elyas.test.model.OrderItem;
import com.elyas.test.model.RefundRequest;
import com.elyas.test.model.User;
import com.elyas.test.repository.EarningsByDayRepository;
import com.elyas.test.repository.OrderItemRepository;
import com.elyas.test.repository.OrderRepository;
import com.elyas.test.repository.RefundRequestRepository;
import com.elyas.test.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/refunds")
public class RefundController {

    private final RefundRequestRepository repo;
    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final UserRepository userRepo;
    private final EarningsByDayRepository earningsRepo;

    public RefundController(RefundRequestRepository repo,
                            OrderRepository orderRepo,
                            OrderItemRepository orderItemRepo,
                            UserRepository userRepo,
                            EarningsByDayRepository earningsRepo) {
        this.repo = repo;
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
        this.userRepo = userRepo;
        this.earningsRepo = earningsRepo;
    }

    @PostMapping
    public ResponseEntity<?> createRefund(@RequestBody Map<String, Object> body) {
        // Null-check BEFORE any cast to avoid 500 on missing fields
        Object orderIdRaw = body.get("orderId");
        Object amountRaw  = body.get("amount");
        String waiterId   = (String) body.get("waiterId");
        String reason     = (String) body.get("reason");

        if (orderIdRaw == null || amountRaw == null || waiterId == null || reason == null
                || waiterId.isBlank() || reason.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "orderId, waiterId, reason, and amount are required."));
        }

        Long orderId;
        Double amount;
        try {
            orderId = ((Number) orderIdRaw).longValue();
            amount  = ((Number) amountRaw).doubleValue();
        } catch (ClassCastException ex) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "orderId must be a number and amount must be a number."));
        }

        RefundRequest req = new RefundRequest();
        req.setOrderId(orderId);
        req.setWaiterId(waiterId.toUpperCase());
        req.setReason(reason);
        req.setAmount(amount);
        repo.save(req);

        return ResponseEntity.ok(enrich(req));
    }

    @GetMapping("/pending")
    public List<Map<String, Object>> getPending() {
        return repo.findByStatus("PENDING").stream()
                .sorted(Comparator.comparing(RefundRequest::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::enrich)
                .toList();
    }

    @GetMapping
    public List<Map<String, Object>> getAll() {
        return repo.findAll().stream()
                .sorted(Comparator.comparing(RefundRequest::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::enrich)
                .toList();
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id,
                                     @RequestBody(required = false) Map<String, String> body) {
        Optional<RefundRequest> found = repo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        RefundRequest req = found.get();

        // Idempotency: refuse to act on an already-decided request.
        // Without this, a double-click in the UI would run the earnings
        // reversal logic twice and inflate the refund effect.
        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Refund already " + req.getStatus().toLowerCase() + "."));
        }

        // Actually reverse the money. The original payment at
        // OrderController.completeOrder() incremented EarningsByDay.revenue
        // by the order total on the completion date — on approval we
        // subtract the refund amount from THAT SAME day so historical
        // daily earnings stay correct.
        Double refundAmount = req.getAmount() == null ? 0.0 : req.getAmount();
        if (refundAmount > 0) {
            LocalDate refundDate = pickEarningsDate(req.getOrderId());
            earningsRepo.findById(refundDate).ifPresent(e -> {
                double rev = (e.getRevenue() == null ? 0.0 : e.getRevenue()) - refundAmount;
                e.setRevenue(Math.max(0.0, rev));
                earningsRepo.save(e);
            });
        }

        req.setStatus("APPROVED");
        req.setManagerId(body != null ? body.get("managerId") : null);
        req.setDecidedAt(LocalDateTime.now());
        repo.save(req);

        return ResponseEntity.ok(enrich(req));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id,
                                    @RequestBody(required = false) Map<String, String> body) {
        String rejectionReason = body != null ? body.get("rejectionReason") : null;
        if (rejectionReason == null || rejectionReason.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "A rejection reason is required."));
        }

        Optional<RefundRequest> found = repo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        RefundRequest req = found.get();

        // Same idempotency rule as approve().
        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Refund already " + req.getStatus().toLowerCase() + "."));
        }

        req.setStatus("REJECTED");
        req.setManagerId(body.get("managerId"));
        req.setRejectionReason(rejectionReason.trim());
        req.setDecidedAt(LocalDateTime.now());
        repo.save(req);

        return ResponseEntity.ok(enrich(req));
    }

    /**
     * Find which day's earnings bucket to decrement. Prefer the order's
     * completion date (that's the day the money landed). Fall back to
     * today if the order row is gone or has no completion timestamp.
     */
    private LocalDate pickEarningsDate(Long orderId) {
        if (orderId != null) {
            Optional<Order> ord = orderRepo.findById(orderId);
            if (ord.isPresent() && ord.get().getCompletedAt() != null) {
                return ord.get().getCompletedAt().toLocalDate();
            }
        }
        return LocalDate.now();
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    /**
     * Frontend needs more than the raw row — it displays table id, waiter name,
     * the original line items, and a total. Denormalize here so the UI can render
     * without N+1 extra calls.
     */
    private Map<String, Object> enrich(RefundRequest r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("orderId", r.getOrderId());
        m.put("waiterId", r.getWaiterId());
        m.put("reason", r.getReason());
        m.put("amount", r.getAmount());
        m.put("totalAmount", r.getAmount());
        m.put("status", r.getStatus());
        m.put("managerId", r.getManagerId());
        m.put("rejectionReason", r.getRejectionReason());
        m.put("createdAt", r.getCreatedAt());
        m.put("decidedAt", r.getDecidedAt());

        // Order-level info
        String tableId = null;
        List<Map<String, Object>> itemList = new ArrayList<>();
        if (r.getOrderId() != null) {
            Optional<Order> ord = orderRepo.findById(r.getOrderId());
            if (ord.isPresent()) {
                tableId = ord.get().getTableId();
            }
            for (OrderItem oi : orderItemRepo.findByOrderOrderId(r.getOrderId())) {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("itemId", oi.getItemId());
                im.put("itemName", oi.getItemName());
                im.put("seatId", oi.getSeatId());
                im.put("quantity", oi.getQuantity());
                im.put("itemPrice", oi.getItemPrice());
                itemList.add(im);
            }
        }
        m.put("tableId", tableId);
        m.put("items", itemList);

        // Waiter name lookup
        String waiterName = null;
        if (r.getWaiterId() != null) {
            Optional<User> u = userRepo.findByEmployeeId(r.getWaiterId());
            if (u.isPresent()) waiterName = u.get().getName();
        }
        m.put("waiterName", waiterName);

        return m;
    }
}
