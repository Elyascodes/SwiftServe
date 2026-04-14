package com.elyas.test.config;

import com.elyas.test.model.MenuItem;
import com.elyas.test.model.TableStatus;
import com.elyas.test.model.User;
import com.elyas.test.repository.MenuItemRepository;
import com.elyas.test.repository.TableStatusRepository;
import com.elyas.test.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepo;
    private final MenuItemRepository menuRepo;
    private final TableStatusRepository tableRepo;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    public DataInitializer(UserRepository userRepo,
                           MenuItemRepository menuRepo,
                           TableStatusRepository tableRepo) {
        this.userRepo = userRepo;
        this.menuRepo = menuRepo;
        this.tableRepo = tableRepo;
    }

    @Override
    public void run(String... args) {
        seedEmployees();
        seedMenuItems();
        seedTables();
    }

    private void seedEmployees() {
        if (userRepo.count() > 0) return;

        String defaultHash = bcrypt.encode("Shift1");

        // { employeeId, name, firstName, lastName, role, payRate }
        Object[][] employees = {
            { "MGR001", "Jordan Mitchell",  "Jordan",  "Mitchell", "MANAGER", 25.00 },

            { "WTR001", "Alex Rivera",      "Alex",    "Rivera",   "WAITER",  12.50 },
            { "WTR002", "Brianna Cole",     "Brianna", "Cole",     "WAITER",  12.50 },
            { "WTR003", "Carlos Mendez",    "Carlos",  "Mendez",   "WAITER",  12.50 },
            { "WTR004", "Dana Owens",       "Dana",    "Owens",    "WAITER",  12.50 },
            { "WTR005", "Evan Brooks",      "Evan",    "Brooks",   "WAITER",  12.50 },

            { "BSB001", "Faith Harris",     "Faith",   "Harris",   "BUSBOY",  10.00 },
            { "BSB002", "Gabriel Torres",   "Gabriel", "Torres",   "BUSBOY",  10.00 },

            { "CHF001", "Hannah Lee",       "Hannah",  "Lee",      "CHEF",    15.00 },
            { "CHF002", "Isaac Grant",      "Isaac",   "Grant",    "CHEF",    15.00 },
            { "CHF003", "Jasmine White",    "Jasmine", "White",    "CHEF",    15.00 },
            { "CHF004", "Kevin Brown",      "Kevin",   "Brown",    "CHEF",    15.00 },
            { "CHF005", "Laura Sanchez",    "Laura",   "Sanchez",  "CHEF",    15.00 },
        };

        for (Object[] row : employees) {
            User emp = new User();
            emp.setEmployeeId((String) row[0]);
            emp.setName((String) row[1]);
            emp.setFirstName((String) row[2]);
            emp.setLastName((String) row[3]);
            emp.setRole((String) row[4]);
            emp.setPayRate((Double) row[5]);
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
}
