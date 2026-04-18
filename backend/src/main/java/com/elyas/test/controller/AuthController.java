package com.elyas.test.controller;

import com.elyas.test.model.User;
import com.elyas.test.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository repo;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    private static final Set<String> BANNED_PASSWORDS = Set.of(
            "1111", "123456", "000000", "111111", "123123", "654321", "password"
    );

    public AuthController(UserRepository repo) {
        this.repo = repo;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String employeeId = body.get("employeeId");
        String password   = body.get("password");

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

        Optional<User> found = repo.findByEmployeeId(employeeId.toUpperCase());
        if (found.isEmpty() || !bcrypt.matches(password, found.get().getPasswordHash())) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Invalid employee ID or password."));
        }

        User emp = found.get();
        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("employeeId", emp.getEmployeeId());
        response.put("name", emp.getName());
        response.put("role", emp.getRole());
        response.put("payRate", emp.getPayRate());
        response.put("assignedTables", emp.getAssignedTables());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body) {
        String employeeId   = body.get("employeeId");
        String oldPassword  = body.get("oldPassword");
        String newPassword  = body.get("newPassword");

        if (newPassword == null || newPassword.length() < 4) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "New password is too short."));
        }

        if (BANNED_PASSWORDS.contains(newPassword)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "New password is not allowed."));
        }

        Optional<User> found = repo.findByEmployeeId(employeeId.toUpperCase());
        if (found.isEmpty() || !bcrypt.matches(oldPassword, found.get().getPasswordHash())) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Invalid credentials."));
        }

        User emp = found.get();
        emp.setPasswordHash(bcrypt.encode(newPassword));
        repo.save(emp);

        return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
    }
}
