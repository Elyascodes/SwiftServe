package com.elyas.test.config;

import com.elyas.test.model.*;
import com.elyas.test.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepo;
    private final MenuItemRepository menuRepo;
    private final TableStatusRepository tableRepo;
    private final EarningsByDayRepository earningsRepo;
    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final TimesheetRepository timesheetRepo;
    private final RefundRequestRepository refundRepo;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    public DataInitializer(UserRepository userRepo,
                           MenuItemRepository menuRepo,
                           TableStatusRepository tableRepo,
                           EarningsByDayRepository earningsRepo,
                           OrderRepository orderRepo,
                           OrderItemRepository orderItemRepo,
                           TimesheetRepository timesheetRepo,
                           RefundRequestRepository refundRepo) {
        this.userRepo = userRepo;
        this.menuRepo = menuRepo;
        this.tableRepo = tableRepo;
        this.earningsRepo = earningsRepo;
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
        this.timesheetRepo = timesheetRepo;
        this.refundRepo = refundRepo;
    }

    @Override
    public void run(String... args) {
        seedEmployees();
        seedMenuItems();
        seedTables();
        seedAnalyticsData();
        seedTimesheets();
        seedRefunds();
        migrateTableAssignments();
    }

    private void seedEmployees() {
        if (userRepo.count() > 0) return;

        String defaultHash = bcrypt.encode("Shift1");

        // { employeeId, name, firstName, lastName, role, payRate, assignedTables }
        Object[][] employees = {
            { "MGR001", "Jordan Mitchell",  "Jordan",  "Mitchell", "MANAGER", 25.00, null },

            // Each waiter owns a section of the 6×6 floor
            { "WTR001", "Alex Rivera",      "Alex",    "Rivera",   "WAITER",  12.50, "A1,A2,A3,A4,A5,A6" },
            { "WTR002", "Brianna Cole",     "Brianna", "Cole",     "WAITER",  12.50, "B1,B2,B3,B4,B5,B6" },
            { "WTR003", "Carlos Mendez",    "Carlos",  "Mendez",   "WAITER",  12.50, "C1,C2,C3,C4,C5,C6" },
            { "WTR004", "Dana Owens",       "Dana",    "Owens",    "WAITER",  12.50, "D1,D2,D3,D4,D5,D6" },
            { "WTR005", "Evan Brooks",      "Evan",    "Brooks",   "WAITER",  12.50, "E1,E2,E3,E4,E5,E6,F1,F2,F3,F4,F5,F6" },

            { "BSB001", "Faith Harris",     "Faith",   "Harris",   "BUSBOY",  10.00, null },
            { "BSB002", "Gabriel Torres",   "Gabriel", "Torres",   "BUSBOY",  10.00, null },

            { "CHF001", "Hannah Lee",       "Hannah",  "Lee",      "CHEF",    15.00, null },
            { "CHF002", "Isaac Grant",      "Isaac",   "Grant",    "CHEF",    15.00, null },
            { "CHF003", "Jasmine White",    "Jasmine", "White",    "CHEF",    15.00, null },
            { "CHF004", "Kevin Brown",      "Kevin",   "Brown",    "CHEF",    15.00, null },
            { "CHF005", "Laura Sanchez",    "Laura",   "Sanchez",  "CHEF",    15.00, null },
        };

        for (Object[] row : employees) {
            User emp = new User();
            emp.setEmployeeId((String) row[0]);
            emp.setName((String) row[1]);
            emp.setFirstName((String) row[2]);
            emp.setLastName((String) row[3]);
            emp.setRole((String) row[4]);
            emp.setPayRate((Double) row[5]);
            emp.setAssignedTables((String) row[6]);
            emp.setPasswordHash(defaultHash);
            emp.setIsActive(true);
            userRepo.save(emp);
        }

        System.out.println(">>> SwiftServe: seeded " + employees.length + " employees (default password: Shift1)");
    }

    private void seedMenuItems() {
        if (menuRepo.count() > 0) return;

        // { name, price, category }
        Object[][] items = {
            // Appetizers
            { "Chicken Nachos",                8.50, "Appetizer" },
            { "Pork Nachos",                   8.50, "Appetizer" },
            { "Pork or Chicken Sliders (3)",   5.00, "Appetizer" },
            { "Catfish Bites",                 6.50, "Appetizer" },
            { "Fried Veggies",                 6.50, "Appetizer" },

            // Salads
            { "House Salad",                   7.50, "Salad" },
            { "Wedge Salad",                   7.50, "Salad" },
            { "Caesar Salad",                  7.50, "Salad" },
            { "Sweet Potato Chicken Salad",   11.50, "Salad" },

            // Entrees
            { "Shrimp & Grits",               13.50, "Entree" },
            { "Sweet Tea Fried Chicken",      11.50, "Entree" },
            { "Caribbean Chicken",            11.50, "Entree" },
            { "Grilled Pork Chops",           11.00, "Entree" },
            { "New York Strip Steak",         17.00, "Entree" },
            { "Seared Tuna",                  15.00, "Entree" },
            { "Captain Crunch Chicken Tenders",11.50, "Entree" },
            { "Shock Top Grouper Fingers",    11.50, "Entree" },
            { "Mac & Cheese Bar",              8.50, "Entree" },

            // Sandwiches
            { "Grilled Cheese",                5.50, "Sandwich" },
            { "Chicken BLT&A",                10.00, "Sandwich" },
            { "Philly",                       13.50, "Sandwich" },
            { "Club",                         10.00, "Sandwich" },
            { "Meatball Sub",                 10.00, "Sandwich" },

            // Burgers
            { "Bacon Cheeseburger",           11.00, "Burger" },
            { "Carolina Burger",              11.00, "Burger" },
            { "Portobello Burger (V)",         8.50, "Burger" },
            { "Vegan Boca Burger (V)",        10.50, "Burger" },

            // Beverages
            { "Sweet / Unsweetened Tea",       2.00, "Beverage" },
            { "Coke / Diet Coke",              2.00, "Beverage" },
            { "Sprite",                        2.00, "Beverage" },
            { "Bottled Water",                 2.00, "Beverage" },
            { "Lemonade",                      2.00, "Beverage" },
            { "Orange Juice",                  2.00, "Beverage" },

            // Sides
            { "Curly Fries",                   2.50, "Side" },
            { "Wing Chips",                    2.50, "Side" },
            { "Sweet Potato Fries",            2.50, "Side" },
            { "Creamy Cabbage Slaw",           2.50, "Side" },
            { "Adluh Cheese Grits",            2.50, "Side" },
            { "Mashed Potatoes",               2.50, "Side" },
            { "Mac & Cheese (Side)",           2.50, "Side" },
            { "Seasonal Vegetables",           2.50, "Side" },
        };

        for (Object[] row : items) {
            MenuItem mi = new MenuItem();
            mi.setName((String) row[0]);
            mi.setPrice((Double) row[1]);
            mi.setCategory((String) row[2]);
            mi.setIsActive(true);
            mi.setItemsSold(0);
            mi.setTotalRevenue(0.0);
            menuRepo.save(mi);
        }

        System.out.println(">>> SwiftServe: seeded " + items.length + " menu items");
    }

    private void seedTables() {
        if (tableRepo.count() > 0) return;

        String[] rows = { "A", "B", "C", "D", "E", "F" };
        for (String row : rows) {
            for (int col = 1; col <= 6; col++) {
                TableStatus table = new TableStatus();
                table.setTableId(row + col);
                table.setStatus("CLEAN");
                table.setCapacity(4);
                table.setLastUpdated(LocalDateTime.now());
                tableRepo.save(table);
            }
        }

        System.out.println(">>> SwiftServe: seeded 36 tables (A1-F6)");
    }

    private void seedAnalyticsData() {
        LocalDate today = LocalDate.now();
        List<MenuItem> allItems = menuRepo.findAll();
        if (allItems.isEmpty()) return;

        // ── Earnings for the past 7 days ──
        if (earningsRepo.count() == 0) {
            Object[][] earningsData = {
                { today.minusDays(6), 245.50, 8,  12 },
                { today.minusDays(5), 312.00, 10, 15 },
                { today.minusDays(4), 198.75, 6,  10 },
                { today.minusDays(3), 425.00, 14, 20 },
                { today.minusDays(2), 367.50, 12, 18 },
                { today.minusDays(1), 289.00, 9,  14 },
                { today,             156.00, 5,   8 },
            };

            for (Object[] row : earningsData) {
                EarningsByDay e = new EarningsByDay();
                e.setEarnDate((LocalDate) row[0]);
                e.setRevenue((Double) row[1]);
                e.setCashPayments((Integer) row[2]);
                e.setCardPayments((Integer) row[3]);
                earningsRepo.save(e);
            }
            System.out.println(">>> SwiftServe: seeded 7 days of earnings");
        }

        // ── Completed orders for today (for hourly, personnel, prep time analytics) ──
        long completedCount = orderRepo.findByCreatedAtBetween(
                today.atStartOfDay(), today.plusDays(1).atStartOfDay()
        ).stream().filter(o -> "COMPLETE".equals(o.getStatus())).count();

        if (completedCount == 0) {
            String[] waiters = { "WTR001", "WTR002", "WTR003", "WTR001", "WTR002",
                                 "WTR004", "WTR003", "WTR005" };
            String[] tables  = { "A1", "B3", "C2", "D5", "A4", "E1", "F3", "B6" };
            int[] hours      = { 9, 10, 10, 11, 12, 12, 13, 14 };
            int[] prepMins   = { 12, 8, 15, 10, 18, 7, 14, 11 };

            for (int i = 0; i < waiters.length; i++) {
                LocalDateTime created = today.atTime(hours[i], 0);
                LocalDateTime submitted = created.plusMinutes(3);
                LocalDateTime ready = submitted.plusMinutes(prepMins[i]);
                LocalDateTime completed = ready.plusMinutes(5);

                Order order = new Order();
                order.setTableId(tables[i]);
                order.setWaiterId(waiters[i]);
                order.setStatus("COMPLETE");
                order.setCreatedAt(created);
                order.setSubmittedAt(submitted);
                order.setReadyAt(ready);
                order.setCompletedAt(completed);
                orderRepo.save(order);

                int itemCount = 2 + (i % 2);
                for (int j = 0; j < itemCount; j++) {
                    MenuItem mi = allItems.get((i * 3 + j) % allItems.size());
                    OrderItem oi = new OrderItem();
                    oi.setOrder(order);
                    oi.setItemId(mi.getItemId());
                    oi.setItemName(mi.getName());
                    oi.setSeatId((j % 4) + 1);
                    oi.setQuantity(1 + (j % 2));
                    oi.setItemPrice(mi.getPrice());
                    orderItemRepo.save(oi);
                }
            }
            System.out.println(">>> SwiftServe: seeded 8 completed orders for today");
        }

        // ── Update menu item sales stats if all are zero ──
        boolean allZeroSales = allItems.stream().allMatch(mi -> mi.getItemsSold() == 0);
        if (allZeroSales) {
            // Simulated historical sales data
            int[][] salesData = {
                // index into allItems, itemsSold, totalRevenue (cents approach: sold * price)
                { 0, 45 }, { 1, 38 }, { 2, 52 }, { 3, 30 }, { 4, 22 },  // Appetizers
                { 5, 28 }, { 6, 15 }, { 7, 35 }, { 8, 20 },              // Salads
                { 9, 60 }, { 10, 55 }, { 11, 42 }, { 12, 38 },           // Entrees
                { 13, 25 }, { 14, 18 }, { 15, 48 }, { 16, 30 }, { 17, 15 },
                { 18, 40 }, { 19, 35 }, { 20, 22 }, { 21, 28 }, { 22, 32 }, // Sandwiches
                { 23, 50 }, { 24, 45 }, { 25, 20 }, { 26, 12 },          // Burgers
                { 27, 85 }, { 28, 90 }, { 29, 70 }, { 30, 65 }, { 31, 55 }, { 32, 40 }, // Beverages
                { 33, 60 }, { 34, 45 }, { 35, 50 }, { 36, 30 }, { 37, 35 },
                { 38, 55 }, { 39, 40 }, { 40, 25 },                       // Sides
            };

            for (int[] sd : salesData) {
                if (sd[0] < allItems.size()) {
                    MenuItem mi = allItems.get(sd[0]);
                    mi.setItemsSold(sd[1]);
                    mi.setTotalRevenue(mi.getPrice() * sd[1]);
                    menuRepo.save(mi);
                }
            }
            System.out.println(">>> SwiftServe: seeded menu item sales stats");
        }

        // ── Set stock levels if not already set ──
        boolean noStock = allItems.stream().allMatch(mi -> mi.getStock() == null);
        if (noStock) {
            for (MenuItem mi : allItems) {
                if ("Appetizer".equals(mi.getCategory())) { mi.setStock(25); }
                else if ("Entree".equals(mi.getCategory())) { mi.setStock(15); }
                else if ("Beverage".equals(mi.getCategory())) { mi.setStock(50); }
                else if ("Side".equals(mi.getCategory())) { mi.setStock(30); }
                else { mi.setStock(20); }
                menuRepo.save(mi);
            }
            System.out.println(">>> SwiftServe: seeded stock levels");
        }

        // ── Set some tables as OCCUPIED / DIRTY for visual variety ──
        tableRepo.findById("C4").ifPresent(t -> {
            if ("CLEAN".equals(t.getStatus())) { t.setStatus("OCCUPIED"); tableRepo.save(t); }
        });
        tableRepo.findById("D2").ifPresent(t -> {
            if ("CLEAN".equals(t.getStatus())) { t.setStatus("OCCUPIED"); tableRepo.save(t); }
        });
        tableRepo.findById("A1").ifPresent(t -> {
            if ("CLEAN".equals(t.getStatus())) { t.setStatus("DIRTY"); tableRepo.save(t); }
        });
        tableRepo.findById("B3").ifPresent(t -> {
            if ("CLEAN".equals(t.getStatus())) { t.setStatus("DIRTY"); tableRepo.save(t); }
        });
        tableRepo.findById("E1").ifPresent(t -> {
            if ("CLEAN".equals(t.getStatus())) { t.setStatus("DIRTY"); tableRepo.save(t); }
        });
    }

    private void seedTimesheets() {
        if (timesheetRepo.count() > 0) return;

        LocalDate today = LocalDate.now();

        // Past 5 days of timesheets for various employees
        Object[][] timesheetData = {
            // { userId, daysAgo, clockInHour, clockInMin, clockOutHour, clockOutMin }
            // Today — some still clocked in
            { "WTR001", 0,  8, 0,  -1, -1 },   // still clocked in
            { "WTR002", 0,  9, 0,  -1, -1 },   // still clocked in
            { "CHF001", 0,  7, 30, -1, -1 },   // still clocked in
            { "BSB001", 0, 10, 0,  -1, -1 },   // still clocked in

            // Yesterday
            { "WTR001", 1,  8,  0, 16, 30 },
            { "WTR002", 1,  9,  0, 17,  0 },
            { "WTR003", 1, 10,  0, 18,  0 },
            { "CHF001", 1,  7, 30, 15, 30 },
            { "CHF002", 1,  8,  0, 16,  0 },
            { "BSB001", 1, 10,  0, 16,  0 },
            { "MGR001", 1,  7,  0, 17,  0 },

            // 2 days ago
            { "WTR001", 2,  9,  0, 17,  0 },
            { "WTR003", 2,  8,  0, 16, 30 },
            { "WTR004", 2, 10,  0, 18,  0 },
            { "CHF001", 2,  7,  0, 15,  0 },
            { "CHF003", 2,  8,  0, 16,  0 },
            { "BSB002", 2, 11,  0, 17,  0 },
            { "MGR001", 2,  7, 30, 16, 30 },

            // 3 days ago
            { "WTR002", 3,  8,  0, 16,  0 },
            { "WTR005", 3,  9,  0, 17, 30 },
            { "CHF002", 3,  7, 30, 15, 30 },
            { "CHF004", 3,  8,  0, 16,  0 },
            { "BSB001", 3, 10,  0, 16,  0 },

            // 4 days ago
            { "WTR001", 4,  8, 30, 17,  0 },
            { "WTR003", 4,  9,  0, 17,  0 },
            { "CHF001", 4,  7,  0, 15, 30 },
            { "CHF005", 4,  8,  0, 16,  0 },
            { "BSB002", 4, 10,  0, 16, 30 },
            { "MGR001", 4,  7,  0, 17,  0 },
        };

        for (Object[] row : timesheetData) {
            String userId = (String) row[0];
            int daysAgo = (int) row[1];
            int inH = (int) row[2];
            int inM = (int) row[3];
            int outH = (int) row[4];
            int outM = (int) row[5];

            LocalDate shiftDate = today.minusDays(daysAgo);
            LocalDateTime clockIn = shiftDate.atTime(inH, inM);
            LocalDateTime clockOut = (outH >= 0) ? shiftDate.atTime(outH, outM) : null;

            Timesheet ts = new Timesheet();
            ts.setUserId(userId);
            ts.setShiftDate(shiftDate);
            ts.setClockInTime(clockIn);
            ts.setClockOutTime(clockOut);

            if (clockOut != null) {
                double hours = java.time.Duration.between(clockIn, clockOut).toMinutes() / 60.0;
                ts.setHoursWorked(Math.round(hours * 10.0) / 10.0);
            }

            timesheetRepo.save(ts);
        }

        System.out.println(">>> SwiftServe: seeded " + timesheetData.length + " timesheet entries");
    }

    private void seedRefunds() {
        if (refundRepo.count() > 0) return;

        LocalDate today = LocalDate.now();
        List<Order> completedOrders = orderRepo.findAll().stream()
                .filter(o -> "COMPLETE".equals(o.getStatus()))
                .toList();

        if (completedOrders.size() < 3) return;

        // Refund 1 — Approved
        RefundRequest r1 = new RefundRequest();
        r1.setOrderId(completedOrders.get(0).getOrderId());
        r1.setWaiterId("WTR001");
        r1.setReason("Customer found hair in their Shrimp & Grits");
        r1.setAmount(13.50);
        r1.setStatus("APPROVED");
        r1.setManagerId("MGR001");
        r1.setCreatedAt(today.minusDays(2).atTime(13, 15));
        r1.setDecidedAt(today.minusDays(2).atTime(13, 30));
        refundRepo.save(r1);

        // Refund 2 — Rejected
        RefundRequest r2 = new RefundRequest();
        r2.setOrderId(completedOrders.get(1).getOrderId());
        r2.setWaiterId("WTR003");
        r2.setReason("Customer claims order was wrong but items matched ticket");
        r2.setAmount(22.00);
        r2.setStatus("REJECTED");
        r2.setManagerId("MGR001");
        r2.setCreatedAt(today.minusDays(1).atTime(14, 45));
        r2.setDecidedAt(today.minusDays(1).atTime(15, 10));
        refundRepo.save(r2);

        // Refund 3 — Pending (waiting for manager decision)
        RefundRequest r3 = new RefundRequest();
        r3.setOrderId(completedOrders.get(2).getOrderId());
        r3.setWaiterId("WTR002");
        r3.setReason("Food was served cold, customer unhappy");
        r3.setAmount(11.50);
        r3.setStatus("PENDING");
        r3.setCreatedAt(today.atTime(12, 30));
        refundRepo.save(r3);

        // Refund 4 — Pending
        RefundRequest r4 = new RefundRequest();
        r4.setOrderId(completedOrders.get(3 % completedOrders.size()).getOrderId());
        r4.setWaiterId("WTR004");
        r4.setReason("Excessive wait time, customer left before eating");
        r4.setAmount(17.00);
        r4.setStatus("PENDING");
        r4.setCreatedAt(today.atTime(13, 50));
        refundRepo.save(r4);

        // Refund 5 — Approved
        RefundRequest r5 = new RefundRequest();
        r5.setOrderId(completedOrders.get(4 % completedOrders.size()).getOrderId());
        r5.setWaiterId("WTR005");
        r5.setReason("Allergic reaction — wrong ingredients listed on menu");
        r5.setAmount(15.00);
        r5.setStatus("APPROVED");
        r5.setManagerId("MGR001");
        r5.setCreatedAt(today.minusDays(3).atTime(11, 20));
        r5.setDecidedAt(today.minusDays(3).atTime(11, 35));
        refundRepo.save(r5);

        System.out.println(">>> SwiftServe: seeded 5 refund requests");
    }

    /**
     * Back-fills default table assignments for any waiter who currently has none.
     * Safe to run on existing databases — only touches null/empty assignedTables.
     */
    private void migrateTableAssignments() {
        java.util.Map<String, String> defaults = new java.util.LinkedHashMap<>();
        defaults.put("WTR001", "A1,A2,A3,A4,A5,A6");
        defaults.put("WTR002", "B1,B2,B3,B4,B5,B6");
        defaults.put("WTR003", "C1,C2,C3,C4,C5,C6");
        defaults.put("WTR004", "D1,D2,D3,D4,D5,D6");
        defaults.put("WTR005", "E1,E2,E3,E4,E5,E6,F1,F2,F3,F4,F5,F6");

        for (java.util.Map.Entry<String, String> entry : defaults.entrySet()) {
            userRepo.findByEmployeeId(entry.getKey()).ifPresent(u -> {
                if (u.getAssignedTables() == null || u.getAssignedTables().isBlank()) {
                    u.setAssignedTables(entry.getValue());
                    userRepo.save(u);
                    System.out.println(">>> SwiftServe: assigned tables to " + u.getEmployeeId());
                }
            });
        }
    }
}
