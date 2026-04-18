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
}
