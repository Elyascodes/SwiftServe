package com.elyas.test.repository;

import com.elyas.test.model.Timesheet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TimesheetRepository extends JpaRepository<Timesheet, Long> {
    List<Timesheet> findByUserId(String userId);
    List<Timesheet> findByUserIdAndShiftDate(String userId, LocalDate shiftDate);
    Optional<Timesheet> findByUserIdAndClockOutTimeIsNull(String userId);
    List<Timesheet> findByShiftDateBetween(LocalDate start, LocalDate end);
}
