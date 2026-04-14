package com.elyas.test.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tables_status")
public class TableStatus {

    @Id
    @Column(name = "table_id", length = 2)
    private String tableId;

    @Column(nullable = false, length = 10)
    private String status = "CLEAN";

    @Column(nullable = false)
    private Integer capacity = 4;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    public String getTableId() { return tableId; }
    public void setTableId(String tableId) { this.tableId = tableId; }

    public String getStatus() { return status; }
    public void setStatus(String status) {
        this.status = status;
        this.lastUpdated = LocalDateTime.now();
    }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
}
