package com.elyas.test.controller;

import com.elyas.test.model.Order;
import com.elyas.test.model.TableStatus;
import com.elyas.test.repository.OrderRepository;
import com.elyas.test.repository.TableStatusRepository;
import com.elyas.test.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/tables")
public class TableController {

    private final TableStatusRepository repo;
    private final UserRepository userRepo;
    private final OrderRepository orderRepo;

    public TableController(TableStatusRepository repo,
                           UserRepository userRepo,
                           OrderRepository orderRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.orderRepo = orderRepo;
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

        String tableId = id.toUpperCase();
        Optional<TableStatus> found = repo.findById(tableId);
        if (found.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String normalized = newStatus.toUpperCase();

        // Guard: refuse to mark a table CLEAN while it still has live orders
        // attached. Otherwise a bus-boy could mark a table clean mid-service
        // and the floor map would falsely advertise it as free to seat.
        if ("CLEAN".equals(normalized)) {
            List<Order> active = orderRepo.findByTableIdAndStatusNot(tableId, "COMPLETE");
            if (!active.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Cannot mark " + tableId + " clean — it still has "
                                + active.size() + " active order(s). Complete or cancel them first."));
            }
        }

        TableStatus table = found.get();
        table.setStatus(normalized);
        repo.save(table);

        return ResponseEntity.ok(table);
    }

    @PutMapping("/{id}/assign")
    public ResponseEntity<?> assignWaiter(@PathVariable String id,
                                          @RequestBody Map<String, String> body) {
        String waiterId = body.get("waiterId");
        String tableId  = id.toUpperCase();
        Optional<TableStatus> found = repo.findById(tableId);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        TableStatus table = found.get();

        // Remember who USED to own this table so we can scrub their CSV.
        // Without this, the previous waiter's User.assignedTables would still
        // list the table and the UI would show it in two waiters' lists.
        String previousWaiterId = table.getAssignedWaiterId();

        String newWaiterId = waiterId != null && !waiterId.isBlank() ? waiterId.toUpperCase() : null;
        table.setAssignedWaiterId(newWaiterId);
        repo.save(table);

        // Scrub the previous owner's CSV (if any and different from the new one).
        if (previousWaiterId != null && !previousWaiterId.equalsIgnoreCase(newWaiterId)) {
            removeTableFromWaiterCsv(previousWaiterId, tableId);
        }

        // Append to the new owner's CSV.
        if (newWaiterId != null) {
            addTableToWaiterCsv(newWaiterId, tableId);
        }

        return ResponseEntity.ok(table);
    }

    @PutMapping("/assign-bulk")
    public ResponseEntity<?> assignTablesBulk(@RequestBody Map<String, Object> body) {
        String waiterId = (String) body.get("waiterId");
        @SuppressWarnings("unchecked")
        List<String> rawTableIds = (List<String>) body.get("tableIds");

        if (waiterId == null || rawTableIds == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "waiterId and tableIds required."));
        }

        String targetWaiter = waiterId.toUpperCase();
        List<String> tableIds = rawTableIds.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(String::toUpperCase)
                .collect(Collectors.toList());

        // Collect every OTHER waiter who is about to lose one of these tables
        // so we can scrub their CSVs in one pass at the end.
        java.util.Set<String> waitersToScrub = new java.util.HashSet<>();

        // 1. Clear the target waiter's existing assignments on the TableStatus side.
        //    (Any tables they used to own but that aren't in the new list
        //    become unassigned; their CSV is overwritten below either way.)
        List<TableStatus> allTables = repo.findAll();
        for (TableStatus t : allTables) {
            if (targetWaiter.equalsIgnoreCase(t.getAssignedWaiterId())) {
                t.setAssignedWaiterId(null);
                repo.save(t);
            }
        }

        // 2. Assign each requested table, remembering who USED to own it.
        for (String tid : tableIds) {
            repo.findById(tid).ifPresent(t -> {
                String prev = t.getAssignedWaiterId();
                if (prev != null && !prev.equalsIgnoreCase(targetWaiter)) {
                    waitersToScrub.add(prev.toUpperCase());
                }
                t.setAssignedWaiterId(targetWaiter);
                repo.save(t);
            });
        }

        // 3. Scrub the lost tables out of every other waiter's CSV.
        for (String otherWaiter : waitersToScrub) {
            for (String tid : tableIds) {
                removeTableFromWaiterCsv(otherWaiter, tid);
            }
        }

        // 4. Overwrite the target waiter's CSV with the new list.
        userRepo.findByEmployeeId(targetWaiter).ifPresent(user -> {
            user.setAssignedTables(String.join(",", tableIds));
            userRepo.save(user);
        });

        return ResponseEntity.ok(Map.of("message", "Tables assigned successfully."));
    }

    // ─── CSV helpers ────────────────────────────────────────────────────────

    /**
     * Parse the comma-separated assignedTables string into a de-duped
     * upper-case list, preserving insertion order. Treats null / blank
     * as empty.
     */
    private List<String> parseCsv(String csv) {
        if (csv == null || csv.isBlank()) return new ArrayList<>();
        return new ArrayList<>(new LinkedHashSet<>(Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toUpperCase)
                .collect(Collectors.toList())));
    }

    private void removeTableFromWaiterCsv(String waiterId, String tableId) {
        userRepo.findByEmployeeId(waiterId).ifPresent(user -> {
            List<String> tables = parseCsv(user.getAssignedTables());
            if (tables.remove(tableId.toUpperCase())) {
                user.setAssignedTables(tables.isEmpty() ? "" : String.join(",", tables));
                userRepo.save(user);
            }
        });
    }

    private void addTableToWaiterCsv(String waiterId, String tableId) {
        userRepo.findByEmployeeId(waiterId).ifPresent(user -> {
            List<String> tables = parseCsv(user.getAssignedTables());
            String upper = tableId.toUpperCase();
            if (!tables.contains(upper)) {
                tables.add(upper);
                user.setAssignedTables(String.join(",", tables));
                userRepo.save(user);
            }
        });
    }
}
