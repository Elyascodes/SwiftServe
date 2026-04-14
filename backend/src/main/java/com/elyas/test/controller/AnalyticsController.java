package com.elyas.test.controller;

import com.elyas.test.model.EarningsByDay;
import com.elyas.test.model.MenuItem;
import com.elyas.test.model.Order;
import com.elyas.test.repository.*;
import org.springframework.web.bind.annotation.*;

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
    private final ExpenseRepository expenseRepo;

    public AnalyticsController(EarningsByDayRepository earningsRepo,
                               MenuItemRepository menuItemRepo,
                               OrderRepository orderRepo,
                               ExpenseRepository expenseRepo) {
        this.earningsRepo = earningsRepo;
        this.menuItemRepo = menuItemRepo;
        this.orderRepo = orderRepo;
        this.expenseRepo = expenseRepo;
    }

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

        double totalRevenue = earnings.stream().mapToDouble(EarningsByDay::getRevenue).sum();
        int totalCash = earnings.stream().mapToInt(EarningsByDay::getCashPayments).sum();
        int totalCard = earnings.stream().mapToInt(EarningsByDay::getCardPayments).sum();

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

    @GetMapping("/items")
    public List<Map<String, Object>> getItemPerformance() {
        List<MenuItem> items = menuItemRepo.findAll();
        items.sort((a, b) -> Integer.compare(b.getItemsSold(), a.getItemsSold()));

        return items.stream().map(mi -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("itemId", mi.getItemId());
            m.put("name", mi.getName());
            m.put("category", mi.getCategory());
            m.put("price", mi.getPrice());
            m.put("itemsSold", mi.getItemsSold());
            m.put("totalRevenue", mi.getTotalRevenue());
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        List<Order> todayOrders = orderRepo.findByCreatedAtBetween(startOfDay, endOfDay);
        long completedToday = todayOrders.stream().filter(o -> "COMPLETE".equals(o.getStatus())).count();
        long activeOrders = orderRepo.findByStatusIn(List.of("PENDING", "IN_QUEUE", "READY")).size();

        Optional<EarningsByDay> todayEarnings = earningsRepo.findById(today);
        double todayRevenue = todayEarnings.map(EarningsByDay::getRevenue).orElse(0.0);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("todayRevenue", todayRevenue);
        result.put("ordersToday", todayOrders.size());
        result.put("completedToday", completedToday);
        result.put("activeOrders", activeOrders);
        return result;
    }
}
