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
        for (Map<String, Object> itemData : items) {
            Long itemId   = ((Number) itemData.get("itemId")).longValue();
            Integer seatId = ((Number) itemData.get("seatId")).intValue();
            Integer qty    = itemData.containsKey("quantity") ? ((Number) itemData.get("quantity")).intValue() : 1;

            Optional<MenuItem> menuItem = menuItemRepo.findById(itemId);
            if (menuItem.isEmpty()) continue;

            MenuItem mi = menuItem.get();
            OrderItem oi = new OrderItem();
            oi.setOrder(order);
            oi.setItemId(itemId);
            oi.setItemName(mi.getName());
            oi.setSeatId(seatId);
            oi.setQuantity(qty);
            oi.setItemPrice(mi.getPrice());
            orderItemRepo.save(oi);
        }

        return ResponseEntity.ok(buildOrderResponse(orderRepo.findById(id).get()));
    }

    @PutMapping("/{id}/submit")
    public ResponseEntity<?> submitOrder(@PathVariable Long id) {
        Optional<Order> found = orderRepo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        Order order = found.get();
        order.setStatus("IN_QUEUE");
        orderRepo.save(order);

        return ResponseEntity.ok(buildOrderResponse(order));
    }

    @PutMapping("/{id}/ready")
    public ResponseEntity<?> markReady(@PathVariable Long id) {
        Optional<Order> found = orderRepo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        Order order = found.get();
        order.setStatus("READY");
        orderRepo.save(order);

        return ResponseEntity.ok(buildOrderResponse(order));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<?> completeOrder(@PathVariable Long id,
                                           @RequestBody(required = false) Map<String, String> body) {
        Optional<Order> found = orderRepo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        Order order = found.get();
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
        resp.put("completedAt", order.getCompletedAt());
        resp.put("total", total);
        resp.put("items", items);
        return resp;
    }
}
