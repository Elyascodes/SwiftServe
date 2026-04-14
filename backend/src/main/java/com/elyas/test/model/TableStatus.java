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

    @Column(name = "assigned_waiter_id", length = 6)
    private String assignedWaiterId;

    @Column(name = "occupied_at")
    private LocalDateTime occupiedAt;

    @Column(name = "cleaned_at")
    private LocalDateTime cleanedAt;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    public String getTableId() { return tableId; }
    public void setTableId(String tableId) { this.tableId = tableId; }

    public String getStatus() { return status; }
    public void setStatus(String status) {
        if ("OCCUPIED".equals(status) && !"OCCUPIED".equals(this.status)) {
            this.occupiedAt = LocalDateTime.now();
        }
        if ("CLEAN".equals(status) && "DIRTY".equals(this.status)) {
            this.cleanedAt = LocalDateTime.now();
        }
        this.status = status;
        this.lastUpdated = LocalDateTime.now();
    }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public String getAssignedWaiterId() { return assignedWaiterId; }
    public void setAssignedWaiterId(String assignedWaiterId) { this.assignedWaiterId = assignedWaiterId; }

    public LocalDateTime getOccupiedAt() { return occupiedAt; }
    public void setOccupiedAt(LocalDateTime occupiedAt) { this.occupiedAt = occupiedAt; }

    public LocalDateTime getCleanedAt() { return cleanedAt; }
    public void setCleanedAt(LocalDateTime cleanedAt) { this.cleanedAt = cleanedAt; }

    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
}
