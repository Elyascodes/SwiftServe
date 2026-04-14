package com.elyas.test.controller;

import com.elyas.test.model.TableStatus;
import com.elyas.test.repository.TableStatusRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.elyas.test.model.User;
import com.elyas.test.repository.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/tables")
public class TableController {

    private final TableStatusRepository repo;
    private final UserRepository userRepo;

    public TableController(TableStatusRepository repo, UserRepository userRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
    }

    @GetMapping
    public List<TableStatus> getAllTables() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTable(@PathVariable String id) {
        Optional<TableStatus> table = repo.findById(id.toUpperCase());
        return table.map(t -> ResponseEntity.ok((Object) t))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id,
                                          @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || !List.of("CLEAN", "OCCUPIED", "DIRTY").contains(newStatus.toUpperCase())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Status must be CLEAN, OCCUPIED, or DIRTY."));
        }

        Optional<TableStatus> found = repo.findById(id.toUpperCase());
        if (found.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        TableStatus table = found.get();
        table.setStatus(newStatus.toUpperCase());
        repo.save(table);

        return ResponseEntity.ok(table);
    }

    @PutMapping("/{id}/assign")
    public ResponseEntity<?> assignWaiter(@PathVariable String id,
                                          @RequestBody Map<String, String> body) {
        String waiterId = body.get("waiterId");
        Optional<TableStatus> found = repo.findById(id.toUpperCase());
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        TableStatus table = found.get();
        table.setAssignedWaiterId(waiterId != null ? waiterId.toUpperCase() : null);
        repo.save(table);

        // Also update the waiter's assignedTables field
        if (waiterId != null) {
            userRepo.findByEmployeeId(waiterId.toUpperCase()).ifPresent(user -> {
                String current = user.getAssignedTables();
                String tableId = id.toUpperCase();
                if (current == null || current.isEmpty()) {
                    user.setAssignedTables(tableId);
                } else if (!current.contains(tableId)) {
                    user.setAssignedTables(current + "," + tableId);
                }
                userRepo.save(user);
            });
        }

        return ResponseEntity.ok(table);
    }

    @PutMapping("/assign-bulk")
    public ResponseEntity<?> assignTablesBulk(@RequestBody Map<String, Object> body) {
        String waiterId = (String) body.get("waiterId");
        @SuppressWarnings("unchecked")
        List<String> tableIds = (List<String>) body.get("tableIds");

        if (waiterId == null || tableIds == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "waiterId and tableIds required."));
        }

        // Clear old assignments for this waiter
        List<TableStatus> allTables = repo.findAll();
        for (TableStatus t : allTables) {
            if (waiterId.equalsIgnoreCase(t.getAssignedWaiterId())) {
                t.setAssignedWaiterId(null);
                repo.save(t);
            }
        }

        // Assign new tables
        for (String tid : tableIds) {
            repo.findById(tid.toUpperCase()).ifPresent(t -> {
                t.setAssignedWaiterId(waiterId.toUpperCase());
                repo.save(t);
            });
        }

        // Update user record
        userRepo.findByEmployeeId(waiterId.toUpperCase()).ifPresent(user -> {
            user.setAssignedTables(String.join(",", tableIds).toUpperCase());
            userRepo.save(user);
        });

        return ResponseEntity.ok(Map.of("message", "Tables assigned successfully."));
    }
}
