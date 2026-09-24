package com.example.productservice.model;

public class Product {

    private final Long id;
    private final String name;
    private final String description;
    private final String category;
    private final double price;
    private int stock;
    private final String imageUrl;

    public Product(
            Long id,
            String name,
            String description,
            String category,
            double price,
            int stock,
            String imageUrl
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.price = price;
        this.stock = stock;
        this.imageUrl = imageUrl;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getCategory() {
        return category;
    }

    public double getPrice() {
        return price;
    }

    public int getStock() {
        return stock;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void reduceStock(int quantity) {
        stock -= quantity;
    }
}
