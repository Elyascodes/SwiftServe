package com.elyas.test.controller;

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
    private String role;   // MANAGER | WAITER | BUSBOY | CHEF

    @Column(nullable = false)
    private String name;

    public Long getId() { return id; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
