CREATE SCHEMA IF NOT EXISTS product_service;

CREATE TABLE product_service.products (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    stock INTEGER NOT NULL CHECK (stock >= 0),
    image_url VARCHAR(1000) NOT NULL
);
