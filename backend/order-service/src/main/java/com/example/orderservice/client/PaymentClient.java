package com.example.orderservice.client;

import com.example.orderservice.model.PaymentRequest;
import com.example.orderservice.model.PaymentResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

@Component
public class PaymentClient {

    private final RestClient restClient;

    public PaymentClient(@Value("${payment-service.base-url}") String paymentServiceBaseUrl) {
        this.restClient = RestClient.create(paymentServiceBaseUrl);
    }

    public PaymentResponse createPayment(Long orderId, BigDecimal amount) {
        return restClient.post()
                .uri("/payments")
                .body(new PaymentRequest(orderId, amount))
                .retrieve()
                .body(PaymentResponse.class);
    }
}
