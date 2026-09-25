# Product Ordering Service

A simple full-stack shopping project built to learn:

- Java
- Spring Boot
- React
- REST APIs
- Microservices
- Service-to-service communication

The project contains a React storefront and three independent backend Maven applications. It avoids databases, message brokers, authentication, service discovery, API gateways, and other production infrastructure so that the core concepts remain easy to follow.

## Architecture

```text
Browser
  |
  v
React Frontend :5173
  |
  +--> Product Service :8080
  |
  +--> Order Service :8081

Client
  |
  v
Order Service :8081
  |
  +--> Product Service :8080
  |
  +--> Payment Service :8082
```

### React Frontend

- Displays a responsive e-commerce home page.
- Loads all product data from Product Service rather than duplicating it.
- Supports shareable product search and category filters.
- Includes dedicated product details routes.
- Includes a stock-aware shopping cart that persists in the browser.
- Provides a checkout and order-result flow backed by Order Service.
- Includes backend-powered order history and direct order details routes.
- Keeps account functionality as an intentional placeholder.

### Product Service

- Owns product data and stock.
- Provides 50 sample products across five categories.
- Supports case-insensitive category filtering and product search.
- Reduces stock after a successful payment.

### Order Service

- Coordinates an order containing one or more products.
- Calls Product Service to validate every product and its stock before payment.
- Calculates line totals and the complete order total with `BigDecimal`.
- Calls Payment Service once for the complete order total.
- Stores the final order in memory.

### Payment Service

- Simulates payment processing.
- Returns `SUCCESS` when the amount is greater than `0` and at most `1000`.
- Returns `FAILED` when the amount is greater than `1000`.

## Project Structure

```text
product-ordering-service/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── test/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── product-service/
│   ├── order-service/
│   └── payment-service/
├── .gitignore
└── README.md
```

Each backend service has its own `pom.xml` and can be built or started independently.

## Frontend Product Browsing

Search and category selections are stored in the browser URL, so filtered catalog views can be refreshed, bookmarked, and shared:

```text
http://localhost:5173/?search=laptop
http://localhost:5173/?category=Fashion
http://localhost:5173/?category=Electronics&search=wireless
```

Selecting a product opens its dedicated route. The page fetches that product directly from Product Service, so refreshing the route also works:

```text
http://localhost:5173/products/2
```

Search is submitted with Enter or the search button. Category navigation and category cards use the same backend filters, and active filters can be cleared independently.

## Frontend Shopping Cart

The cart is available at:

```text
http://localhost:5173/cart
```

Products can be added from catalog cards or product details pages. Adding the same product again increases its quantity, while the header badge shows the total quantity across all cart items. The cart provides quantity controls, item subtotals, a cart subtotal, remove and clear actions, and prevents quantities from exceeding current product stock.

Cart data is stored under the versioned browser `localStorage` key `reacspi-cart-v1`, so it remains after a page refresh. When the cart page opens, it asks Product Service for current prices and stock and explains any item that needs attention. Adding products to the cart alone does not create orders or reduce inventory.

## Frontend Checkout

Checkout is available at:

```text
http://localhost:5173/checkout
```

The checkout page reviews the current cart and total. Product availability is checked again immediately before the frontend sends one multi-product request to Order Service. The request contains only product IDs and quantities; the backend remains responsible for current prices, totals, payment, and stock reduction.

After the backend responds, `/order-result` displays the returned order ID, items, total, and status:

- `CONFIRMED`: the cart is cleared and the header badge returns to zero.
- `PAYMENT_FAILED`: the cart is kept so it can be reviewed.
- `INVENTORY_UPDATE_FAILED`: the cart is kept, and the page warns against submitting the payment again.

If the browser loses the response to `POST /orders`, the result is ambiguous: the backend may have processed the order even though the browser did not receive confirmation. ReacSpi keeps the cart, does not retry automatically, and warns the user not to submit again until the result can be checked in order history. Payment remains simulated; checkout does not collect card, billing, or shipping information.

## Frontend Order History

The Orders header link opens:

```text
http://localhost:5173/orders
```

This page fetches every order currently held by Order Service and displays newest orders first. Confirmed, failed-payment, and inventory-update-failed orders all remain visible, with distinct text and status styling. An empty history has a shopping action, while a service failure has a Retry action.

Each order links to a refreshable details route such as:

```text
http://localhost:5173/orders/1
```

The details page independently requests `GET /orders/{id}` and shows all items, unit prices, line totals, the full total, and the current status message. Order history is never built from cart data or stored in browser localStorage.

## Order Flow

1. The client sends `POST /orders` to Order Service.
2. Order Service fetches every requested product from Product Service.
3. All products, quantities, and available stock are validated before payment.
4. Order Service calculates each line total and the complete order total.
5. Order Service calls Payment Service once for that complete total.
6. If payment succeeds, Order Service asks Product Service to reduce stock for every item.
7. The order is stored with status `CONFIRMED`.
8. If payment fails, stock is unchanged and the order is stored with status `PAYMENT_FAILED`.

All communication is synchronous HTTP using Spring `RestClient`.

## Services and Ports

| Service | Port |
|---|---:|
| React Frontend | 5173 |
| Product Service | 8080 |
| Order Service | 8081 |
| Payment Service | 8082 |

## API Endpoints

### Product Service

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/products` | Return all products |
| `GET` | `/products?category={category}` | Filter products by category |
| `GET` | `/products?search={text}` | Search product names and descriptions |
| `GET` | `/products/{id}` | Return one product |
| `PUT` | `/products/{id}/stock` | Reduce product stock |

The catalog contains 10 products in each category: `Electronics`, `Fashion`, `Home & Kitchen`, `Books`, and `Sports`. Category and search parameters can also be combined:

```bash
curl "http://localhost:8080/products?category=Electronics"
curl "http://localhost:8080/products?search=wireless"
curl "http://localhost:8080/products?category=Electronics&search=wireless"
```

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
  "description": "Wireless noise-isolating headphones with clear sound.",
  "category": "Electronics",
  "price": 79.99,
  "stock": 23,
  "imageUrl": "https://placehold.co/600x400?text=Headphones"
}
```

### Order Service

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/orders` | Validate, pay for, and create an order |
| `GET` | `/orders` | Return all in-memory orders, newest first |
| `GET` | `/orders/{id}` | Return one order |

An empty history returns `200 OK` with `[]`. Example history request:

```bash
curl -i http://localhost:8081/orders
```

Example newest-first response:

```json
[
  {
    "id": 2,
    "items": [
      {
        "productId": 1,
        "productName": "Laptop",
        "quantity": 1,
        "unitPrice": 999.99,
        "lineTotal": 999.99
      },
      {
        "productId": 2,
        "productName": "Headphones",
        "quantity": 1,
        "unitPrice": 79.99,
        "lineTotal": 79.99
      }
    ],
    "totalAmount": 1079.98,
    "status": "PAYMENT_FAILED"
  },
  {
    "id": 1,
    "items": [
      {
        "productId": 2,
        "productName": "Headphones",
        "quantity": 2,
        "unitPrice": 79.99,
        "lineTotal": 159.98
      },
      {
        "productId": 3,
        "productName": "Keyboard",
        "quantity": 1,
        "unitPrice": 49.99,
        "lineTotal": 49.99
      }
    ],
    "totalAmount": 209.97,
    "status": "CONFIRMED"
  }
]
```

Example multi-product order request:

```json
{
  "items": [
    {
      "productId": 2,
      "quantity": 2
    },
    {
      "productId": 3,
      "quantity": 1
    }
  ]
}
```

Example confirmed order:

```json
{
  "id": 1,
  "items": [
    {
      "productId": 2,
      "productName": "Headphones",
      "quantity": 2,
      "unitPrice": 79.99,
      "lineTotal": 159.98
    },
    {
      "productId": 3,
      "productName": "Keyboard",
      "quantity": 1,
      "unitPrice": 49.99,
      "lineTotal": 49.99
    }
  ],
  "totalAmount": 209.97,
  "status": "CONFIRMED"
}
```

The original single-product request remains supported for backward compatibility:

```json
{
  "productId": 2,
  "quantity": 2
}
```

Duplicate product IDs in `items` are combined into one order item before stock validation. A request must use either `items` or the original single-product fields, not both.

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
- Node.js and npm

Install frontend dependencies once:

```bash
cd frontend
npm install
```

Start Product Service before the frontend so product data is available:

```bash
mvn -f backend/product-service/pom.xml spring-boot:run
```

Then start the React development server in a separate terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. The frontend reads service addresses from `VITE_PRODUCT_API_URL` and `VITE_ORDER_API_URL`. Their local defaults are `http://localhost:8080` and `http://localhost:8081`. For local development, copy `frontend/.env.example` to `frontend/.env` if you want to override either default. Product Service, Payment Service, and Order Service must all be running to complete checkout.

### Running all backend services

Start each service in a separate terminal from the repository root. Start Product Service and Payment Service before Order Service.

Terminal 1 — Product Service:

```bash
cd backend/product-service
mvn spring-boot:run
```

Terminal 2 — Payment Service:

```bash
cd backend/payment-service
mvn spring-boot:run
```

Terminal 3 — Order Service:

```bash
cd backend/order-service
mvn spring-boot:run
```

## Example End-to-End Flow

Restart all services before following this example so the in-memory data begins with its original values.

### Successful order

1. Check that Headphones start with stock `25` and Keyboard starts with stock `40`:

```bash
curl -i http://localhost:8080/products/2
curl -i http://localhost:8080/products/3
```

2. Create one order for two Headphones and one Keyboard:

```bash
curl -i -X POST http://localhost:8081/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":2,"quantity":2},{"productId":3,"quantity":1}]}'
```

The line totals are `159.98` and `49.99`. The order total is `209.97`, so the single payment succeeds and the order status is `CONFIRMED`.

3. Confirm that Headphones stock changed from `25` to `23` and Keyboard stock changed from `40` to `39`:

```bash
curl -i http://localhost:8080/products/2
curl -i http://localhost:8080/products/3
```

### Failed-payment order

4. Check that Laptop starts with stock `10`:

```bash
curl -i http://localhost:8080/products/1
```

5. Create an order for one Laptop and one Headphones unit:

```bash
curl -i -X POST http://localhost:8081/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":1,"quantity":1},{"productId":2,"quantity":1}]}'
```

The total is `1079.98`, so the simulated payment fails and the order status is `PAYMENT_FAILED`.

6. Confirm that Laptop stock is still `10` and Headphones stock is unchanged:

```bash
curl -i http://localhost:8080/products/1
curl -i http://localhost:8080/products/2
```

### Invalid stock

This request is rejected before Payment Service is called because the requested Headphones quantity exceeds stock:

```bash
curl -i -X POST http://localhost:8081/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":2,"quantity":100},{"productId":3,"quantity":1}]}'
```

## Testing

Run the focused frontend tests and production build:

```bash
cd frontend
npm test
npm run build
```

Run each service's tests independently:

```bash
cd backend/product-service
mvn clean verify
```

```bash
cd backend/order-service
mvn clean verify
```

```bash
cd backend/payment-service
mvn clean verify
```

Current test counts:

- React Frontend: 51 tests
- Product Service: 15 tests
- Order Service: 24 tests
- Payment Service: 5 tests

## Important Note

- All products, orders, and payments are stored only in memory.
- Restarting a service resets that service's data and ID counters.
- Order history lasts only as long as Order Service remains running and is not persisted in the browser.
- Payment processing is simulated and does not contact a real payment provider.
- The frontend clears its cart only after an order response with status `CONFIRMED`.
- Order results are passed through router state and are not stored as order history. Refreshing `/order-result` therefore shows a no-result state.
- Order Service reads the local Product and Payment Service URLs from its `application.properties`.
- A payment succeeds before stock is reduced. If a later stock update fails, the order is stored as `INVENTORY_UPDATE_FAILED` and the problem is logged rather than reported as confirmed.
- Stock is updated one item at a time. Without a distributed transaction or compensation workflow, an unexpected later update failure can leave earlier items reduced. This limitation is intentional for this learning project.
- The project is intentionally simple and is not intended to demonstrate production infrastructure or distributed transaction handling.
