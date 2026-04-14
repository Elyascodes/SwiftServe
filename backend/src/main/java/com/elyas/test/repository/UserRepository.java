package com.elyas.test.repository;

import com.elyas.test.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmployeeId(String employeeId);
    List<User> findByIsActiveTrue();
    List<User> findByRole(String role);
}
