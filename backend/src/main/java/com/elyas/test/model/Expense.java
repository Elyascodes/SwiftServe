package com.elyas.test.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "expenses")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "billing_name", nullable = false, length = 100)
    private String billingName;

    @Column(length = 250)
    private String description;

    @Column(nullable = false)
    private Double cost = 0.0;

    @Column(name = "expense_date")
    private LocalDate expenseDate;

    public Long getId() { return id; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getBillingName() { return billingName; }
    public void setBillingName(String billingName) { this.billingName = billingName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Double getCost() { return cost; }
    public void setCost(Double cost) { this.cost = cost; }

    public LocalDate getExpenseDate() { return expenseDate; }
    public void setExpenseDate(LocalDate expenseDate) { this.expenseDate = expenseDate; }
}
