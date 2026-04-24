package com.elyas.test.controller;

import com.elyas.test.model.*;
import com.elyas.test.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final MenuItemRepository menuItemRepo;
    private final TableStatusRepository tableRepo;
    private final EarningsByDayRepository earningsRepo;

    public OrderController(OrderRepository orderRepo,
                           OrderItemRepository orderItemRepo,
                           MenuItemRepository menuItemRepo,
                           TableStatusRepository tableRepo,
                           EarningsByDayRepository earningsRepo) {
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
        this.menuItemRepo = menuItemRepo;
        this.tableRepo = tableRepo;
        this.earningsRepo = earningsRepo;
    }

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> body) {
        String tableId  = (String) body.get("tableId");
        String waiterId = (String) body.get("waiterId");

        if (tableId == null || waiterId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "tableId and waiterId are required."));
        }

        Order order = new Order();
        order.setTableId(tableId.toUpperCase());
        order.setWaiterId(waiterId.toUpperCase());
        order.setStatus("PENDING");
        order = orderRepo.save(order);

        // Mark table as occupied
        tableRepo.findById(tableId.toUpperCase()).ifPresent(t -> {
            t.setStatus("OCCUPIED");
            tableRepo.save(t);
        });

        return ResponseEntity.ok(buildOrderResponse(order));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<?> addItems(@PathVariable Long id,
                                      @RequestBody List<Map<String, Object>> items) {
        Optional<Order> found = orderRepo.findById(id);
        if (found.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Order order = found.get();

        // An order stops being editable once it's been submitted to the
        // kitchen — otherwise a late addItems() call would deduct stock
        // for food the kitchen never saw (or, worse, on a COMPLETE order,
        // silently consume inventory with no corresponding revenue).
        if (!"PENDING".equalsIgnoreCase(order.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Cannot add items — order is already "
                            + order.getStatus().toLowerCase() + "."));
        }

        // Pre-flight check: the lines in this request might ask for more of
        // the same item across multiple seats. Aggregate the requested qty
        // per item so we compare against stock in one shot and reject the
        // whole batch atomically if anything is short.
        Map<Long, Integer> requestedQty = new LinkedHashMap<>();
        for (Map<String, Object> itemData : items) {
            if (itemData.get("itemId") == null) continue;
            Long itemId = ((Number) itemData.get("itemId")).longValue();
            Integer qty = itemData.containsKey("quantity")
                    ? ((Number) itemData.get("quantity")).intValue() : 1;
            requestedQty.merge(itemId, qty, Integer::sum);
        }

        // Validate availability + stock BEFORE mutating anything.
        for (Map.Entry<Long, Integer> e : requestedQty.entrySet()) {
            Optional<MenuItem> found2 = menuItemRepo.findById(e.getKey());
            if (found2.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Menu item " + e.getKey() + " no longer exists."));
            }
            MenuItem mi = found2.get();
            if (Boolean.FALSE.equals(mi.getIsActive())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", mi.getName() + " is unavailable."));
            }
            if (mi.getStock() != null && mi.getStock() < e.getValue()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message",
                                "Not enough stock for " + mi.getName()
                                + " (have " + mi.getStock() + ", need " + e.getValue() + ")."));
            }
        }

        // All good — persist order lines AND decrement stock in the same pass.
        // Stock is deducted at order time (not at mark-ready) so the next
        // waiter can't sell the same last unit twice.
        for (Map<String, Object> itemData : items) {
            Long itemId   = ((Number) itemData.get("itemId")).longValue();
            Integer seatId = ((Number) itemData.get("seatId")).intValue();
            Integer qty    = itemData.containsKey("quantity") ? ((Number) itemData.get("quantity")).intValue() : 1;

            MenuItem mi = menuItemRepo.findById(itemId).orElse(null);
            if (mi == null) continue;

            OrderItem oi = new OrderItem();
            oi.setOrder(order);
            oi.setItemId(itemId);
            oi.setItemName(mi.getName());
            oi.setSeatId(seatId);
            oi.setQuantity(qty);
            oi.setItemPrice(mi.getPrice());
            orderItemRepo.save(oi);

            if (mi.getStock() != null) {
                mi.setStock(Math.max(0, mi.getStock() - qty));
                menuItemRepo.save(mi);
            }
        }

        return ResponseEntity.ok(buildOrderResponse(orderRepo.findById(id).get()));
    }

    @PutMapping("/{id}/submit")
    public ResponseEntity<?> submitOrder(@PathVariable Long id) {
        Optional<Order> found = orderRepo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        Order order = found.get();
        order.setStatus("IN_QUEUE");
        order.setSubmittedAt(LocalDateTime.now());
        orderRepo.save(order);

        return ResponseEntity.ok(buildOrderResponse(order));
    }

    @PutMapping("/{id}/ready")
    public ResponseEntity<?> markReady(@PathVariable Long id) {
        Optional<Order> found = orderRepo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        Order order = found.get();
        order.setStatus("READY");
        order.setReadyAt(LocalDateTime.now());
        orderRepo.save(order);

        // Stock is already decremented at order-add time (see addItems),
        // so mark-ready is now a pure status transition that the waiter
        // can immediately act on to take payment.

        return ResponseEntity.ok(buildOrderResponse(order));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<?> completeOrder(@PathVariable Long id,
                                           @RequestBody(required = false) Map<String, String> body) {
        Optional<Order> found = orderRepo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        Order order = found.get();

        // Idempotency: double-clicking Pay Cash → Pay Card (or any rapid
        // duplicate submit) must not re-credit earnings and item stats.
        if ("COMPLETE".equalsIgnoreCase(order.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Order has already been paid."));
        }

        // The workflow is: PENDING → IN_QUEUE → READY → COMPLETE.
        // Completing before the kitchen has marked it READY skips the
        // cook workflow and records earnings for food that was never made.
        if (!"READY".equalsIgnoreCase(order.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Order is not ready for payment yet (current status: "
                            + order.getStatus() + ")."));
        }

        order.setStatus("COMPLETE");
        order.setCompletedAt(LocalDateTime.now());
        orderRepo.save(order);

        // Calculate total and record earnings
        String paymentMethod = (body != null && body.get("paymentMethod") != null) ? body.get("paymentMethod") : "card";
        double total = 0;
        List<OrderItem> items = orderItemRepo.findByOrderOrderId(id);
        for (OrderItem oi : items) {
            total += oi.getItemPrice() * oi.getQuantity();

            // Update menu item stats
            menuItemRepo.findById(oi.getItemId()).ifPresent(mi -> {
                mi.setItemsSold(mi.getItemsSold() + oi.getQuantity());
                mi.setTotalRevenue(mi.getTotalRevenue() + (oi.getItemPrice() * oi.getQuantity()));
                menuItemRepo.save(mi);
            });
        }

        // Update daily earnings
        LocalDate today = LocalDate.now();
        EarningsByDay earnings = earningsRepo.findById(today).orElseGet(() -> {
            EarningsByDay e = new EarningsByDay();
            e.setEarnDate(today);
            return e;
        });
        earnings.setRevenue(earnings.getRevenue() + total);
        if ("cash".equalsIgnoreCase(paymentMethod)) {
            earnings.setCashPayments(earnings.getCashPayments() + 1);
        } else {
            earnings.setCardPayments(earnings.getCardPayments() + 1);
        }
        earningsRepo.save(earnings);

        return ResponseEntity.ok(buildOrderResponse(order));
    }

    /**
     * Cancel an in-progress order. Only PENDING orders can be deleted —
     * once the kitchen is working on it, cancellation would mean losing
     * prep work. This endpoint exists so the frontend can roll back the
     * table-OCCUPIED state when a waiter abandons an order mid-flow
     * (e.g. closes the app after tapping a table but before submitting).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id) {
        Optional<Order> found = orderRepo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        Order order = found.get();
        if (!"PENDING".equalsIgnoreCase(order.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Only pending orders can be cancelled. Current status: "
                            + order.getStatus()));
        }

        // Restore stock for any items already added — we deducted at
        // addItems time, so cancellation must give it back.
        List<OrderItem> orderItems = orderItemRepo.findByOrderOrderId(id);
        for (OrderItem oi : orderItems) {
            menuItemRepo.findById(oi.getItemId()).ifPresent(mi -> {
                if (mi.getStock() != null) {
                    mi.setStock(mi.getStock() + oi.getQuantity());
                    menuItemRepo.save(mi);
                }
            });
        }

        // Remove the order rows (cascade via Order.items mappedBy).
        orderRepo.delete(order);

        // If this was the last active order on the table, return it to CLEAN.
        // createOrder flipped it to OCCUPIED, so we need to undo that too.
        String tableId = order.getTableId();
        List<Order> remaining = orderRepo.findByTableIdAndStatusNot(tableId, "COMPLETE");
        if (remaining.isEmpty()) {
            tableRepo.findById(tableId).ifPresent(t -> {
                t.setStatus("CLEAN");
                tableRepo.save(t);
            });
        }

        return ResponseEntity.ok(Map.of(
                "message", "Order " + id + " cancelled and table " + tableId + " released."));
    }

    @GetMapping("/queue")
    public List<Map<String, Object>> getKitchenQueue() {
        List<Order> queue = orderRepo.findByStatusIn(List.of("IN_QUEUE", "READY"));
        queue.sort(Comparator.comparing(Order::getCreatedAt));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Order o : queue) {
            result.add(buildOrderResponse(o));
        }
        return result;
    }

    @GetMapping("/table/{tableId}")
    public List<Map<String, Object>> getOrdersForTable(@PathVariable String tableId) {
        List<Order> orders = orderRepo.findByTableIdAndStatusNot(tableId.toUpperCase(), "COMPLETE");
        List<Map<String, Object>> result = new ArrayList<>();
        for (Order o : orders) {
            result.add(buildOrderResponse(o));
        }
        return result;
    }

    @GetMapping
    public List<Map<String, Object>> getAllOrders() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Order o : orderRepo.findAll()) {
            result.add(buildOrderResponse(o));
        }
        return result;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(@PathVariable Long id) {
        Optional<Order> found = orderRepo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(buildOrderResponse(found.get()));
    }

    private Map<String, Object> buildOrderResponse(Order order) {
        List<OrderItem> items = orderItemRepo.findByOrderOrderId(order.getOrderId());
        double total = items.stream()
                .mapToDouble(oi -> oi.getItemPrice() * oi.getQuantity())
                .sum();

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("orderId", order.getOrderId());
        resp.put("tableId", order.getTableId());
        resp.put("waiterId", order.getWaiterId());
        resp.put("status", order.getStatus());
        resp.put("createdAt", order.getCreatedAt());
        resp.put("submittedAt", order.getSubmittedAt());
        resp.put("readyAt", order.getReadyAt());
        resp.put("completedAt", order.getCompletedAt());
        resp.put("total", total);
        resp.put("items", items);
        return resp;
    }
}
