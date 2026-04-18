package com.elyas.test.controller;

import com.elyas.test.model.RefundRequest;
import com.elyas.test.repository.RefundRequestRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/refunds")
public class RefundController {

    private final RefundRequestRepository repo;

    public RefundController(RefundRequestRepository repo) {
        this.repo = repo;
    }

    @PostMapping
    public ResponseEntity<?> createRefund(@RequestBody Map<String, Object> body) {
        Long orderId    = ((Number) body.get("orderId")).longValue();
        String waiterId = (String) body.get("waiterId");
        String reason   = (String) body.get("reason");
        Double amount   = ((Number) body.get("amount")).doubleValue();

        if (orderId == null || waiterId == null || reason == null || amount == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "orderId, waiterId, reason, and amount are required."));
        }

        RefundRequest req = new RefundRequest();
        req.setOrderId(orderId);
        req.setWaiterId(waiterId.toUpperCase());
        req.setReason(reason);
        req.setAmount(amount);
        repo.save(req);

        return ResponseEntity.ok(req);
    }

    @GetMapping("/pending")
    public List<RefundRequest> getPending() {
        return repo.findByStatus("PENDING");
    }

    @GetMapping
    public List<RefundRequest> getAll() {
        return repo.findAll();
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id,
                                     @RequestBody Map<String, String> body) {
        Optional<RefundRequest> found = repo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        RefundRequest req = found.get();
        req.setStatus("APPROVED");
        req.setManagerId(body.get("managerId"));
        req.setDecidedAt(LocalDateTime.now());
        repo.save(req);

        return ResponseEntity.ok(req);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id,
                                    @RequestBody Map<String, String> body) {
        String rejectionReason = body.get("rejectionReason");
        if (rejectionReason == null || rejectionReason.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "A rejection reason is required."));
        }

        Optional<RefundRequest> found = repo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        RefundRequest req = found.get();
        req.setStatus("REJECTED");
        req.setManagerId(body.get("managerId"));
        req.setRejectionReason(rejectionReason.trim());
        req.setDecidedAt(LocalDateTime.now());
        repo.save(req);

        return ResponseEntity.ok(req);
    }
}
