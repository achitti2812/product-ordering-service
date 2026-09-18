package com.example.productservice.model;

public class StockRequest {

    private int quantity;

    public StockRequest() {
    }

    public StockRequest(int quantity) {
        this.quantity = quantity;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }
}
