package com.elyas.test.repository;

import com.elyas.test.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByTableId(String tableId);
    List<Order> findByWaiterId(String waiterId);
    List<Order> findByStatus(String status);
    List<Order> findByStatusIn(List<String> statuses);
    List<Order> findByTableIdAndStatusNot(String tableId, String status);
    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
