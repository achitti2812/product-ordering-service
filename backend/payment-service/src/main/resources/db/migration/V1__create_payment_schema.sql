CREATE SCHEMA IF NOT EXISTS payment_service;

CREATE SEQUENCE payment_service.payment_id_sequence START WITH 1 INCREMENT BY 1;

CREATE TABLE payment_service.payments (
    id BIGINT PRIMARY KEY,
    order_id BIGINT,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL
);
