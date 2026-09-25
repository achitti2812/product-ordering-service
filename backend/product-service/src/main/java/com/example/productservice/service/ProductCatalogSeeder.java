package com.example.productservice.service;

import com.example.productservice.model.Product;
import com.example.productservice.repository.ProductRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Component
public class ProductCatalogSeeder implements ApplicationRunner {

    private final ProductRepository productRepository;

    public ProductCatalogSeeder(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedProductsIfEmpty();
    }

    @Transactional
    public void seedProductsIfEmpty() {
        if (productRepository.count() == 0) {
            productRepository.saveAll(initialProducts());
        }
    }

    private static List<Product> initialProducts() {
        return List.of(
                product(1L, "Laptop", "Powerful laptop for work, study, and everyday use.", "Electronics", "999.99", 10, "photo-1517336714731-489689fd1ca8"),
                product(2L, "Headphones", "Wireless noise-isolating headphones with clear sound.", "Electronics", "79.99", 25, "photo-1505740420928-5e560c06d30e"),
                product(3L, "Keyboard", "Responsive mechanical keyboard for comfortable typing.", "Electronics", "49.99", 40, "photo-1618384887929-16ec33fab9ef"),
                product(4L, "Smartphone", "Modern smartphone with a bright display and capable camera.", "Electronics", "699.99", 18, "photo-1592890288564-76628a30a657"),
                product(5L, "Smart Watch", "Everyday smart watch for notifications and activity tracking.", "Electronics", "199.99", 30, "photo-1579586337278-3befd40fd17a"),
                product(6L, "Bluetooth Speaker", "Portable speaker with rich sound and Bluetooth connectivity.", "Electronics", "59.99", 35, "photo-1608043152269-423dbba4e7e1"),
                product(7L, "Wireless Mouse", "Compact wireless mouse with an ergonomic design.", "Electronics", "29.99", 50, "photo-1527864550417-7fd91fc51a46"),
                product(8L, "Tablet", "Lightweight tablet for browsing, reading, and streaming.", "Electronics", "449.99", 20, "photo-1561154464-82e9adf32764"),
                product(9L, "Monitor", "Twenty-seven-inch monitor with a crisp full-HD display.", "Electronics", "249.99", 15, "photo-1527443224154-c4a3942d3acf"),
                product(10L, "Webcam", "Full-HD webcam for video calls and online meetings.", "Electronics", "69.99", 28, "photo-1588196749597-9ff075ee6b5b"),

                product(11L, "Men's T-Shirt", "Soft cotton men's T-shirt for casual everyday wear.", "Fashion", "19.99", 60, "photo-1581655353564-df123a1eb820"),
                product(12L, "Women's T-Shirt", "Comfortable cotton women's T-shirt with a relaxed fit.", "Fashion", "21.99", 55, "photo-1759572095384-1a7e646d0d4f"),
                product(13L, "Hoodie", "Warm fleece hoodie with a front pocket and drawstring hood.", "Fashion", "49.99", 35, "photo-1620799140188-3b2a02fd9a77"),
                product(14L, "Jeans", "Classic straight-fit denim jeans for everyday wear.", "Fashion", "59.99", 40, "photo-1602293589930-45aad59ba3ab"),
                product(15L, "Running Shoes", "Lightweight running shoes with cushioned support.", "Fashion", "89.99", 30, "photo-1542291026-7eec264c27ff"),
                product(16L, "Casual Shoes", "Versatile casual shoes for work and weekends.", "Fashion", "74.99", 28, "photo-1668069226492-508742b03147"),
                product(17L, "Jacket", "Water-resistant lightweight jacket for cool weather.", "Fashion", "119.99", 20, "photo-1591047139829-d91aecb6caea"),
                product(18L, "Backpack", "Durable backpack with padded device storage.", "Fashion", "54.99", 32, "photo-1553062407-98eeb64c6a62"),
                product(19L, "Sunglasses", "Classic sunglasses with UV-protective lenses.", "Fashion", "39.99", 45, "photo-1511499767150-a48a237f0083"),
                product(20L, "Cap", "Adjustable cotton cap for a comfortable fit.", "Fashion", "18.99", 50, "photo-1588850561407-ed78c282e89b"),

                product(21L, "Coffee Maker", "Programmable coffee maker for fresh morning coffee.", "Home & Kitchen", "79.99", 22, "photo-1608354580875-30bd4168b351"),
                product(22L, "Blender", "Multi-speed blender for smoothies, sauces, and soups.", "Home & Kitchen", "59.99", 25, "photo-1654064754916-e3edeb09c042"),
                product(23L, "Toaster", "Two-slice toaster with adjustable browning controls.", "Home & Kitchen", "34.99", 30, "photo-1686644823126-7ed947386b77"),
                product(24L, "Air Fryer", "Compact air fryer for quick meals with less oil.", "Home & Kitchen", "129.99", 18, "photo-1695089028114-ce28248f0ab9"),
                product(25L, "Desk Lamp", "Adjustable LED desk lamp with warm and cool light modes.", "Home & Kitchen", "39.99", 38, "photo-1519219788971-8d9797e0928e"),
                product(26L, "Water Bottle", "Reusable insulated bottle that keeps drinks cold.", "Home & Kitchen", "24.99", 65, "photo-1602143407151-7111542de6e8"),
                product(27L, "Cookware Set", "Non-stick cookware set for everyday meal preparation.", "Home & Kitchen", "149.99", 16, "photo-1584990347193-6bebebfeaeee"),
                product(28L, "Bedsheet Set", "Soft cotton bedsheet set with matching pillowcases.", "Home & Kitchen", "44.99", 26, "photo-1564019472231-4586c552dc27"),
                product(29L, "Storage Organizer", "Stackable organizer for tidy closets and shelves.", "Home & Kitchen", "29.99", 42, "photo-1638780506095-3d61a4f0edd6"),
                product(30L, "Electric Kettle", "Fast-boiling electric kettle with automatic shutoff.", "Home & Kitchen", "49.99", 24, "photo-1738520420652-0c47cea3922b"),

                product(31L, "Java Programming", "Beginner-friendly introduction to the Java programming language.", "Books", "44.99", 40, "photo-1516321318423-f06f85e504b3"),
                product(32L, "Spring Boot Guide", "Practical guide to building Java REST APIs with Spring Boot.", "Books", "39.99", 35, "photo-1461749280684-dccba630e2f6"),
                product(33L, "Clean Code", "Principles and examples for writing clear, maintainable software.", "Books", "34.99", 32, "photo-1555066931-4365d14bab8c"),
                product(34L, "System Design Basics", "Accessible introduction to scalable system design concepts.", "Books", "29.99", 30, "photo-1669023414162-8b0573b9c6b2"),
                product(35L, "Algorithms Made Easy", "Simple explanations of common algorithms and data structures.", "Books", "27.99", 38, "photo-1515879218367-8466d910aaa4"),
                product(36L, "Database Fundamentals", "Core relational database concepts, queries, and design basics.", "Books", "32.99", 28, "photo-1667372459510-55b5e2087cd0"),
                product(37L, "Cloud Computing Basics", "An approachable overview of modern cloud computing.", "Books", "31.99", 27, "photo-1667984390538-3dea7a3fe33d"),
                product(38L, "JavaScript Guide", "Hands-on guide to JavaScript for modern web development.", "Books", "28.99", 36, "photo-1542831371-29b0f74f9713"),
                product(39L, "React Handbook", "Step-by-step introduction to building user interfaces with React.", "Books", "30.99", 34, "photo-1633356122544-f134324a6cee"),
                product(40L, "Microservices Fundamentals", "Beginner guide to REST communication and microservice concepts.", "Books", "36.99", 29, "photo-1553484771-371a605b060b"),

                product(41L, "Football", "Durable football designed for training and casual matches.", "Sports", "24.99", 45, "photo-1579952363873-27f3bade9f55"),
                product(42L, "Basketball", "Indoor and outdoor basketball with a dependable grip.", "Sports", "29.99", 40, "photo-1546519638-68e109498ffc"),
                product(43L, "Cricket Bat", "Balanced wooden cricket bat for practice and recreation.", "Sports", "69.99", 20, "photo-1593341646782-e0b495cff86d"),
                product(44L, "Badminton Racket", "Lightweight badminton racket for quick, controlled swings.", "Sports", "44.99", 25, "photo-1708312604109-16c0be9326cd"),
                product(45L, "Tennis Racket", "Comfortable tennis racket suitable for beginner players.", "Sports", "59.99", 22, "photo-1622279457486-62dcc4a431d6"),
                product(46L, "Yoga Mat", "Non-slip cushioned yoga mat for exercise and stretching.", "Sports", "35.99", 38, "photo-1552196563-55cd4e45efb3"),
                product(47L, "Dumbbell Set", "Adjustable dumbbell set for strength training at home.", "Sports", "89.99", 18, "photo-1638536532686-d610adfc8e5c"),
                product(48L, "Running Bottle", "Lightweight sports bottle designed for running and workouts.", "Sports", "19.99", 50, "photo-1600679472233-eabc13b79f07"),
                product(49L, "Sports Bag", "Roomy sports bag with separate shoe and accessory pockets.", "Sports", "49.99", 30, "photo-1692506530242-c12d6c3ae2e2"),
                product(50L, "Resistance Bands", "Set of resistance bands with multiple strength levels.", "Sports", "22.99", 44, "photo-1584827386916-b5351d3ba34b")
        );
    }

    private static Product product(
            Long id,
            String name,
            String description,
            String category,
            String price,
            int stock,
            String imageId
    ) {
        String imageUrl = "https://images.unsplash.com/" + imageId
                + "?auto=format&fit=crop&w=900&q=80";
        return new Product(id, name, description, category, new BigDecimal(price), stock, imageUrl);
    }
}
