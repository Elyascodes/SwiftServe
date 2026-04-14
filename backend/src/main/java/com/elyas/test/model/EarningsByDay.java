package com.elyas.test.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "earnings_by_day")
public class EarningsByDay {

    @Id
    @Column(name = "earn_date")
    private LocalDate earnDate;

    @Column(nullable = false)
    private Double revenue = 0.0;

    @Column(name = "cash_payments", nullable = false)
    private Integer cashPayments = 0;

    @Column(name = "card_payments", nullable = false)
    private Integer cardPayments = 0;

    public LocalDate getEarnDate() { return earnDate; }
    public void setEarnDate(LocalDate earnDate) { this.earnDate = earnDate; }

    public Double getRevenue() { return revenue; }
    public void setRevenue(Double revenue) { this.revenue = revenue; }

    public Integer getCashPayments() { return cashPayments; }
    public void setCashPayments(Integer cashPayments) { this.cashPayments = cashPayments; }

    public Integer getCardPayments() { return cardPayments; }
    public void setCardPayments(Integer cardPayments) { this.cardPayments = cardPayments; }
}
