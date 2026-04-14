package com.elyas.test.model;

import jakarta.persistence.*;

@Entity
@Table(name = "employee")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false, unique = true, length = 6)
    private String employeeId;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role;

    @Column(nullable = false)
    private String name;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "pay_rate")
    private Double payRate;

    @Column(name = "assigned_tables")
    private String assignedTables;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public Long getId() { return id; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public Double getPayRate() { return payRate; }
    public void setPayRate(Double payRate) { this.payRate = payRate; }

    public String getAssignedTables() { return assignedTables; }
    public void setAssignedTables(String assignedTables) { this.assignedTables = assignedTables; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
