package com.elyas.test.repository;

import com.elyas.test.model.RefundRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {
    List<RefundRequest> findByStatus(String status);
    List<RefundRequest> findByWaiterId(String waiterId);
    List<RefundRequest> findByOrderId(Long orderId);
}
