# Product Ordering Service

A simple microservices-based backend project built to learn:

- Java
- Spring Boot
- REST APIs
- Microservices
- Service-to-service communication

The project contains three independent Maven applications. It intentionally avoids databases, message brokers, authentication, service discovery, API gateways, and other production infrastructure so that the core concepts remain easy to follow.

## Architecture

```text
Client
  |
  v
Order Service :8081
  |
  +--> Product Service :8080
  |
  +--> Payment Service :8082
```

### Product Service

- Owns product data and stock.
- Returns products and current stock levels.
- Reduces stock after a successful payment.

### Order Service

- Coordinates the complete ordering process.
- Calls Product Service to validate products and stock.
- Calls Payment Service to process a simulated payment.
- Stores the final order in memory.

### Payment Service

- Simulates payment processing.
- Returns `SUCCESS` when the amount is greater than `0` and at most `1000`.
- Returns `FAILED` when the amount is greater than `1000`.

## Project Structure

```text
product-ordering-service/
├── product-service/
├── order-service/
├── payment-service/
├── .gitignore
└── README.md
```

Each service has its own `pom.xml` and can be built or started independently.

## Order Flow

1. The client sends `POST /orders` to Order Service.
2. Order Service calls Product Service.
3. The product, requested quantity, and available stock are validated.
4. Order Service calculates the total amount.
5. Order Service calls Payment Service.
6. If payment succeeds, Order Service asks Product Service to reduce the stock.
7. The order is stored with status `CONFIRMED`.
8. If payment fails, stock is unchanged and the order is stored with status `PAYMENT_FAILED`.

All communication is synchronous HTTP using Spring `RestClient`.

## Services and Ports

| Service | Port |
|---|---:|
| Product Service | 8080 |
| Order Service | 8081 |
| Payment Service | 8082 |

## API Endpoints

### Product Service

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/products` | Return all products |
| `GET` | `/products/{id}` | Return one product |
| `PUT` | `/products/{id}/stock` | Reduce product stock |

Example stock request:

```bash
curl -i -X PUT http://localhost:8080/products/2/stock \
  -H "Content-Type: application/json" \
  -d '{"quantity":2}'
```

Example updated product:

```json
{
  "id": 2,
  "name": "Headphones",
  "price": 79.99,
  "stock": 23
}
```

### Order Service

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/orders` | Validate, pay for, and create an order |
| `GET` | `/orders/{id}` | Return one order |

Example order request:

```json
{
  "productId": 2,
  "quantity": 2
}
```

Example confirmed order:

```json
{
  "id": 1,
  "productId": 2,
  "quantity": 2,
  "totalAmount": 159.98,
  "status": "CONFIRMED"
}
```

### Payment Service

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/payments` | Create a simulated payment |
| `GET` | `/payments/{id}` | Return one payment |

Example payment request:

```json
{
  "orderId": 1,
  "amount": 159.98
}
```

Example payment response:

```json
{
  "id": 1,
  "orderId": 1,
  "amount": 159.98,
  "status": "SUCCESS"
}
```

## How to Run

Requirements:

- Java 17
- Maven

Start each service in a separate terminal from the repository root. Start Product Service and Payment Service before Order Service.

Terminal 1 — Product Service:

```bash
cd product-service
mvn spring-boot:run
```

Terminal 2 — Payment Service:

```bash
cd payment-service
mvn spring-boot:run
```

Terminal 3 — Order Service:

```bash
cd order-service
mvn spring-boot:run
```

## Example End-to-End Flow

Restart all services before following this example so the in-memory data begins with its original values.

### Successful order

1. Check that Headphones start with stock `25`:

```bash
curl -i http://localhost:8080/products/2
```

2. Create an order for two Headphones:

```bash
curl -i -X POST http://localhost:8081/orders \
  -H "Content-Type: application/json" \
  -d '{"productId":2,"quantity":2}'
```

The total is `159.98`, so payment succeeds and the order status is `CONFIRMED`.

3. Confirm that Headphones stock was reduced from `25` to `23`:

```bash
curl -i http://localhost:8080/products/2
```

### Failed-payment order

4. Check that Laptop starts with stock `10`:

```bash
curl -i http://localhost:8080/products/1
```

5. Create an order for two Laptops:

```bash
curl -i -X POST http://localhost:8081/orders \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":2}'
```

The total is `1999.98`, so the simulated payment fails and the order status is `PAYMENT_FAILED`.

6. Confirm that Laptop stock is still `10`:

```bash
curl -i http://localhost:8080/products/1
```

## Testing

Run each service's tests independently:

```bash
cd product-service
mvn clean verify
```

```bash
cd order-service
mvn clean verify
```

```bash
cd payment-service
mvn clean verify
```

Current test counts:

- Product Service: 7 tests
- Order Service: 7 tests
- Payment Service: 5 tests

## Important Note

- All products, orders, and payments are stored only in memory.
- Restarting a service resets that service's data and ID counters.
- Payment processing is simulated and does not contact a real payment provider.
- Order Service reads the local Product and Payment Service URLs from its `application.properties`.
- The project is intentionally simple and is not intended to demonstrate production infrastructure or distributed transaction handling.
