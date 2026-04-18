package com.elyas.test.controller;

import com.elyas.test.model.User;
import com.elyas.test.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final UserRepository repo;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    public EmployeeController(UserRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<User> getActiveEmployees() {
        return repo.findByIsActiveTrue();
    }

    @GetMapping("/all")
    public List<User> getAllEmployees() {
        return repo.findAll();
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<?> getEmployee(@PathVariable String employeeId) {
        Optional<User> found = repo.findByEmployeeId(employeeId.toUpperCase());
        return found.map(u -> ResponseEntity.ok((Object) u))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createEmployee(@RequestBody Map<String, Object> body) {
        String employeeId = (String) body.get("employeeId");
        String name       = (String) body.get("name");
        String firstName  = (String) body.get("firstName");
        String lastName   = (String) body.get("lastName");
        String role       = (String) body.get("role");
        Number payRate    = (Number) body.get("payRate");

        if (employeeId == null || name == null || role == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "employeeId, name, and role are required."));
        }

        if (repo.findByEmployeeId(employeeId.toUpperCase()).isPresent()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Employee ID already exists."));
        }

        User emp = new User();
        emp.setEmployeeId(employeeId.toUpperCase());
        emp.setName(name);
        emp.setFirstName(firstName);
        emp.setLastName(lastName);
        emp.setRole(role.toUpperCase());
        emp.setPayRate(payRate != null ? payRate.doubleValue() : null);
        emp.setPasswordHash(bcrypt.encode("Shift1"));
        emp.setIsActive(true);
        repo.save(emp);

        return ResponseEntity.ok(emp);
    }

    @PutMapping("/{employeeId}")
    public ResponseEntity<?> updateEmployee(@PathVariable String employeeId,
                                            @RequestBody Map<String, Object> body) {
        Optional<User> found = repo.findByEmployeeId(employeeId.toUpperCase());
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        User emp = found.get();
        if (body.containsKey("name"))      emp.setName((String) body.get("name"));
        if (body.containsKey("firstName")) emp.setFirstName((String) body.get("firstName"));
        if (body.containsKey("lastName"))  emp.setLastName((String) body.get("lastName"));
        if (body.containsKey("role"))      emp.setRole(((String) body.get("role")).toUpperCase());
        if (body.containsKey("payRate"))   emp.setPayRate(((Number) body.get("payRate")).doubleValue());
        if (body.containsKey("isActive"))  emp.setIsActive((Boolean) body.get("isActive"));
        if (body.containsKey("assignedTables")) emp.setAssignedTables((String) body.get("assignedTables"));
        repo.save(emp);

        return ResponseEntity.ok(emp);
    }

    @DeleteMapping("/{employeeId}")
    public ResponseEntity<?> deactivateEmployee(@PathVariable String employeeId) {
        Optional<User> found = repo.findByEmployeeId(employeeId.toUpperCase());
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        User emp = found.get();
        emp.setIsActive(false);
        repo.save(emp);

        return ResponseEntity.ok(Map.of("message", "Employee deactivated."));
    }
}
