package com.example.orderservice.service;

import com.example.orderservice.client.PaymentClient;
import com.example.orderservice.client.ProductClient;
import com.example.orderservice.model.Order;
import com.example.orderservice.model.OrderItem;
import com.example.orderservice.model.OrderItemRequest;
import com.example.orderservice.model.OrderRequest;
import com.example.orderservice.model.PaymentResponse;
import com.example.orderservice.model.ProductResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class OrderService {

    private static final Logger LOGGER = LoggerFactory.getLogger(OrderService.class);
    private static final String CONFIRMED_STATUS = "CONFIRMED";
    private static final String PAYMENT_FAILED_STATUS = "PAYMENT_FAILED";
    private static final String INVENTORY_UPDATE_FAILED_STATUS = "INVENTORY_UPDATE_FAILED";

    private final ProductClient productClient;
    private final PaymentClient paymentClient;
    private final List<Order> orders = new ArrayList<>();
    private final AtomicLong nextOrderId = new AtomicLong(1);

    public OrderService(ProductClient productClient, PaymentClient paymentClient) {
        this.productClient = productClient;
        this.paymentClient = paymentClient;
    }

    public Order createOrder(OrderRequest request) {
        Map<Long, Integer> requestedQuantities = normalizeRequest(request);
        List<OrderItem> orderItems = validateProductsAndCreateItems(requestedQuantities);
        BigDecimal totalAmount = orderItems.stream()
                .map(OrderItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        long orderId = nextOrderId.getAndIncrement();
        PaymentResponse payment;

        try {
            payment = paymentClient.createPayment(orderId, totalAmount);
        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Payment Service is unavailable",
                    exception
            );
        }

        if (payment == null || payment.getStatus() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Payment Service returned an invalid response"
            );
        }

        String orderStatus;

        if ("SUCCESS".equals(payment.getStatus())) {
            orderStatus = reduceStockForAllItems(orderId, orderItems);
        } else {
            orderStatus = PAYMENT_FAILED_STATUS;
        }

        Order order = new Order(
                orderId,
                orderItems,
                totalAmount,
                orderStatus
        );

        orders.add(order);
        return order;
    }

    private Map<Long, Integer> normalizeRequest(OrderRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order request is required");
        }

        List<OrderItemRequest> requestedItems;

        if (request.getItems() != null) {
            if (request.getProductId() != null || request.getQuantity() != null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Use either items or the single-product fields, not both"
                );
            }

            if (request.getItems().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order items must not be empty");
            }

            requestedItems = request.getItems();
        } else {
            if (request.getProductId() == null && request.getQuantity() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order items are required");
            }

            requestedItems = List.of(new OrderItemRequest(request.getProductId(), request.getQuantity()));
        }

        Map<Long, Integer> quantitiesByProduct = new LinkedHashMap<>();

        for (OrderItemRequest item : requestedItems) {
            if (item == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order item must not be null");
            }

            if (item.getProductId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product ID is required");
            }

            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than 0");
            }

            try {
                quantitiesByProduct.merge(item.getProductId(), item.getQuantity(), Math::addExact);
            } catch (ArithmeticException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Combined quantity is too large");
            }
        }

        return quantitiesByProduct;
    }

    private List<OrderItem> validateProductsAndCreateItems(Map<Long, Integer> requestedQuantities) {
        List<OrderItem> orderItems = new ArrayList<>();

        for (Map.Entry<Long, Integer> entry : requestedQuantities.entrySet()) {
            ProductResponse product;

            try {
                product = productClient.getProductById(entry.getKey())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Product " + entry.getKey() + " does not exist"
                        ));
            } catch (RestClientException exception) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Product Service is unavailable",
                        exception
                );
            }

            int quantity = entry.getValue();

            if (quantity > product.getStock()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Insufficient stock for product " + product.getId()
                );
            }

            BigDecimal unitPrice = product.getPrice().setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = unitPrice
                    .multiply(BigDecimal.valueOf(quantity))
                    .setScale(2, RoundingMode.HALF_UP);

            orderItems.add(new OrderItem(
                    product.getId(),
                    product.getName(),
                    quantity,
                    unitPrice,
                    lineTotal
            ));
        }

        return orderItems;
    }

    private String reduceStockForAllItems(long orderId, List<OrderItem> orderItems) {
        for (OrderItem item : orderItems) {
            try {
                productClient.reduceStock(item.getProductId(), item.getQuantity());
            } catch (RestClientException exception) {
                LOGGER.error(
                        "Payment succeeded for order {}, but stock reduction failed for product {}: {}",
                        orderId,
                        item.getProductId(),
                        exception.getMessage()
                );
                return INVENTORY_UPDATE_FAILED_STATUS;
            }
        }

        return CONFIRMED_STATUS;
    }

    public Optional<Order> getOrderById(Long id) {
        return orders.stream()
                .filter(order -> order.getId().equals(id))
                .findFirst();
    }

    public List<Order> getOrders() {
        return orders.stream()
                .sorted(Comparator.comparing(Order::getId).reversed())
                .toList();
    }
}
