package com.example.orderservice.model;

import java.math.BigDecimal;

public class Order {

    private final Long id;
    private final Long productId;
    private final int quantity;
    private final BigDecimal totalAmount;
    private final String status;

    public Order(Long id, Long productId, int quantity, BigDecimal totalAmount, String status) {
        this.id = id;
        this.productId = productId;
        this.quantity = quantity;
        this.totalAmount = totalAmount;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public Long getProductId() {
        return productId;
    }

    public int getQuantity() {
        return quantity;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getStatus() {
        return status;
    }
}
