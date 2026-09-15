package com.example.orderservice.service;

import com.example.orderservice.client.PaymentClient;
import com.example.orderservice.client.ProductClient;
import com.example.orderservice.model.Order;
import com.example.orderservice.model.OrderRequest;
import com.example.orderservice.model.PaymentResponse;
import com.example.orderservice.model.ProductResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class OrderService {

    private static final String CONFIRMED_STATUS = "CONFIRMED";
    private static final String PAYMENT_FAILED_STATUS = "PAYMENT_FAILED";

    private final ProductClient productClient;
    private final PaymentClient paymentClient;
    private final List<Order> orders = new ArrayList<>();
    private final AtomicLong nextOrderId = new AtomicLong(1);

    public OrderService(ProductClient productClient, PaymentClient paymentClient) {
        this.productClient = productClient;
        this.paymentClient = paymentClient;
    }

    public Order createOrder(OrderRequest request) {
        if (request.getProductId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product ID is required");
        }

        if (request.getQuantity() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than 0");
        }

        ProductResponse product = productClient.getProductById(request.getProductId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Product does not exist"
                ));

        if (request.getQuantity() > product.getStock()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient product stock");
        }

        BigDecimal totalAmount = product.getPrice()
                .multiply(BigDecimal.valueOf(request.getQuantity()));

        long orderId = nextOrderId.getAndIncrement();
        PaymentResponse payment = paymentClient.createPayment(orderId, totalAmount);
        String orderStatus = "SUCCESS".equals(payment.getStatus())
                ? CONFIRMED_STATUS
                : PAYMENT_FAILED_STATUS;

        Order order = new Order(
                orderId,
                product.getId(),
                request.getQuantity(),
                totalAmount,
                orderStatus
        );

        orders.add(order);
        return order;
    }

    public Optional<Order> getOrderById(Long id) {
        return orders.stream()
                .filter(order -> order.getId().equals(id))
                .findFirst();
    }
}
