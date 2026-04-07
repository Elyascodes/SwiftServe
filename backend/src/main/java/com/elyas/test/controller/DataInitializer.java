package com.elyas.test.controller;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds the employee table on first boot.
 * Default password for all staff: Shift1
 * Staff can (and should) change their password after first login.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository repo;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    public DataInitializer(UserRepository repo) {
        this.repo = repo;
    }

    @Override
    public void run(String... args) {
        if (repo.count() > 0) return; // already seeded

        String defaultHash = bcrypt.encode("Shift1");

        String[][] employees = {
            // { employeeId, name, role }
            { "MGR001", "Jordan Mitchell",  "MANAGER" },

            { "WTR001", "Alex Rivera",      "WAITER"  },
            { "WTR002", "Brianna Cole",     "WAITER"  },
            { "WTR003", "Carlos Mendez",    "WAITER"  },
            { "WTR004", "Dana Owens",       "WAITER"  },
            { "WTR005", "Evan Brooks",      "WAITER"  },

            { "BSB001", "Faith Harris",     "BUSBOY"  },
            { "BSB002", "Gabriel Torres",   "BUSBOY"  },

            { "CHF001", "Hannah Lee",       "CHEF"    },
            { "CHF002", "Isaac Grant",      "CHEF"    },
            { "CHF003", "Jasmine White",    "CHEF"    },
            { "CHF004", "Kevin Brown",      "CHEF"    },
            { "CHF005", "Laura Sanchez",    "CHEF"    },
        };

        for (String[] row : employees) {
            User emp = new User();
            emp.setEmployeeId(row[0]);
            emp.setName(row[1]);
            emp.setRole(row[2]);
            emp.setPasswordHash(defaultHash);
            repo.save(emp);
        }

        System.out.println(">>> ShiftServe: seeded " + employees.length + " employees (default password: Shift1)");
    }
}
