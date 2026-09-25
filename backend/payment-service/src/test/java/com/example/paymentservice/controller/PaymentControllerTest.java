package com.example.paymentservice.controller;

import com.example.paymentservice.model.Payment;
import com.example.paymentservice.model.PaymentRequest;
import com.example.paymentservice.repository.PaymentRepository;
import com.example.paymentservice.service.PaymentService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@Transactional
class PaymentControllerTest {

    @Autowired
    private PaymentController controller;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private EntityManager entityManager;

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
    void createsAndPersistsFailedPaymentWhenFailureSimulationIsEnabled() {
        PaymentController failureController = new PaymentController(
                new PaymentService(paymentRepository, true)
        );

        Payment createdPayment = failureController.createPayment(
                new PaymentRequest(3L, new BigDecimal("159.98"))
        ).getBody();
        assertNotNull(createdPayment);

        paymentRepository.flush();
        entityManager.clear();

        Payment persistedPayment = failureController.getPaymentById(createdPayment.getId()).getBody();
        assertNotNull(persistedPayment);
        assertEquals("FAILED", persistedPayment.getStatus());
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
    void getsExistingPaymentFromDatabase() {
        Payment createdPayment = controller.createPayment(
                new PaymentRequest(1L, new BigDecimal("159.98"))
        ).getBody();
        assertNotNull(createdPayment);

        paymentRepository.flush();
        entityManager.clear();

        ResponseEntity<Payment> response = controller.getPaymentById(createdPayment.getId());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(createdPayment.getId(), response.getBody().getId());
        assertEquals(new BigDecimal("159.98"), response.getBody().getAmount());
    }

    @Test
    void returnsNotFoundForUnknownPayment() {
        ResponseEntity<Payment> response = controller.getPaymentById(999L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
