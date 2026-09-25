package com.example.productservice.controller;

import com.example.productservice.model.Product;
import com.example.productservice.model.StockRequest;
import com.example.productservice.repository.ProductRepository;
import com.example.productservice.service.ProductCatalogSeeder;
import com.example.productservice.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class ProductControllerTest {

    @Autowired
    private ProductController controller;

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductCatalogSeeder productCatalogSeeder;

    @Test
    void seedsAllProductsWhenDatabaseIsEmpty() {
        assertEquals(50, productRepository.count());
    }

    @Test
    void seedingAgainDoesNotOverwriteExistingStock() {
        controller.reduceStock(2L, new StockRequest(2));

        productCatalogSeeder.seedProductsIfEmpty();

        assertEquals(23, productRepository.findById(2L).orElseThrow().getStock());
    }

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
        assertTrue(response.getBody().getImageUrl().startsWith("https://images.unsplash.com/"));
    }

    @Test
    void returnsNotFoundForUnknownId() {
        ResponseEntity<Product> response = controller.getProductById(999L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
    }

    @Test
    void reducesAndPersistsStockSuccessfully() {
        ResponseEntity<Product> response = controller.reduceStock(2L, new StockRequest(2));
        productRepository.flush();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(23, response.getBody().getStock());
        assertEquals(23, productRepository.findById(2L).orElseThrow().getStock());
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
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentRequestsCannotBothPurchaseTheFinalUnit() throws Exception {
        Product product = productRepository.findById(50L).orElseThrow();
        int originalStock = product.getStock();
        product.setStock(1);
        productRepository.saveAndFlush(product);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try {
            Future<Boolean> firstResult = executor.submit(() -> reduceFinalUnit(ready, start));
            Future<Boolean> secondResult = executor.submit(() -> reduceFinalUnit(ready, start));

            ready.await();
            start.countDown();

            int successfulRequests = (firstResult.get() ? 1 : 0) + (secondResult.get() ? 1 : 0);
            assertEquals(1, successfulRequests);
            assertEquals(0, productRepository.findById(50L).orElseThrow().getStock());
        } finally {
            executor.shutdownNow();
            Product productToRestore = productRepository.findById(50L).orElseThrow();
            productToRestore.setStock(originalStock);
            productRepository.saveAndFlush(productToRestore);
        }
    }

    private boolean reduceFinalUnit(CountDownLatch ready, CountDownLatch start) throws InterruptedException {
        ready.countDown();
        start.await();

        try {
            productService.reduceStock(50L, 1);
            return true;
        } catch (ResponseStatusException exception) {
            assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
            return false;
        }
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
