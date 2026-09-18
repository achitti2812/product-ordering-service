package com.example.productservice.controller;

import com.example.productservice.model.Product;
import com.example.productservice.model.StockRequest;
import com.example.productservice.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

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

    @Test
    void reducesStockSuccessfully() {
        ResponseEntity<Product> response = controller.reduceStock(2L, new StockRequest(2));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(23, response.getBody().getStock());
    }

    @Test
    void rejectsInvalidStockQuantity() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.reduceStock(2L, new StockRequest(0))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void rejectsStockReductionWhenStockIsInsufficient() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.reduceStock(1L, new StockRequest(11))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void returnsNotFoundWhenReducingStockForUnknownProduct() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.reduceStock(999L, new StockRequest(1))
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }
}
