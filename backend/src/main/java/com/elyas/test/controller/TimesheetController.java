package com.elyas.test.controller;

import com.elyas.test.model.Timesheet;
import com.elyas.test.repository.TimesheetRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/timesheets")
public class TimesheetController {

    private final TimesheetRepository repo;

    public TimesheetController(TimesheetRepository repo) {
        this.repo = repo;
    }

    @PostMapping("/clock-in")
    public ResponseEntity<?> clockIn(@RequestBody Map<String, String> body) {
        String userId = body.get("userId");
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "userId is required."));
        }

        // Check if already clocked in
        Optional<Timesheet> open = repo.findByUserIdAndClockOutTimeIsNull(userId.toUpperCase());
        if (open.isPresent()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Already clocked in.", "timesheet", open.get()));
        }

        Timesheet ts = new Timesheet();
        ts.setUserId(userId.toUpperCase());
        ts.setClockInTime(LocalDateTime.now());
        ts.setShiftDate(LocalDate.now());
        repo.save(ts);

        return ResponseEntity.ok(ts);
    }

    @PostMapping("/clock-out")
    public ResponseEntity<?> clockOut(@RequestBody Map<String, String> body) {
        String userId = body.get("userId");
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "userId is required."));
        }

        Optional<Timesheet> open = repo.findByUserIdAndClockOutTimeIsNull(userId.toUpperCase());
        if (open.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "No active clock-in found."));
        }

        Timesheet ts = open.get();
        ts.setClockOutTime(LocalDateTime.now());
        Duration dur = Duration.between(ts.getClockInTime(), ts.getClockOutTime());
        ts.setHoursWorked(Math.round(dur.toMinutes() / 6.0) / 10.0); // round to 1 decimal
        repo.save(ts);

        return ResponseEntity.ok(ts);
    }

    @GetMapping("/status/{userId}")
    public ResponseEntity<?> getClockStatus(@PathVariable String userId) {
        Optional<Timesheet> open = repo.findByUserIdAndClockOutTimeIsNull(userId.toUpperCase());
        if (open.isPresent()) {
            return ResponseEntity.ok(Map.of("clockedIn", true, "timesheet", open.get()));
        }
        return ResponseEntity.ok(Map.of("clockedIn", false));
    }

    @GetMapping("/{userId}")
    public List<Timesheet> getTimesheets(@PathVariable String userId) {
        return repo.findByUserId(userId.toUpperCase());
    }

    @GetMapping
    public List<Timesheet> getAllTimesheets() {
        return repo.findAll();
    }

    /**
     * Manager-side edit: adjust clock-in/out on a specific timesheet. Accepts
     * ISO-8601 strings for `clockInTime` and `clockOutTime` (either or both).
     * When both are set we recompute `hoursWorked`.
     *
     * Request body fields (all optional except at least one time):
     *   clockInTime: "2026-04-23T09:00:00"   (ISO_LOCAL_DATE_TIME)
     *   clockOutTime: "2026-04-23T17:00:00"
     *   shiftDate: "2026-04-23"              (ISO_LOCAL_DATE)
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTimesheet(@PathVariable Long id,
                                             @RequestBody Map<String, String> body) {
        Optional<Timesheet> found = repo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        Timesheet ts = found.get();
        try {
            if (body.containsKey("clockInTime") && body.get("clockInTime") != null
                    && !body.get("clockInTime").isBlank()) {
                ts.setClockInTime(LocalDateTime.parse(body.get("clockInTime")));
            }
            if (body.containsKey("clockOutTime")) {
                String v = body.get("clockOutTime");
                ts.setClockOutTime((v == null || v.isBlank()) ? null : LocalDateTime.parse(v));
            }
            if (body.containsKey("shiftDate") && body.get("shiftDate") != null
                    && !body.get("shiftDate").isBlank()) {
                ts.setShiftDate(LocalDate.parse(body.get("shiftDate")));
            }
        } catch (Exception ex) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid date/time format. Use ISO-8601 (e.g. 2026-04-23T09:00:00)."));
        }

        // Recompute hoursWorked if we have both endpoints.
        if (ts.getClockInTime() != null && ts.getClockOutTime() != null) {
            if (ts.getClockOutTime().isBefore(ts.getClockInTime())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Clock-out must be after clock-in."));
            }
            Duration dur = Duration.between(ts.getClockInTime(), ts.getClockOutTime());
            ts.setHoursWorked(Math.round(dur.toMinutes() / 6.0) / 10.0);
        } else if (ts.getClockOutTime() == null) {
            ts.setHoursWorked(null);
        }
        // Keep shiftDate consistent with clockInTime if not explicitly set.
        if (ts.getClockInTime() != null && ts.getShiftDate() == null) {
            ts.setShiftDate(ts.getClockInTime().toLocalDate());
        }
        repo.save(ts);
        return ResponseEntity.ok(ts);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTimesheet(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Timesheet deleted."));
    }
}
