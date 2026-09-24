package com.example.orderservice.model;

public class StockRequest {

    private final int quantity;

    public StockRequest(int quantity) {
        this.quantity = quantity;
    }

    public int getQuantity() {
        return quantity;
    }
}
