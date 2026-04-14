package com.elyas.test.controller;

import com.elyas.test.model.TableStatus;
import com.elyas.test.repository.TableStatusRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/tables")
public class TableController {

    private final TableStatusRepository repo;

    public TableController(TableStatusRepository repo) {
        this.repo = repo;
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
}
