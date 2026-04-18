package com.elyas.test.repository;

import com.elyas.test.model.TableStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TableStatusRepository extends JpaRepository<TableStatus, String> {
    List<TableStatus> findByStatus(String status);
}
