package com.example.paymentservice.service;

import com.example.paymentservice.model.Payment;
import com.example.paymentservice.model.PaymentRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class PaymentService {

    private static final BigDecimal SUCCESS_LIMIT = new BigDecimal("1000");

    private final List<Payment> payments = new ArrayList<>();
    private final AtomicLong nextPaymentId = new AtomicLong(1);

    public Payment createPayment(PaymentRequest request) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than 0");
        }

        String status = request.getAmount().compareTo(SUCCESS_LIMIT) <= 0
                ? "SUCCESS"
                : "FAILED";

        Payment payment = new Payment(
                nextPaymentId.getAndIncrement(),
                request.getOrderId(),
                request.getAmount(),
                status
        );

        payments.add(payment);
        return payment;
    }

    public Optional<Payment> getPaymentById(Long id) {
        return payments.stream()
                .filter(payment -> payment.getId().equals(id))
                .findFirst();
    }
}
