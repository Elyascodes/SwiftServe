package com.elyas.test.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
public class UserController {

    private final UserRepository repo;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    // Passwords that are too trivial to accept
    private static final java.util.Set<String> BANNED_PASSWORDS = java.util.Set.of(
            "1111", "123456", "000000", "111111", "123123", "654321", "password"
    );

    public UserController(UserRepository repo) {
        this.repo = repo;
    }

    /**
     * POST /auth/login
     * Body: { "employeeId": "WTR001", "password": "Shift1" }
     * Returns 200 + { role, employeeId, name } on success, 401 on failure.
     */
    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String employeeId = body.get("employeeId");
        String password   = body.get("password");

        // ── Input format checks ──────────────────────────────────────────
        if (employeeId == null || !employeeId.matches("[A-Za-z0-9]{6}")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Employee ID must be exactly 6 alphanumeric characters."));
        }

        if (password == null || password.length() < 4) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Password is too short."));
        }

        if (BANNED_PASSWORDS.contains(password)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Password is not allowed."));
        }

        // ── Credential check ─────────────────────────────────────────────
        Optional<User> found = repo.findByEmployeeId(employeeId.toUpperCase());
        if (found.isEmpty() || !bcrypt.matches(password, found.get().getPasswordHash())) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Invalid employee ID or password."));
        }

        User emp = found.get();
        return ResponseEntity.ok(Map.of(
                "employeeId", emp.getEmployeeId(),
                "name",       emp.getName(),
                "role",       emp.getRole()
        ));
    }
}
