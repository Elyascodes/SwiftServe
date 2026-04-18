package com.elyas.test.repository;

import com.elyas.test.model.EarningsByDay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface EarningsByDayRepository extends JpaRepository<EarningsByDay, LocalDate> {
    List<EarningsByDay> findByEarnDateBetween(LocalDate start, LocalDate end);
}
