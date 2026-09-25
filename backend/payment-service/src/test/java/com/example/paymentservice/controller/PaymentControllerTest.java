package com.example.paymentservice.controller;

import com.example.paymentservice.model.Payment;
import com.example.paymentservice.model.PaymentRequest;
import com.example.paymentservice.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PaymentControllerTest {

    private PaymentController controller;

    @BeforeEach
    void setUp() {
        controller = new PaymentController(new PaymentService(false));
    }

    @Test
    void createsSuccessfulPayment() {
        ResponseEntity<Payment> response = controller.createPayment(
                new PaymentRequest(1L, new BigDecimal("159.98"))
        );

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("SUCCESS", response.getBody().getStatus());
        assertEquals(new BigDecimal("159.98"), response.getBody().getAmount());
    }

    @Test
    void createsSuccessfulPaymentForExpensivePositiveAmount() {
        ResponseEntity<Payment> response = controller.createPayment(
                new PaymentRequest(2L, new BigDecimal("1999.98"))
        );

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("SUCCESS", response.getBody().getStatus());
    }

    @Test
    void createsFailedPaymentWhenFailureSimulationIsEnabled() {
        PaymentController failureController = new PaymentController(new PaymentService(true));

        ResponseEntity<Payment> response = failureController.createPayment(
                new PaymentRequest(3L, new BigDecimal("159.98"))
        );

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("FAILED", response.getBody().getStatus());
    }

    @Test
    void rejectsInvalidAmount() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createPayment(new PaymentRequest(1L, BigDecimal.ZERO))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void getsExistingPayment() {
        Payment createdPayment = controller.createPayment(
                new PaymentRequest(1L, new BigDecimal("159.98"))
        ).getBody();

        ResponseEntity<Payment> response = controller.getPaymentById(createdPayment.getId());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(createdPayment.getId(), response.getBody().getId());
    }

    @Test
    void returnsNotFoundForUnknownPayment() {
        ResponseEntity<Payment> response = controller.getPaymentById(999L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
