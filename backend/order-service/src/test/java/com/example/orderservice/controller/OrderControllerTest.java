package com.example.orderservice.controller;

import com.example.orderservice.client.PaymentClient;
import com.example.orderservice.client.ProductClient;
import com.example.orderservice.model.Order;
import com.example.orderservice.model.OrderItemRequest;
import com.example.orderservice.model.OrderRequest;
import com.example.orderservice.model.PaymentResponse;
import com.example.orderservice.model.ProductResponse;
import com.example.orderservice.repository.OrderRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest
@Transactional
class OrderControllerTest {

    @Autowired
    private OrderController controller;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private EntityManager entityManager;

    @MockitoBean
    private ProductClient productClient;

    @MockitoBean
    private PaymentClient paymentClient;

    private Map<Long, ProductResponse> products;

    @BeforeEach
    void setUp() {
        products = Map.of(
                1L, laptop(),
                2L, headphones(),
                3L, keyboard()
        );

        when(productClient.getProductById(anyLong()))
                .thenAnswer(invocation -> Optional.ofNullable(products.get(invocation.getArgument(0))));
        when(productClient.reduceStock(anyLong(), anyInt()))
                .thenAnswer(invocation -> products.get(invocation.getArgument(0)));
        when(paymentClient.createPayment(anyLong(), any(BigDecimal.class)))
                .thenAnswer(invocation -> new PaymentResponse(
                        1L,
                        invocation.getArgument(0),
                        invocation.getArgument(1),
                        "SUCCESS"
                ));
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
    void getOrdersReturnsOk() {
        ResponseEntity<List<Order>> response = controller.getOrders();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    void emptyOrderHistoryReturnsEmptyList() {
        ResponseEntity<List<Order>> response = controller.getOrders();

        assertNotNull(response.getBody());
        assertTrue(response.getBody().isEmpty());
    }

    @Test
    void returnsMultipleOrdersNewestFirst() {
        Order firstOrder = controller.createOrder(new OrderRequest(2L, 2)).getBody();
        Order secondOrder = controller.createOrder(new OrderRequest(3L, 1)).getBody();

        List<Order> orders = controller.getOrders().getBody();

        assertNotNull(firstOrder);
        assertNotNull(secondOrder);
        assertNotNull(orders);
        assertEquals(List.of(secondOrder.getId(), firstOrder.getId()),
                orders.stream().map(Order::getId).toList());
    }

    @Test
    void confirmedOrdersAppearInHistory() {
        controller.createOrder(new OrderRequest(2L, 1));

        List<Order> orders = controller.getOrders().getBody();

        assertNotNull(orders);
        assertEquals(1, orders.size());
        assertEquals("CONFIRMED", orders.get(0).getStatus());
    }

    @Test
    void failedPaymentOrdersAppearInHistory() {
        returnPaymentStatus("FAILED");
        controller.createOrder(new OrderRequest(1L, 1));

        List<Order> orders = controller.getOrders().getBody();

        assertNotNull(orders);
        assertEquals(1, orders.size());
        assertEquals("PAYMENT_FAILED", orders.get(0).getStatus());
    }

    @Test
    void inventoryUpdateFailedOrdersAppearInHistory() {
        when(productClient.reduceStock(eq(3L), anyInt()))
                .thenThrow(new RestClientException("Stock update failed"));
        controller.createOrder(new OrderRequest(3L, 1));

        List<Order> orders = controller.getOrders().getBody();

        assertNotNull(orders);
        assertEquals(1, orders.size());
        assertEquals("INVENTORY_UPDATE_FAILED", orders.get(0).getStatus());
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
        verify(paymentClient).createPayment(order.getId(), new BigDecimal("209.97"));
    }

    @Test
    void successfulPaymentReducesStockForEveryItem() {
        controller.createOrder(multiItemRequest(item(2L, 2), item(3L, 1)));

        verify(productClient).reduceStock(2L, 2);
        verify(productClient).reduceStock(3L, 1);
    }

    @Test
    void failedMultiProductPaymentDoesNotReduceAnyStock() {
        returnPaymentStatus("FAILED");

        Order order = controller.createOrder(multiItemRequest(
                item(1L, 1),
                item(2L, 1)
        )).getBody();

        assertNotNull(order);
        assertEquals(new BigDecimal("1079.98"), order.getTotalAmount());
        assertEquals("PAYMENT_FAILED", order.getStatus());
        verify(productClient, never()).reduceStock(anyLong(), anyInt());
    }

    @Test
    void insufficientStockRejectsWholeOrderBeforePayment() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(multiItemRequest(item(3L, 1), item(2L, 100)))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Insufficient"));
        verify(paymentClient, never()).createPayment(anyLong(), any(BigDecimal.class));
        verify(productClient, never()).reduceStock(anyLong(), anyInt());
    }

    @Test
    void rejectsNonexistentProductBeforePayment() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(multiItemRequest(item(2L, 1), item(999L, 1)))
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertTrue(exception.getReason().contains("999"));
        verify(paymentClient, never()).createPayment(anyLong(), any(BigDecimal.class));
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
        verify(productClient).reduceStock(2L, 3);
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
    void orderAndItemsCanBeReloadedFromDatabase() {
        Order createdOrder = controller.createOrder(multiItemRequest(item(2L, 2), item(3L, 1))).getBody();
        assertNotNull(createdOrder);

        orderRepository.flush();
        entityManager.clear();

        Order reloadedOrder = controller.getOrderById(createdOrder.getId()).getBody();
        assertNotNull(reloadedOrder);
        assertEquals("CONFIRMED", reloadedOrder.getStatus());
        assertEquals(2, reloadedOrder.getItems().size());
        assertEquals(new BigDecimal("209.97"), reloadedOrder.getTotalAmount());
    }

    @Test
    void returnsNotFoundForUnknownOrder() {
        ResponseEntity<Order> response = controller.getOrderById(999L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void reportsProductServiceFailureAsBadGateway() {
        when(productClient.getProductById(anyLong()))
                .thenThrow(new RestClientException("Product Service unavailable"));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(multiItemRequest(item(2L, 1)))
        );

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Product Service"));
        verify(paymentClient, never()).createPayment(anyLong(), any(BigDecimal.class));
    }

    @Test
    void reportsPaymentServiceFailureAsBadGatewayWithoutReducingStock() {
        when(paymentClient.createPayment(anyLong(), any(BigDecimal.class)))
                .thenThrow(new RestClientException("Payment Service unavailable"));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(multiItemRequest(item(2L, 1), item(3L, 1)))
        );

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Payment Service"));
        verify(productClient, never()).reduceStock(anyLong(), anyInt());
    }

    @Test
    void storesInventoryUpdateFailedOrderWhenStockReductionFailsAfterPayment() {
        when(productClient.reduceStock(eq(3L), anyInt()))
                .thenThrow(new RestClientException("Stock update failed"));

        Order order = controller.createOrder(multiItemRequest(
                item(2L, 2),
                item(3L, 1)
        )).getBody();

        assertNotNull(order);
        assertEquals("INVENTORY_UPDATE_FAILED", order.getStatus());
        verify(productClient).reduceStock(2L, 2);
        verify(productClient).reduceStock(3L, 1);

        orderRepository.flush();
        entityManager.clear();

        ResponseEntity<Order> storedOrder = controller.getOrderById(order.getId());
        assertEquals(HttpStatus.OK, storedOrder.getStatusCode());
        assertNotNull(storedOrder.getBody());
        assertEquals("INVENTORY_UPDATE_FAILED", storedOrder.getBody().getStatus());
    }

    private void returnPaymentStatus(String status) {
        when(paymentClient.createPayment(anyLong(), any(BigDecimal.class)))
                .thenAnswer(invocation -> new PaymentResponse(
                        1L,
                        invocation.getArgument(0),
                        invocation.getArgument(1),
                        status
                ));
    }

    private void assertBadRequestWithReason(OrderRequest request, String reasonText) {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createOrder(request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains(reasonText));
        verify(paymentClient, never()).createPayment(anyLong(), any(BigDecimal.class));
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
}
