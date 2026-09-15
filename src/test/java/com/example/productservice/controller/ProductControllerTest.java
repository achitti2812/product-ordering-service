package com.example.productservice.controller;

import com.example.productservice.model.Product;
import com.example.productservice.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class ProductControllerTest {

    private final ProductController controller = new ProductController(new ProductService());

    @Test
    void returnsAllProducts() {
        List<Product> products = controller.getAllProducts();

        assertEquals(3, products.size());
        assertEquals("Laptop", products.get(0).getName());
        assertEquals("Headphones", products.get(1).getName());
        assertEquals("Keyboard", products.get(2).getName());
    }

    @Test
    void returnsOneProductById() {
        ResponseEntity<Product> response = controller.getProductById(2L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Headphones", response.getBody().getName());
    }

    @Test
    void returnsNotFoundForUnknownId() {
        ResponseEntity<Product> response = controller.getProductById(999L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
    }
}
