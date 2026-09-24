package com.example.productservice.service;

import com.example.productservice.model.Product;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class ProductService {

    private final List<Product> products = List.of(
            product(1L, "Laptop", "Powerful laptop for work, study, and everyday use.", "Electronics", 999.99, 10),
            product(2L, "Headphones", "Wireless noise-isolating headphones with clear sound.", "Electronics", 79.99, 25),
            product(3L, "Keyboard", "Responsive mechanical keyboard for comfortable typing.", "Electronics", 49.99, 40),
            product(4L, "Smartphone", "Modern smartphone with a bright display and capable camera.", "Electronics", 699.99, 18),
            product(5L, "Smart Watch", "Everyday smart watch for notifications and activity tracking.", "Electronics", 199.99, 30),
            product(6L, "Bluetooth Speaker", "Portable speaker with rich sound and Bluetooth connectivity.", "Electronics", 59.99, 35),
            product(7L, "Wireless Mouse", "Compact wireless mouse with an ergonomic design.", "Electronics", 29.99, 50),
            product(8L, "Tablet", "Lightweight tablet for browsing, reading, and streaming.", "Electronics", 449.99, 20),
            product(9L, "Monitor", "Twenty-seven-inch monitor with a crisp full-HD display.", "Electronics", 249.99, 15),
            product(10L, "Webcam", "Full-HD webcam for video calls and online meetings.", "Electronics", 69.99, 28),

            product(11L, "Men's T-Shirt", "Soft cotton men's T-shirt for casual everyday wear.", "Fashion", 19.99, 60),
            product(12L, "Women's T-Shirt", "Comfortable cotton women's T-shirt with a relaxed fit.", "Fashion", 21.99, 55),
            product(13L, "Hoodie", "Warm fleece hoodie with a front pocket and drawstring hood.", "Fashion", 49.99, 35),
            product(14L, "Jeans", "Classic straight-fit denim jeans for everyday wear.", "Fashion", 59.99, 40),
            product(15L, "Running Shoes", "Lightweight running shoes with cushioned support.", "Fashion", 89.99, 30),
            product(16L, "Casual Shoes", "Versatile casual shoes for work and weekends.", "Fashion", 74.99, 28),
            product(17L, "Jacket", "Water-resistant lightweight jacket for cool weather.", "Fashion", 119.99, 20),
            product(18L, "Backpack", "Durable backpack with padded device storage.", "Fashion", 54.99, 32),
            product(19L, "Sunglasses", "Classic sunglasses with UV-protective lenses.", "Fashion", 39.99, 45),
            product(20L, "Cap", "Adjustable cotton cap for a comfortable fit.", "Fashion", 18.99, 50),

            product(21L, "Coffee Maker", "Programmable coffee maker for fresh morning coffee.", "Home & Kitchen", 79.99, 22),
            product(22L, "Blender", "Multi-speed blender for smoothies, sauces, and soups.", "Home & Kitchen", 59.99, 25),
            product(23L, "Toaster", "Two-slice toaster with adjustable browning controls.", "Home & Kitchen", 34.99, 30),
            product(24L, "Air Fryer", "Compact air fryer for quick meals with less oil.", "Home & Kitchen", 129.99, 18),
            product(25L, "Desk Lamp", "Adjustable LED desk lamp with warm and cool light modes.", "Home & Kitchen", 39.99, 38),
            product(26L, "Water Bottle", "Reusable insulated bottle that keeps drinks cold.", "Home & Kitchen", 24.99, 65),
            product(27L, "Cookware Set", "Non-stick cookware set for everyday meal preparation.", "Home & Kitchen", 149.99, 16),
            product(28L, "Bedsheet Set", "Soft cotton bedsheet set with matching pillowcases.", "Home & Kitchen", 44.99, 26),
            product(29L, "Storage Organizer", "Stackable organizer for tidy closets and shelves.", "Home & Kitchen", 29.99, 42),
            product(30L, "Electric Kettle", "Fast-boiling electric kettle with automatic shutoff.", "Home & Kitchen", 49.99, 24),

            product(31L, "Java Programming", "Beginner-friendly introduction to the Java programming language.", "Books", 44.99, 40),
            product(32L, "Spring Boot Guide", "Practical guide to building Java REST APIs with Spring Boot.", "Books", 39.99, 35),
            product(33L, "Clean Code", "Principles and examples for writing clear, maintainable software.", "Books", 34.99, 32),
            product(34L, "System Design Basics", "Accessible introduction to scalable system design concepts.", "Books", 29.99, 30),
            product(35L, "Algorithms Made Easy", "Simple explanations of common algorithms and data structures.", "Books", 27.99, 38),
            product(36L, "Database Fundamentals", "Core relational database concepts, queries, and design basics.", "Books", 32.99, 28),
            product(37L, "Cloud Computing Basics", "An approachable overview of modern cloud computing.", "Books", 31.99, 27),
            product(38L, "JavaScript Guide", "Hands-on guide to JavaScript for modern web development.", "Books", 28.99, 36),
            product(39L, "React Handbook", "Step-by-step introduction to building user interfaces with React.", "Books", 30.99, 34),
            product(40L, "Microservices Fundamentals", "Beginner guide to REST communication and microservice concepts.", "Books", 36.99, 29),

            product(41L, "Football", "Durable football designed for training and casual matches.", "Sports", 24.99, 45),
            product(42L, "Basketball", "Indoor and outdoor basketball with a dependable grip.", "Sports", 29.99, 40),
            product(43L, "Cricket Bat", "Balanced wooden cricket bat for practice and recreation.", "Sports", 69.99, 20),
            product(44L, "Badminton Racket", "Lightweight badminton racket for quick, controlled swings.", "Sports", 44.99, 25),
            product(45L, "Tennis Racket", "Comfortable tennis racket suitable for beginner players.", "Sports", 59.99, 22),
            product(46L, "Yoga Mat", "Non-slip cushioned yoga mat for exercise and stretching.", "Sports", 35.99, 38),
            product(47L, "Dumbbell Set", "Adjustable dumbbell set for strength training at home.", "Sports", 89.99, 18),
            product(48L, "Running Bottle", "Lightweight sports bottle designed for running and workouts.", "Sports", 19.99, 50),
            product(49L, "Sports Bag", "Roomy sports bag with separate shoe and accessory pockets.", "Sports", 49.99, 30),
            product(50L, "Resistance Bands", "Set of resistance bands with multiple strength levels.", "Sports", 22.99, 44)
    );

    private static Product product(
            Long id,
            String name,
            String description,
            String category,
            double price,
            int stock
    ) {
        String imageText = name.replace(" ", "+").replace("&", "and").replace("'", "");
        String imageUrl = "https://placehold.co/600x400?text=" + imageText;
        return new Product(id, name, description, category, price, stock, imageUrl);
    }

    public List<Product> getAllProducts() {
        return products;
    }

    public List<Product> getProducts(String category, String search) {
        String categoryFilter = category == null ? "" : category.trim();
        String searchFilter = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);

        if (categoryFilter.isEmpty() && searchFilter.isEmpty()) {
            return getAllProducts();
        }

        return products.stream()
                .filter(product -> categoryFilter.isEmpty()
                        || product.getCategory().equalsIgnoreCase(categoryFilter))
                .filter(product -> searchFilter.isEmpty()
                        || product.getName().toLowerCase(Locale.ROOT).contains(searchFilter)
                        || product.getDescription().toLowerCase(Locale.ROOT).contains(searchFilter))
                .toList();
    }

    public Optional<Product> getProductById(Long id) {
        return products.stream()
                .filter(product -> product.getId().equals(id))
                .findFirst();
    }

    public Product reduceStock(Long id, int quantity) {
        Product product = getProductById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Product does not exist"
                ));

        if (quantity <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than 0");
        }

        if (quantity > product.getStock()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient product stock");
        }

        product.reduceStock(quantity);
        return product;
    }
}
