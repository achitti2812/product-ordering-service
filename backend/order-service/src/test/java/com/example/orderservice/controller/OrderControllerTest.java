package com.example.orderservice.controller;

import com.example.orderservice.client.PaymentClient;
import com.example.orderservice.client.ProductClient;
import com.example.orderservice.model.Order;
import com.example.orderservice.model.OrderItemRequest;
import com.example.orderservice.model.OrderRequest;
import com.example.orderservice.model.PaymentResponse;
import com.example.orderservice.model.ProductResponse;
import com.example.orderservice.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrderControllerTest {

    private StubProductClient productClient;
    private StubPaymentClient paymentClient;
    private OrderController controller;

    @BeforeEach
    void setUp() {
        productClient = new StubProductClient();
        paymentClient = new StubPaymentClient();
        OrderService orderService = new OrderService(productClient, paymentClient);
        controller = new OrderController(orderService);

        productClient.returnProduct(laptop());
        productClient.returnProduct(headphones());
        productClient.returnProduct(keyboard());
    }

    @Test
    void existingSingleProductRequestStillCreatesConfirmedOrder() {
        ResponseEntity<Order> response = controller.createOrder(new OrderRequest(2L, 2));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getItems().size());
        assertEquals(2L, response.getBody().getItems().get(0).getProductId());
        assertEquals(2, response.getBody().getItems().get(0).getQuantity());
        assertEquals(new BigDecimal("159.98"), response.getBody().getTotalAmount());
        assertEquals("CONFIRMED", response.getBody().getStatus());
    }

    @Test
    void multiProductOrderCalculatesExactLineTotalsAndOneOrderTotal() {
        ResponseEntity<Order> response = controller.createOrder(multiItemRequest(
                item(2L, 2),
                item(3L, 1)
        ));

        Order order = response.getBody();
        assertNotNull(order);
        assertEquals("CONFIRMED", order.getStatus());
        assertEquals(2, order.getItems().size());
        assertEquals("Headphones", order.getItems().get(0).getProductName());
        assertEquals(new BigDecimal("79.99"), order.getItems().get(0).getUnitPrice());
        assertEquals(new BigDecimal("159.98"), order.getItems().get(0).getLineTotal());
        assertEquals("Keyboard", order.getItems().get(1).getProductName());
        assertEquals(new BigDecimal("49.99"), order.getItems().get(1).getLineTotal());
        assertEquals(new BigDecimal("209.97"), order.getTotalAmount());
        assertEquals(1, paymentClient.getCallCount());
        assertEquals(new BigDecimal("209.97"), paymentClient.getLastAmount());
    }

    @Test
    void successfulPaymentReducesStockForEveryItem() {
        controller.createOrder(multiItemRequest(item(2L, 2), item(3L, 1)));

        assertEquals(2, productClient.getReducedQuantity(2L));
        assertEquals(1, productClient.getReducedQuantity(3L));
    }

    @Test
    void failedMultiProductPaymentDoesNotReduceAnyStock() {
        paymentClient.returnStatus("FAILED");

        Order order = controller.createOrder(multiItemRequest(
                item(1L, 1),
                item(2L, 1)
        )).getBody();

        assertNotNull(order);
        assertEquals(new BigDecimal("1079.98"), order.getTotalAmount());
        assertEquals("PAYMENT_FAILED", order.getStatus());
        assertTrue(productClient.getStockReductions().isEmpty());
    }

    @Test
    void insufficientStockRejectsWholeOrderBeforePayment() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(multiItemRequest(item(3L, 1), item(2L, 100)))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Insufficient"));
        assertEquals(0, paymentClient.getCallCount());
        assertTrue(productClient.getStockReductions().isEmpty());
    }

    @Test
    void rejectsNonexistentProductBeforePayment() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(multiItemRequest(item(2L, 1), item(999L, 1)))
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertTrue(exception.getReason().contains("999"));
        assertEquals(0, paymentClient.getCallCount());
    }

    @Test
    void rejectsZeroQuantity() {
        assertBadRequestWithReason(multiItemRequest(item(2L, 0)), "Quantity");
    }

    @Test
    void rejectsNegativeQuantity() {
        assertBadRequestWithReason(multiItemRequest(item(2L, -1)), "Quantity");
    }

    @Test
    void rejectsMissingItems() {
        assertBadRequestWithReason(new OrderRequest(), "items");
    }

    @Test
    void rejectsEmptyItems() {
        assertBadRequestWithReason(new OrderRequest(List.of()), "items");
    }

    @Test
    void rejectsNullItem() {
        OrderRequest request = new OrderRequest();
        request.setItems(java.util.Arrays.asList((OrderItemRequest) null));

        assertBadRequestWithReason(request, "must not be null");
    }

    @Test
    void rejectsMissingProductId() {
        assertBadRequestWithReason(multiItemRequest(item(null, 1)), "Product ID");
    }

    @Test
    void normalizesDuplicateProductIdsIntoOneOrderItem() {
        Order order = controller.createOrder(multiItemRequest(
                item(2L, 1),
                item(2L, 2)
        )).getBody();

        assertNotNull(order);
        assertEquals(1, order.getItems().size());
        assertEquals(3, order.getItems().get(0).getQuantity());
        assertEquals(new BigDecimal("239.97"), order.getTotalAmount());
        assertEquals(3, productClient.getReducedQuantity(2L));
    }

    @Test
    void getsExistingOrderWithAllItems() {
        Order createdOrder = controller.createOrder(multiItemRequest(
                item(2L, 2),
                item(3L, 1)
        )).getBody();

        ResponseEntity<Order> response = controller.getOrderById(createdOrder.getId());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(createdOrder.getId(), response.getBody().getId());
        assertEquals(2, response.getBody().getItems().size());
    }

    @Test
    void returnsNotFoundForUnknownOrder() {
        ResponseEntity<Order> response = controller.getOrderById(999L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void reportsProductServiceFailureAsBadGateway() {
        productClient.makeProductServiceUnavailable();

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(multiItemRequest(item(2L, 1)))
        );

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Product Service"));
        assertEquals(0, paymentClient.getCallCount());
    }

    @Test
    void reportsPaymentServiceFailureAsBadGatewayWithoutReducingStock() {
        paymentClient.makePaymentServiceUnavailable();

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(multiItemRequest(item(2L, 1), item(3L, 1)))
        );

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Payment Service"));
        assertTrue(productClient.getStockReductions().isEmpty());
    }

    @Test
    void storesInventoryUpdateFailedOrderWhenStockReductionFailsAfterPayment() {
        productClient.failStockReductionFor(3L);

        Order order = controller.createOrder(multiItemRequest(
                item(2L, 2),
                item(3L, 1)
        )).getBody();

        assertNotNull(order);
        assertEquals("INVENTORY_UPDATE_FAILED", order.getStatus());
        assertEquals(2, productClient.getReducedQuantity(2L));
        assertEquals(0, productClient.getReducedQuantity(3L));

        ResponseEntity<Order> storedOrder = controller.getOrderById(order.getId());
        assertEquals(HttpStatus.OK, storedOrder.getStatusCode());
        assertEquals("INVENTORY_UPDATE_FAILED", storedOrder.getBody().getStatus());
    }

    private void assertBadRequestWithReason(OrderRequest request, String reasonText) {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains(reasonText));
        assertEquals(0, paymentClient.getCallCount());
    }

    private OrderRequest multiItemRequest(OrderItemRequest... items) {
        return new OrderRequest(List.of(items));
    }

    private OrderItemRequest item(Long productId, int quantity) {
        return new OrderItemRequest(productId, quantity);
    }

    private ProductResponse laptop() {
        return new ProductResponse(1L, "Laptop", new BigDecimal("999.99"), 10);
    }

    private ProductResponse headphones() {
        return new ProductResponse(2L, "Headphones", new BigDecimal("79.99"), 25);
    }

    private ProductResponse keyboard() {
        return new ProductResponse(3L, "Keyboard", new BigDecimal("49.99"), 40);
    }

    private static class StubProductClient extends ProductClient {

        private final Map<Long, ProductResponse> products = new LinkedHashMap<>();
        private final Map<Long, Integer> stockReductions = new LinkedHashMap<>();
        private boolean unavailable;
        private Long failedStockProductId;

        StubProductClient() {
            super("http://localhost:8080");
        }

        void returnProduct(ProductResponse product) {
            products.put(product.getId(), product);
        }

        void makeProductServiceUnavailable() {
            unavailable = true;
        }

        void failStockReductionFor(Long productId) {
            failedStockProductId = productId;
        }

        @Override
        public Optional<ProductResponse> getProductById(Long productId) {
            if (unavailable) {
                throw new RestClientException("Product Service unavailable");
            }

            return Optional.ofNullable(products.get(productId));
        }

        @Override
        public ProductResponse reduceStock(Long productId, int quantity) {
            if (productId.equals(failedStockProductId)) {
                throw new RestClientException("Stock update failed");
            }

            stockReductions.merge(productId, quantity, Integer::sum);
            return products.get(productId);
        }

        int getReducedQuantity(Long productId) {
            return stockReductions.getOrDefault(productId, 0);
        }

        Map<Long, Integer> getStockReductions() {
            return stockReductions;
        }
    }

    private static class StubPaymentClient extends PaymentClient {

        private String status = "SUCCESS";
        private int callCount;
        private BigDecimal lastAmount;
        private boolean unavailable;

        StubPaymentClient() {
            super("http://localhost:8082");
        }

        void returnStatus(String status) {
            this.status = status;
        }

        void makePaymentServiceUnavailable() {
            unavailable = true;
        }

        @Override
        public PaymentResponse createPayment(Long orderId, BigDecimal amount) {
            callCount++;
            lastAmount = amount;

            if (unavailable) {
                throw new RestClientException("Payment Service unavailable");
            }

            return new PaymentResponse(1L, orderId, amount, status);
        }

        int getCallCount() {
            return callCount;
        }

        BigDecimal getLastAmount() {
            return lastAmount;
        }
    }
}
