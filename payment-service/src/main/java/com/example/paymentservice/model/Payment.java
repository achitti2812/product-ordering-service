package com.example.paymentservice.model;

import java.math.BigDecimal;

public class Payment {

    private final Long id;
    private final Long orderId;
    private final BigDecimal amount;
    private final String status;

    public Payment(Long id, Long orderId, BigDecimal amount, String status) {
        this.id = id;
        this.orderId = orderId;
        this.amount = amount;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getStatus() {
        return status;
    }
}
