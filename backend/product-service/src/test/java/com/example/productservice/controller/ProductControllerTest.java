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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductControllerTest {

    private final ProductController controller = new ProductController(new ProductService());

    @Test
    void returnsAllProducts() {
        List<Product> products = controller.getProducts(null, null);

        assertEquals(50, products.size());
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
        assertEquals("Electronics", response.getBody().getCategory());
        assertFalse(response.getBody().getDescription().isBlank());
        assertTrue(response.getBody().getImageUrl().startsWith("https://placehold.co/"));
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

    @Test
    void filtersProductsByElectronicsCategory() {
        List<Product> products = controller.getProducts("Electronics", null);

        assertEquals(10, products.size());
        assertTrue(products.stream().allMatch(product -> product.getCategory().equals("Electronics")));
    }

    @Test
    void filtersProductsByFashionCategory() {
        List<Product> products = controller.getProducts("Fashion", null);

        assertEquals(10, products.size());
        assertTrue(products.stream().allMatch(product -> product.getCategory().equals("Fashion")));
    }

    @Test
    void categoryFilterIsCaseInsensitive() {
        List<Product> products = controller.getProducts("electronics", null);

        assertEquals(10, products.size());
        assertTrue(products.stream().allMatch(product -> product.getCategory().equals("Electronics")));
    }

    @Test
    void searchesProductsByName() {
        List<Product> products = controller.getProducts(null, "laptop");

        assertEquals(1, products.size());
        assertEquals(1L, products.get(0).getId());
    }

    @Test
    void searchesProductsByDescription() {
        List<Product> products = controller.getProducts(null, "noise-isolating");

        assertEquals(1, products.size());
        assertEquals(2L, products.get(0).getId());
    }

    @Test
    void searchIsCaseInsensitive() {
        List<Product> products = controller.getProducts(null, "WIRELESS");

        assertEquals(2, products.size());
        assertTrue(products.stream().anyMatch(product -> product.getId().equals(2L)));
        assertTrue(products.stream().anyMatch(product -> product.getId().equals(7L)));
    }

    @Test
    void combinesCategoryAndSearchFilters() {
        List<Product> products = controller.getProducts("Electronics", "wireless");

        assertEquals(2, products.size());
        assertTrue(products.stream().allMatch(product -> product.getCategory().equals("Electronics")));
    }

    @Test
    void returnsEmptyListWhenSearchHasNoMatches() {
        List<Product> products = controller.getProducts(null, "does-not-exist");

        assertTrue(products.isEmpty());
    }
}
