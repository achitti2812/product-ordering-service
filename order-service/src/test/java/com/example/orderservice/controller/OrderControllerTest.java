package com.example.orderservice.controller;

import com.example.orderservice.client.ProductClient;
import com.example.orderservice.model.Order;
import com.example.orderservice.model.OrderRequest;
import com.example.orderservice.model.ProductResponse;
import com.example.orderservice.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrderControllerTest {

    private StubProductClient productClient;
    private OrderController controller;

    @BeforeEach
    void setUp() {
        productClient = new StubProductClient();
        OrderService orderService = new OrderService(productClient);
        controller = new OrderController(orderService);
    }

    @Test
    void createsOrderSuccessfully() {
        productClient.returnProduct(headphones());

        ResponseEntity<Order> response = controller.createOrder(new OrderRequest(2L, 2));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2L, response.getBody().getProductId());
        assertEquals(2, response.getBody().getQuantity());
        assertEquals(new BigDecimal("159.98"), response.getBody().getTotalAmount());
        assertEquals("CREATED", response.getBody().getStatus());
    }

    @Test
    void getsExistingOrder() {
        productClient.returnProduct(headphones());
        Order createdOrder = controller.createOrder(new OrderRequest(2L, 1)).getBody();

        ResponseEntity<Order> response = controller.getOrderById(createdOrder.getId());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(createdOrder.getId(), response.getBody().getId());
    }

    @Test
    void returnsNotFoundForUnknownOrder() {
        ResponseEntity<Order> response = controller.getOrderById(999L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void rejectsInvalidQuantity() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(new OrderRequest(2L, 0))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Quantity"));
    }

    @Test
    void rejectsInsufficientStock() {
        productClient.returnProduct(
                new ProductResponse(1L, "Laptop", new BigDecimal("999.99"), 10)
        );

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(new OrderRequest(1L, 11))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Insufficient"));
    }

    @Test
    void rejectsNonexistentProduct() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(new OrderRequest(999L, 1))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains("does not exist"));
    }

    private ProductResponse headphones() {
        return new ProductResponse(2L, "Headphones", new BigDecimal("79.99"), 25);
    }

    private static class StubProductClient extends ProductClient {

        private Optional<ProductResponse> product = Optional.empty();

        StubProductClient() {
            super("http://localhost:8080");
        }

        void returnProduct(ProductResponse product) {
            this.product = Optional.of(product);
        }

        @Override
        public Optional<ProductResponse> getProductById(Long productId) {
            return product.filter(value -> value.getId().equals(productId));
        }
    }
}
