CREATE SCHEMA IF NOT EXISTS order_service;

CREATE SEQUENCE order_service.order_id_sequence START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE order_service.order_item_id_sequence START WITH 1 INCREMENT BY 1;

CREATE TABLE order_service.orders (
    id BIGINT PRIMARY KEY,
    total_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(40) NOT NULL
);

CREATE TABLE order_service.order_items (
    id BIGINT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL,
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES order_service.orders (id)
        ON DELETE CASCADE
);
