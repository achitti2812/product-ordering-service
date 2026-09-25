package com.example.paymentservice.service;

import com.example.paymentservice.model.Payment;
import com.example.paymentservice.model.PaymentRequest;
import com.example.paymentservice.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final boolean simulateFailure;

    public PaymentService(
            PaymentRepository paymentRepository,
            @Value("${payment.simulate-failure:false}") boolean simulateFailure
    ) {
        this.paymentRepository = paymentRepository;
        this.simulateFailure = simulateFailure;
    }

    @Transactional
    public Payment createPayment(PaymentRequest request) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than 0");
        }

        String status = simulateFailure ? "FAILED" : "SUCCESS";

        Payment payment = new Payment(
                request.getOrderId(),
                request.getAmount(),
                status
        );

        return paymentRepository.save(payment);
    }

    @Transactional(readOnly = true)
    public Optional<Payment> getPaymentById(Long id) {
        return paymentRepository.findById(id);
    }
}
