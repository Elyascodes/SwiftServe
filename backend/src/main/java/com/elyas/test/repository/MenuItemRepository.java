package com.elyas.test.repository;

import com.elyas.test.model.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByIsActiveTrue();
    List<MenuItem> findByCategory(String category);
    List<MenuItem> findByIsActiveTrueOrderByCategoryAscNameAsc();
}
