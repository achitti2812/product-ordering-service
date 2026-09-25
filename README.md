# ReacSpi Product Ordering Service

A simple full-stack shopping project built to learn:

- Java
- Spring Boot
- React
- REST APIs
- Microservices
- Service-to-service communication

The project contains a React storefront and three independent backend Maven applications. PostgreSQL provides durable backend state, while the services continue communicating only through REST. The project avoids message brokers, authentication, service discovery, API gateways, and other unrelated infrastructure so that the core concepts remain easy to follow.

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

One PostgreSQL database
  |
  +--> product_service schema
  +--> order_service schema
  +--> payment_service schema
```

### React Frontend

- Displays a responsive e-commerce home page.
- Loads all product data from Product Service rather than duplicating it.
- Supports shareable product search and category filters.
- Includes dedicated product details routes.
- Includes a stock-aware shopping cart that persists in the browser.
- Provides a checkout and order-result flow backed by Order Service.
- Includes backend-powered order history and direct order details routes.
- Uses relevant remote product photography with a local fallback image.

### Product Service

- Owns product data and stock.
- Provides 50 sample products across five categories.
- Supports case-insensitive category filtering and product search.
- Persists catalog data and stock in the `product_service` schema.
- Reduces stock atomically after a successful payment, so concurrent requests cannot make stock negative.

### Order Service

- Coordinates an order containing one or more products.
- Calls Product Service to validate every product and its stock before payment.
- Calculates line totals and the complete order total with `BigDecimal`.
- Calls Payment Service once for the complete order total.
- Persists each order and all its items atomically in the `order_service` schema.

### Payment Service

- Simulates payment processing.
- Returns `SUCCESS` for every positive amount by default, including totals over `1000`.
- Can deterministically return `FAILED` when `payment.simulate-failure=true`.
- Rejects zero or negative amounts with `400 Bad Request`.
- Persists simulated payment records in the `payment_service` schema.

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
├── compose.yaml
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

All 50 catalog entries use fixed, product-relevant Unsplash image URLs rather than random image endpoints. Shared card, detail, cart, and checkout styles keep their crop and aspect ratio consistent. If a remote image cannot load, the frontend swaps it once for `frontend/public/product-placeholder.svg` instead of displaying a broken-image icon.

## Frontend Shopping Cart

The cart is available at:

```text
http://localhost:5173/cart
```

Products can be added from catalog cards or product details pages. Adding the same product again increases its quantity, while the header badge shows the total quantity across all cart items. The cart provides quantity controls, item subtotals, a cart subtotal, remove and clear actions, and prevents quantities from exceeding current product stock.

Cart data is stored under the versioned browser `localStorage` key `reacspi-cart-v1`, so it remains after a page refresh. When the cart page opens, it asks Product Service for current prices and stock and explains any item that needs attention. Adding products to the cart alone does not create orders or reduce inventory.

A backend restart does not automatically clear the browser cart. Clearing browser storage removes it. Because stored cart data can outlive backend data, checkout always revalidates current product availability and stock before creating an order.

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

This page fetches every order persisted by Order Service and displays newest orders first. Confirmed, failed-payment, and inventory-update-failed orders all remain visible, with distinct text and status styling. An empty history has a shopping action, while a service failure has a Retry action.

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
7. The order and its items are persisted with status `CONFIRMED`.
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
  "imageUrl": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?..."
}
```

### Order Service

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/orders` | Validate, pay for, and create an order |
| `GET` | `/orders` | Return all persisted orders, newest first |
| `GET` | `/orders/{id}` | Return one order |

An empty history returns `200 OK` with `[]`. Example history request:

```bash
curl -i http://localhost:8081/orders
```

Example newest-first response (the failed order assumes Payment Service failure simulation was enabled for that request):

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

Normal positive payments succeed. To test the failed-payment flow without relying on a hidden amount threshold, start Payment Service with failure simulation enabled:

```bash
mvn -f backend/payment-service/pom.xml spring-boot:run \
  -Dspring-boot.run.arguments=--payment.simulate-failure=true
```

Stop that process and start Payment Service normally again to disable failure simulation. The default is recorded in `backend/payment-service/src/main/resources/application.properties` as `payment.simulate-failure=false`.

## How to Run

Requirements:

- Java 17
- Maven
- Node.js and npm
- PostgreSQL 14+ (or Docker for the provided local PostgreSQL container)

### Local PostgreSQL

The three services share one physical database but use isolated schemas. Start the provided PostgreSQL-only development container from the repository root:

```bash
docker compose up -d postgres
```

The local defaults used by all three services are:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/reacspi
SPRING_DATASOURCE_USERNAME=reacspi
SPRING_DATASOURCE_PASSWORD=reacspi
```

These are development credentials only. The Compose file does not containerize the Java services. Flyway automatically creates the `product_service`, `order_service`, and `payment_service` schemas and their tables as the corresponding service starts. Hibernate validates those migrations instead of creating production tables itself.

If port `5432` is already in use, choose another host port and point the services to it:

```bash
POSTGRES_PORT=55432 docker compose up -d postgres
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:55432/reacspi
```

Run the Maven service commands from that same terminal, or set the datasource URL in each service terminal.

Install frontend dependencies once:

```bash
cd frontend
npm install
```

Start PostgreSQL and Product Service before the frontend so product data is available:

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
mvn -f backend/product-service/pom.xml spring-boot:run
```

Terminal 2 — Payment Service:

```bash
mvn -f backend/payment-service/pom.xml spring-boot:run
```

Terminal 3 — Order Service:

```bash
mvn -f backend/order-service/pom.xml spring-boot:run
```

## Example End-to-End Flow

Use a new local database or follow the manual reset instructions below if you need the original stock values before following this example.

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

The line totals are `159.98` and `49.99`. The order total is `209.97`; the single simulated payment succeeds and the order status is `CONFIRMED`.

3. Confirm that Headphones stock changed from `25` to `23` and Keyboard stock changed from `40` to `39`:

```bash
curl -i http://localhost:8080/products/2
curl -i http://localhost:8080/products/3
```

### Expensive order

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

The total is `1079.98`. It succeeds under the normal configuration, demonstrating that expensive positive orders are no longer rejected by a magic threshold.

6. Confirm that Laptop and Headphones stock were reduced after the confirmed order:

```bash
curl -i http://localhost:8080/products/1
curl -i http://localhost:8080/products/2
```

### Failed-payment mode

To exercise `PAYMENT_FAILED`, restart Payment Service with `payment.simulate-failure=true` using the command in the Payment Service section, then submit any valid positive order. Order Service stores the order as `PAYMENT_FAILED`, and Product Service stock remains unchanged. Restart Payment Service normally afterward to restore the default success behavior.

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
mvn -f backend/product-service/pom.xml clean verify
```

```bash
mvn -f backend/order-service/pom.xml clean verify
```

```bash
mvn -f backend/payment-service/pom.xml clean verify
```

Current test counts:

- React Frontend: 54 tests
- Product Service: 18 tests
- Order Service: 25 tests
- Payment Service: 6 tests

## Environment Configuration

Local development works without setting application environment variables after the provided PostgreSQL container is running. Spring and Vite use the localhost and development-database defaults below when no override is present.

All three backend services accept the same standard datasource variables:

| Variable | Local default | Production purpose |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/reacspi` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `reacspi` | PostgreSQL username |
| `SPRING_DATASOURCE_PASSWORD` | `reacspi` | PostgreSQL password |

For Neon, use the JDBC form of its connection string and retain SSL, for example `jdbc:postgresql://<neon-host>/<database>?sslmode=require`. Never commit the actual host credentials or password.

### Frontend

| Variable | Local default | Production purpose |
|---|---|---|
| `VITE_PRODUCT_API_URL` | `http://localhost:8080` | Public HTTPS URL for Product Service |
| `VITE_ORDER_API_URL` | `http://localhost:8081` | Public HTTPS URL for Order Service |

These Vite variables are read when the frontend is built. The frontend never calls Payment Service directly. Safe local examples are provided in `frontend/.env.example`; no real `.env` file is committed.

### Product Service

| Variable | Local default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port supplied or configured by the host |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Exact browser origin allowed by CORS |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/reacspi` | Shared PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `reacspi` | PostgreSQL username |
| `SPRING_DATASOURCE_PASSWORD` | `reacspi` | PostgreSQL password |

### Order Service

| Variable | Local default | Purpose |
|---|---|---|
| `PORT` | `8081` | HTTP port supplied or configured by the host |
| `PRODUCT_SERVICE_URL` | `http://localhost:8080` | Product Service base URL |
| `PAYMENT_SERVICE_URL` | `http://localhost:8082` | Payment Service base URL |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Exact browser origin allowed by CORS |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/reacspi` | Shared PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `reacspi` | PostgreSQL username |
| `SPRING_DATASOURCE_PASSWORD` | `reacspi` | PostgreSQL password |

### Payment Service

| Variable | Local default | Purpose |
|---|---|---|
| `PORT` | `8082` | HTTP port supplied or configured by the host |
| `PAYMENT_SIMULATE_FAILURE` | `false` | Set to `true` to return `FAILED` for positive demo payments |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/reacspi` | Shared PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `reacspi` | PostgreSQL username |
| `SPRING_DATASOURCE_PASSWORD` | `reacspi` | PostgreSQL password |

Changing `PAYMENT_SIMULATE_FAILURE` normally requires restarting or redeploying Payment Service. It is configuration only; there is no API for changing payment behavior at runtime.

## Resetting Demo Data

Backend data is persistent. Restarting or redeploying Product, Order, or Payment Service does **not** reset its data. There is deliberately no public reset API, admin endpoint, or reset button.

For local development only, stop the affected services and connect to PostgreSQL with `psql` or another SQL client. Run only the statements for the data you intend to reset:

```sql
-- Restore the original catalog on the next Product Service start.
TRUNCATE TABLE product_service.products;

-- Clear order history and restart its generated IDs.
TRUNCATE TABLE order_service.order_items, order_service.orders;
ALTER SEQUENCE order_service.order_item_id_sequence RESTART WITH 1;
ALTER SEQUENCE order_service.order_id_sequence RESTART WITH 1;

-- Clear payment history and restart its generated IDs.
TRUNCATE TABLE payment_service.payments;
ALTER SEQUENCE payment_service.payment_id_sequence RESTART WITH 1;
```

After the product table is truncated, restart Product Service. Its startup seeder inserts the canonical 50-product catalog only when that table is empty. On ordinary restarts the table is not empty, so existing stock is preserved and no catalog row is overwritten.

The frontend cart is separate from backend data because it is stored in browser `localStorage`. Refreshing the browser or restarting a backend service does not clear it. Clear the cart in the UI or clear browser storage when a fresh cart is needed; checkout will still revalidate the current Product Service stock.

## Deployment

Deployment is manual and has not been performed by this repository. The React frontend is prepared for Netlify. Each Spring Boot service remains an independent Maven application and now includes a provider-specific `Dockerfile.vercel` for Vercel container deployment. The Maven applications can still be deployed without Docker on another Java host.

Production uses one external PostgreSQL instance, such as Neon, with three service-owned schemas. Each service receives the same database connection credentials, runs only its own Flyway migration, and accesses only its own schema. Product and Order Service still communicate over REST; neither reads another service's tables.

```text
Netlify Frontend
  +--> Product Service (Vercel) --> PostgreSQL / product_service
  +--> Order Service (Vercel)   --> PostgreSQL / order_service
          +--> Product Service
          +--> Payment Service (Vercel) --> PostgreSQL / payment_service
```

Vercel detects a `Dockerfile.vercel` at a project's root, builds it as an OCI container image, and routes HTTP traffic to the server listening on `PORT`. Each backend service already reads `PORT` through Spring configuration, with its existing local port as the fallback. See Vercel's current [Docker container documentation](https://vercel.com/kb/guide/docker) and [monorepo documentation](https://vercel.com/docs/monorepos).

### Netlify settings

Import the existing GitHub repository in Netlify and configure:

| Setting | Value |
|---|---|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `dist` |

Set these production build environment variables after the backend URLs are available:

```text
VITE_PRODUCT_API_URL=<Product Service HTTPS URL>
VITE_ORDER_API_URL=<Order Service HTTPS URL>
```

`frontend/public/_redirects` provides the Netlify single-page-application rewrite, so refreshing routes such as `/products/2`, `/cart`, `/checkout`, `/orders`, or `/orders/1` serves `index.html` instead of returning a platform 404.

After Netlify provides the frontend HTTPS URL, set the following on both Product Service and Order Service, then restart or redeploy those services:

```text
FRONTEND_ORIGIN=<Netlify HTTPS URL>
```

Use the exact origin without a path. A wildcard origin is not configured.

### Generic backend settings

Deploy each backend directory as a separate service. A generic Maven build command is `mvn clean package`, and the packaged Spring Boot JAR can be started with `java -jar target/<service-name>-0.0.1-SNAPSHOT.jar`.

#### Product Service

- Root directory: `backend/product-service`
- Production variables:

```text
FRONTEND_ORIGIN=<Netlify HTTPS URL>
PORT=<provider-supplied or configured port, when necessary>
SPRING_DATASOURCE_URL=<Neon PostgreSQL JDBC URL with sslmode=require>
SPRING_DATASOURCE_USERNAME=<Neon username>
SPRING_DATASOURCE_PASSWORD=<Neon password>
```

#### Order Service

- Root directory: `backend/order-service`
- Production variables:

```text
PRODUCT_SERVICE_URL=<Product Service HTTPS URL>
PAYMENT_SERVICE_URL=<Payment Service HTTPS URL>
FRONTEND_ORIGIN=<Netlify HTTPS URL>
PORT=<provider-supplied or configured port, when necessary>
SPRING_DATASOURCE_URL=<Neon PostgreSQL JDBC URL with sslmode=require>
SPRING_DATASOURCE_USERNAME=<Neon username>
SPRING_DATASOURCE_PASSWORD=<Neon password>
```

#### Payment Service

- Root directory: `backend/payment-service`
- Production variables:

```text
PAYMENT_SIMULATE_FAILURE=false
PORT=<provider-supplied or configured port, when necessary>
SPRING_DATASOURCE_URL=<Neon PostgreSQL JDBC URL with sslmode=require>
SPRING_DATASOURCE_USERNAME=<Neon username>
SPRING_DATASOURCE_PASSWORD=<Neon password>
```

Payment Service does not need browser CORS because browsers never call it directly.

### Vercel backend settings

Import the same GitHub repository as three separate Vercel projects. In each project, set the **Root Directory** to the service directory shown below. Leave custom build and output commands unset so Vercel can detect the `Dockerfile.vercel` located at that project root.

Each Dockerfile uses its service directory as the complete Docker build context, builds the Spring Boot JAR with Maven and Java 17 in a build stage, then runs it on a Java 17 JRE image.

#### Product Service on Vercel

| Setting | Value |
|---|---|
| Root Directory | `backend/product-service` |
| Dockerfile detected | `Dockerfile.vercel` |

Environment variables:

```text
FRONTEND_ORIGIN=<Netlify HTTPS origin>
SPRING_DATASOURCE_URL=<Neon PostgreSQL JDBC URL with sslmode=require>
SPRING_DATASOURCE_USERNAME=<Neon username>
SPRING_DATASOURCE_PASSWORD=<Neon password>
```

The container defaults `PORT` to Vercel's standard container port `80`, and a Vercel project setting can override it. Running the service locally with Maven, outside the container, continues to default to port `8080`.

#### Payment Service on Vercel

| Setting | Value |
|---|---|
| Root Directory | `backend/payment-service` |
| Dockerfile detected | `Dockerfile.vercel` |

Environment variables:

```text
PAYMENT_SIMULATE_FAILURE=false
SPRING_DATASOURCE_URL=<Neon PostgreSQL JDBC URL with sslmode=require>
SPRING_DATASOURCE_USERNAME=<Neon username>
SPRING_DATASOURCE_PASSWORD=<Neon password>
```

The container defaults `PORT` to `80`, and a Vercel project setting can override it. Running the service locally with Maven continues to default to port `8082`.

#### Order Service on Vercel

| Setting | Value |
|---|---|
| Root Directory | `backend/order-service` |
| Dockerfile detected | `Dockerfile.vercel` |

Environment variables:

```text
PRODUCT_SERVICE_URL=<Product Service Vercel HTTPS URL>
PAYMENT_SERVICE_URL=<Payment Service Vercel HTTPS URL>
FRONTEND_ORIGIN=<Netlify HTTPS origin>
SPRING_DATASOURCE_URL=<Neon PostgreSQL JDBC URL with sslmode=require>
SPRING_DATASOURCE_USERNAME=<Neon username>
SPRING_DATASOURCE_PASSWORD=<Neon password>
```

Use base URLs without a trailing API path, for example `https://your-product-service.example`. The container defaults `PORT` to `80`, and a Vercel project setting can override it. Running the service locally with Maven continues to default to port `8081`.

To build the same images locally from the repository root:

```bash
docker build -f backend/product-service/Dockerfile.vercel \
  -t reacspi-product-service:vercel backend/product-service

docker build -f backend/payment-service/Dockerfile.vercel \
  -t reacspi-payment-service:vercel backend/payment-service

docker build -f backend/order-service/Dockerfile.vercel \
  -t reacspi-order-service:vercel backend/order-service
```

#### Vercel and persistent state

Vercel containers remain stateless, but all mutable backend state now lives in external PostgreSQL. Container replacement or multiple application instances therefore no longer resets catalog stock, orders, or payments. The PostgreSQL driver, JPA, and Flyway are packaged inside each Spring Boot JAR; the runtime images do not need PostgreSQL client tools.

### Manual deployment order

1. Create one Neon PostgreSQL database and copy its JDBC URL, username, and password. Ensure the JDBC URL includes `sslmode=require`.
2. Add the three `SPRING_DATASOURCE_*` variables to all three Vercel service projects.
3. Deploy Product Service from `backend/product-service`; Flyway creates `product_service` and the empty-table seeder inserts the 50 products.
4. Copy the Product Service public HTTPS URL.
5. Deploy Payment Service from `backend/payment-service` with `PAYMENT_SIMULATE_FAILURE=false`; Flyway creates `payment_service`.
6. Copy the Payment Service public HTTPS URL.
7. Deploy Order Service from `backend/order-service` with `PRODUCT_SERVICE_URL` and `PAYMENT_SERVICE_URL` set to those backend URLs; Flyway creates `order_service`.
8. Copy the Order Service public HTTPS URL.
9. Deploy `frontend` to Netlify with `VITE_PRODUCT_API_URL` and `VITE_ORDER_API_URL` set to the public backend URLs.
10. Copy the Netlify HTTPS URL, set `FRONTEND_ORIGIN` to that exact origin on Product Service and Order Service, and redeploy those two services.
11. Test catalog loading, checkout, persisted stock, order history, and payment retrieval. Restart/redeploy each backend once and confirm its records remain.

## Important Note

- Products and stock, orders and order items, and payments are persisted in one PostgreSQL database under three isolated schemas.
- Restarting or replacing a service does not reset its records. Product Service seeds the original 50 products only when its product table is empty.
- Flyway owns the database structure, and Hibernate uses `ddl-auto=validate` to detect mapping/migration mismatches.
- Order history is loaded from Order Service rather than persisted in the browser.
- Payment processing is simulated and does not contact a real payment provider. Positive amounts succeed by default; the explicit failure-simulation property exists only for testing failure handling.
- The frontend clears its cart only after an order response with status `CONFIRMED`.
- Order results are passed through router state and are not stored as order history. Refreshing `/order-result` therefore shows a no-result state.
- Order Service reads Product and Payment Service URLs from environment-backed Spring configuration.
- A payment succeeds before stock is reduced. If a later stock update fails, the order is stored as `INVENTORY_UPDATE_FAILED` and the problem is logged rather than reported as confirmed.
- A single product stock decrement is atomic, but multi-product stock updates still happen one item at a time. Without a distributed transaction or compensation workflow, an unexpected later update failure can leave payment recorded and earlier items reduced. This limitation is intentional for this learning project.
- The project is intentionally simple and does not demonstrate distributed transaction handling.
