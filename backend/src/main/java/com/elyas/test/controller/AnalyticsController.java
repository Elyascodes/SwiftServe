package com.elyas.test.controller;

import com.elyas.test.model.EarningsByDay;
import com.elyas.test.model.MenuItem;
import com.elyas.test.model.Order;
import com.elyas.test.model.OrderItem;
import com.elyas.test.repository.*;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final EarningsByDayRepository earningsRepo;
    private final MenuItemRepository menuItemRepo;
    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final ExpenseRepository expenseRepo;
    private final UserRepository userRepo;

    public AnalyticsController(EarningsByDayRepository earningsRepo,
                               MenuItemRepository menuItemRepo,
                               OrderRepository orderRepo,
                               OrderItemRepository orderItemRepo,
                               ExpenseRepository expenseRepo,
                               UserRepository userRepo) {
        this.earningsRepo = earningsRepo;
        this.menuItemRepo = menuItemRepo;
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
        this.expenseRepo = expenseRepo;
        this.userRepo = userRepo;
    }

    private static double nz(Double d) { return d == null ? 0.0 : d; }
    private static int nz(Integer i) { return i == null ? 0 : i; }

    @GetMapping("/earnings")
    public Map<String, Object> getEarnings(@RequestParam(defaultValue = "day") String period) {
        LocalDate today = LocalDate.now();
        LocalDate start;

        switch (period.toLowerCase()) {
            case "week":
                start = today.minusDays(7);
                break;
            case "month":
                start = today.minusDays(30);
                break;
            default:
                start = today;
                break;
        }

        List<EarningsByDay> earnings = earningsRepo.findByEarnDateBetween(start, today);

        double totalRevenue = earnings.stream().mapToDouble(e -> nz(e.getRevenue())).sum();
        int totalCash = earnings.stream().mapToInt(e -> nz(e.getCashPayments())).sum();
        int totalCard = earnings.stream().mapToInt(e -> nz(e.getCardPayments())).sum();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period", period);
        result.put("startDate", start.toString());
        result.put("endDate", today.toString());
        result.put("totalRevenue", totalRevenue);
        result.put("cashPayments", totalCash);
        result.put("cardPayments", totalCard);
        result.put("dailyBreakdown", earnings);
        return result;
    }

    @GetMapping("/earnings/hourly")
    public List<Map<String, Object>> getHourlyBreakdown() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        List<Order> todayOrders = orderRepo.findByCreatedAtBetween(startOfDay, endOfDay);

        // Group completed orders by hour of creation
        Map<Integer, List<Order>> byHour = todayOrders.stream()
                .filter(o -> "COMPLETE".equals(o.getStatus()))
                .filter(o -> o.getCreatedAt() != null)
                .collect(Collectors.groupingBy(o -> o.getCreatedAt().getHour()));

        List<Map<String, Object>> hourly = new ArrayList<>();
        // Standard service window — always return a consistent range so charts render predictably
        for (int h = 8; h < 23; h++) {
            List<Order> ordersInHour = byHour.getOrDefault(h, Collections.emptyList());

            // Real revenue: sum (itemPrice * quantity) for every item in every order in this hour
            double revenue = 0.0;
            for (Order o : ordersInHour) {
                List<OrderItem> items = orderItemRepo.findByOrderOrderId(o.getOrderId());
                for (OrderItem oi : items) {
                    double price = oi.getItemPrice() == null ? 0.0 : oi.getItemPrice();
                    int qty      = oi.getQuantity()  == null ? 1   : oi.getQuantity();
                    revenue += price * qty;
                }
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("hour", String.format("%02d:00", h));
            entry.put("orders", ordersInHour.size());
            entry.put("revenue", Math.round(revenue * 100.0) / 100.0);
            hourly.add(entry);
        }
        return hourly;
    }

    @GetMapping("/items")
    public List<Map<String, Object>> getItemPerformance() {
        List<MenuItem> items = menuItemRepo.findAll();
        double totalRevenue = items.stream().mapToDouble(mi -> nz(mi.getTotalRevenue())).sum();

        items.sort((a, b) -> Integer.compare(nz(b.getItemsSold()), nz(a.getItemsSold())));

        return items.stream().map(mi -> {
            double rev = nz(mi.getTotalRevenue());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("itemId", mi.getItemId());
            m.put("name", mi.getName());
            m.put("category", mi.getCategory());
            m.put("price", mi.getPrice());
            m.put("itemsSold", nz(mi.getItemsSold()));
            m.put("totalRevenue", rev);
            m.put("revenuePercent", totalRevenue > 0
                    ? Math.round(rev / totalRevenue * 10000.0) / 100.0
                    : 0.0);
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/personnel")
    public List<Map<String, Object>> getPersonnelEfficiency() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        List<Order> todayOrders = orderRepo.findByCreatedAtBetween(startOfDay, endOfDay);

        // Group by waiter (skip orders with no waiter)
        Map<String, List<Order>> byWaiter = todayOrders.stream()
                .filter(o -> o.getWaiterId() != null)
                .collect(Collectors.groupingBy(Order::getWaiterId));

        List<Map<String, Object>> result = new ArrayList<>();
        for (var entry : byWaiter.entrySet()) {
            String waiterId = entry.getKey();
            List<Order> orders = entry.getValue();

            long completed = orders.stream().filter(o -> "COMPLETE".equals(o.getStatus())).count();

            // Average turnaround: time from order creation to completion
            OptionalDouble avgTurnaround = orders.stream()
                    .filter(o -> o.getCompletedAt() != null)
                    .mapToLong(o -> Duration.between(o.getCreatedAt(), o.getCompletedAt()).toMinutes())
                    .average();

            String waiterName = userRepo.findByEmployeeId(waiterId)
                    .map(u -> u.getName())
                    .orElse(waiterId);

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("waiterId", waiterId);
            m.put("waiterName", waiterName);
            m.put("totalOrders", orders.size());
            m.put("completedOrders", completed);
            m.put("avgTurnaroundMinutes", avgTurnaround.isPresent()
                    ? Math.round(avgTurnaround.getAsDouble() * 10.0) / 10.0
                    : null);
            result.add(m);
        }

        result.sort((a, b) -> Long.compare(
                ((Number) b.get("completedOrders")).longValue(),
                ((Number) a.get("completedOrders")).longValue()));
        return result;
    }

    @GetMapping("/prep-time")
    public Map<String, Object> getAvgPrepTime() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        List<Order> todayOrders = orderRepo.findByCreatedAtBetween(startOfDay, endOfDay);

        // Prep time = submittedAt to readyAt
        OptionalDouble avgPrep = todayOrders.stream()
                .filter(o -> o.getSubmittedAt() != null && o.getReadyAt() != null)
                .mapToLong(o -> Duration.between(o.getSubmittedAt(), o.getReadyAt()).toMinutes())
                .average();

        // Turnaround = createdAt to completedAt
        OptionalDouble avgTurnaround = todayOrders.stream()
                .filter(o -> o.getCompletedAt() != null)
                .mapToLong(o -> Duration.between(o.getCreatedAt(), o.getCompletedAt()).toMinutes())
                .average();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("avgPrepTimeMinutes", avgPrep.isPresent()
                ? Math.round(avgPrep.getAsDouble() * 10.0) / 10.0 : null);
        result.put("avgTurnaroundMinutes", avgTurnaround.isPresent()
                ? Math.round(avgTurnaround.getAsDouble() * 10.0) / 10.0 : null);
        result.put("ordersAnalyzed", todayOrders.size());
        return result;
    }

    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        List<Order> todayOrders = orderRepo.findByCreatedAtBetween(startOfDay, endOfDay);
        long completedToday = todayOrders.stream().filter(o -> "COMPLETE".equals(o.getStatus())).count();
        long activeOrders = orderRepo.findByStatusIn(List.of("PENDING", "IN_QUEUE", "READY")).size();

        // Avg prep time
        OptionalDouble avgPrep = todayOrders.stream()
                .filter(o -> o.getSubmittedAt() != null && o.getReadyAt() != null)
                .mapToLong(o -> Duration.between(o.getSubmittedAt(), o.getReadyAt()).toMinutes())
                .average();

        // Avg turnaround
        OptionalDouble avgTurnaround = todayOrders.stream()
                .filter(o -> o.getCompletedAt() != null)
                .mapToLong(o -> Duration.between(o.getCreatedAt(), o.getCompletedAt()).toMinutes())
                .average();

        Optional<EarningsByDay> todayEarnings = earningsRepo.findById(today);
        double todayRevenue = todayEarnings.map(EarningsByDay::getRevenue).orElse(0.0);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("todayRevenue", todayRevenue);
        result.put("ordersToday", todayOrders.size());
        result.put("completedToday", completedToday);
        result.put("activeOrders", activeOrders);
        result.put("avgPrepTimeMinutes", avgPrep.isPresent()
                ? Math.round(avgPrep.getAsDouble() * 10.0) / 10.0 : null);
        result.put("avgTurnaroundMinutes", avgTurnaround.isPresent()
                ? Math.round(avgTurnaround.getAsDouble() * 10.0) / 10.0 : null);
        return result;
    }
}
