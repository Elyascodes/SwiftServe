package com.elyas.test.model;

import jakarta.persistence.*;

@Entity
@Table(name = "menu_items")
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long itemId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 50, nullable = false)
    private String category;

    @Column(nullable = false)
    private Double price;

    @Column(columnDefinition = "TEXT")
    private String ingredients;

    private Integer stock;

    @Column(name = "expiration_date")
    private String expirationDate;

    @Column(name = "items_sold", nullable = false)
    private Integer itemsSold = 0;

    @Column(name = "total_revenue", nullable = false)
    private Double totalRevenue = 0.0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public Long getItemId() { return itemId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public String getIngredients() { return ingredients; }
    public void setIngredients(String ingredients) { this.ingredients = ingredients; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public String getExpirationDate() { return expirationDate; }
    public void setExpirationDate(String expirationDate) { this.expirationDate = expirationDate; }

    public Integer getItemsSold() { return itemsSold; }
    public void setItemsSold(Integer itemsSold) { this.itemsSold = itemsSold; }

    public Double getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(Double totalRevenue) { this.totalRevenue = totalRevenue; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
