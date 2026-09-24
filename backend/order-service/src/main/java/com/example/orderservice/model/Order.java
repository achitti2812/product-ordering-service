package com.example.orderservice.model;

import java.math.BigDecimal;
import java.util.List;

public class Order {

    private final Long id;
    private final List<OrderItem> items;
    private final BigDecimal totalAmount;
    private final String status;

    public Order(Long id, List<OrderItem> items, BigDecimal totalAmount, String status) {
        this.id = id;
        this.items = List.copyOf(items);
        this.totalAmount = totalAmount;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getStatus() {
        return status;
    }
}
