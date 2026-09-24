package com.example.orderservice.model;

import java.math.BigDecimal;

public class PaymentRequest {

    private final Long orderId;
    private final BigDecimal amount;

    public PaymentRequest(Long orderId, BigDecimal amount) {
        this.orderId = orderId;
        this.amount = amount;
    }

    public Long getOrderId() {
        return orderId;
    }

    public BigDecimal getAmount() {
        return amount;
    }
}
