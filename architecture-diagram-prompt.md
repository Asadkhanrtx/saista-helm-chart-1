# Prompt: Generate Application Architecture Diagram

---

Generate a detailed, clean, production-level **application architecture diagram** for the following system. The diagram must show all services, their internal responsibilities, how they communicate with each other, and the full database layer with table relationships. Do not include any cloud or infrastructure elements (no VPC, load balancers, subnets, DNS, SSL, or AWS services). This is a pure application-level architecture diagram.

---

## System Overview

**Saista Bakers** is a full-stack bakery e-commerce platform. Customers can browse products, build a cart, place orders, make payments, and receive invoice emails. Admins can manage products, view orders, and email customers. The backend is split into three independent microservices — each a separate Python FastAPI application — all sharing a single MySQL database. The frontend is a React single-page application that communicates with all three services via HTTP REST APIs.

---

## Component 1 — React Frontend (SPA)

- Built with **React 18** and **React Router DOM**
- Single-page application — all page transitions happen client-side without full page reloads
- Pages: Home, Intro, About, Gallery, Products, Cart, Payment, Custom Cake Order, My Orders, Login, Signup, Admin Login, Admin Dashboard
- Makes all API calls using **Axios** HTTP client
- After login, stores a **JWT token in localStorage** and sends it as a `Bearer` token in the `Authorization` header on every protected request
- Connects to three backend services using these base URL paths:
  - `/api/users` → User Service
  - `/api/orders` → Order Service
  - `/api/payment` → Payment Service
- The frontend does NOT talk to the database directly

---

## Component 2 — User Service (FastAPI, Port 5001)

This service owns **authentication, user management, and the product catalog**. It is also the **database schema owner** — it runs the migration script on startup that creates all tables and seeds initial data.

**Endpoints it exposes:**

Authentication:
- `POST /signup` — registers a new customer (hashes password with bcrypt, stores in users table)
- `POST /login` — validates credentials, returns a signed JWT (HS256 algorithm, shared SECRET_KEY)
- `POST /admin/login` — same as login but checks that the user's role is 'admin'
- `GET /profile` — returns logged-in user's profile (requires JWT)

Product Catalog:
- `GET /products` — returns all available products (optionally filtered by category)
- `GET /products/{id}` — returns a single product
- `GET /products/categories` — returns distinct category list

Admin Dashboard:
- `GET /admin/stats` — total orders, total revenue, total customers
- `GET /admin/orders` — all orders with user and item details
- `PUT /admin/orders/{id}/status` — update order status (pending → confirmed → completed → cancelled)
- `GET /admin/custom-orders` — all custom cake requests
- `GET /admin/customers` — list of all registered customers
- `POST /admin/email-customer` — sends an email to a specific customer via SMTP
- `GET /admin/products` — list all products
- `POST /admin/products` — add a new product
- `PUT /admin/products/{id}` — update a product
- `DELETE /admin/products/{id}` — remove a product

Internal cross-service endpoint:
- `GET /users/{user_id}` — returns user info for a given ID (called internally by other services)

**JWT:** All protected endpoints decode the JWT using the shared SECRET_KEY and extract user_id and role from the payload.

**Email:** Uses Python's smtplib with Gmail SMTP (port 587, STARTTLS) to send HTML emails to customers when admin triggers it.

**Database tables it reads/writes:** `users`, `products`, `orders`, `order_items`, `custom_orders`

---

## Component 3 — Order Service (FastAPI, Port 5002)

This service manages the **shopping cart, order lifecycle, and custom cake requests**.

**Endpoints it exposes:**

Cart:
- `POST /cart` — adds a product to the user's active cart (creates an order with status='cart' if none exists, then adds an order_item row)
- `GET /cart/{order_id}` — returns the cart contents with product details
- `DELETE /cart/{order_id}/item/{item_id}` — removes a specific item from the cart

Orders:
- `POST /order` — converts the cart into a real order (changes status from 'cart' to 'pending', saves delivery address and delivery date)
- `GET /orders` — returns all orders for the logged-in user
- `GET /orders/{order_id}` — returns a specific order with all its items

Custom Cake:
- `POST /custom-cake` — submits a custom cake request with pound size, flavour, description, and delivery date; auto-calculates an estimated price
- `GET /custom-cakes` — returns all custom cake orders for the logged-in user

Health:
- `GET /health` — database connectivity check

**JWT Validation:** This service does NOT call the User Service via HTTP for JWT verification. It shares the same SECRET_KEY and verifies the JWT locally using the same python-jose library.

**Database tables it reads/writes:** `orders`, `order_items`, `custom_orders`, `products` (read-only for product price lookup), `users` (read-only for user validation)

---

## Component 4 — Payment Service (FastAPI, Port 5003)

This service handles **payment processing and invoice generation**.

**Endpoints it exposes:**

- `POST /payment/pay` — processes a payment for a given order_id
  - Validates the order belongs to the user and has status='pending'
  - Accepts payment_mode: 'cod' (Cash on Delivery), 'card', or 'upi'
  - Generates a unique invoice number (format: SB-XXXXXXXX)
  - Updates the order's payment_mode, payment_status, and status='confirmed' in the database
  - Looks up the user's email from the users table directly (same shared DB)
  - Sends a branded HTML invoice email to the customer via SMTP
- `GET /payment/invoice/{order_id}` — retrieves the full invoice for an order including all line items

Health:
- `GET /health` — database connectivity check

**JWT Validation:** Same as Order Service — validates JWT locally using the shared SECRET_KEY. Does not call User Service via HTTP.

**Email:** Sends a richly formatted HTML invoice email containing order ID, invoice number, item list, total price, delivery address, delivery date, and payment method. Uses Gmail SMTP.

**Database tables it reads/writes:** `orders` (read + update status/payment fields), `order_items` (read), `products` (read for item names), `users` (read for email and username)

---

## Database Layer — Single MySQL Database

**Database name:** `saista_bakers`

All three backend services connect to this same database using the same credentials. There is no database-per-service isolation — all share the schema.

The User Service runs `migrate_db.py` on startup which:
1. Creates all tables using `CREATE TABLE IF NOT EXISTS`
2. Seeds one admin user (`asadadmin`, role='admin')
3. Seeds 5 initial products (chocolate cake, strawberry cake, vanilla cake, choco-chip cookies, oatmeal raisin cookies)

### Tables and their columns:

**users**
- `id` INT, AUTO_INCREMENT, PRIMARY KEY
- `username` VARCHAR(50), UNIQUE
- `email` VARCHAR(100), UNIQUE
- `password_hash` VARCHAR(255) — bcrypt hashed
- `full_name` VARCHAR(100)
- `role` VARCHAR(20), default 'customer' (can be 'admin')
- `created_at` TIMESTAMP

**products**
- `id` INT, AUTO_INCREMENT, PRIMARY KEY
- `name` VARCHAR(100)
- `description` TEXT
- `category` VARCHAR(50)
- `price` DECIMAL(10,2)
- `image_url` VARCHAR(255) — relative path e.g. /images/gallery/img1.jpeg
- `available` BOOLEAN, default TRUE

**orders**
- `id` INT, AUTO_INCREMENT, PRIMARY KEY
- `user_id` INT, FOREIGN KEY → users.id
- `total_price` DECIMAL(10,2)
- `status` VARCHAR(20) — lifecycle: 'cart' → 'pending' → 'confirmed' → 'completed' → 'cancelled'
- `delivery_address` TEXT
- `delivery_date` DATE
- `payment_mode` VARCHAR(50) — 'cod', 'card', or 'upi'
- `payment_status` VARCHAR(50) — 'unpaid', 'paid', or 'pending_cod'
- `invoice_sent` BOOLEAN, default FALSE
- `created_at` TIMESTAMP

**order_items**
- `id` INT, AUTO_INCREMENT, PRIMARY KEY
- `order_id` INT, FOREIGN KEY → orders.id
- `product_id` INT, FOREIGN KEY → products.id
- `quantity` INT
- `price_at_purchase` DECIMAL(10,2) — snapshot of price at time of adding to cart

**custom_orders**
- `id` INT, AUTO_INCREMENT, PRIMARY KEY
- `user_id` INT, FOREIGN KEY → users.id
- `pound` VARCHAR(20) — cake size in pounds
- `flavour` VARCHAR(50)
- `description` TEXT — customer's special instructions
- `estimated_price` DECIMAL(10,2) — auto-calculated
- `final_price` DECIMAL(10,2) — set by admin after review
- `delivery_date` DATE
- `status` VARCHAR(20) — 'pending', 'confirmed', 'completed'
- `created_at` TIMESTAMP

### Table Relationships:
- `orders.user_id` → `users.id` (one user has many orders)
- `order_items.order_id` → `orders.id` (one order has many items)
- `order_items.product_id` → `products.id` (each item references a product)
- `custom_orders.user_id` → `users.id` (one user has many custom orders)

---

## Inter-Service Communication Map

Draw arrows showing:

1. **React Frontend → User Service**
   - signup, login, admin login, get profile
   - get products, get categories, get single product
   - all admin endpoints (stats, orders, customers, products CRUD, email customer)

2. **React Frontend → Order Service**
   - add to cart, view cart, remove cart item
   - place order, view orders, view single order
   - create custom cake, view custom cakes

3. **React Frontend → Payment Service**
   - process payment (POST)
   - get invoice (GET)

4. **User Service → MySQL** (read + write all tables, schema owner)

5. **Order Service → MySQL** (read + write: orders, order_items, custom_orders; read-only: products, users)

6. **Payment Service → MySQL** (read + write: orders; read-only: order_items, products, users)

7. **Payment Service → Gmail SMTP** (sends invoice emails on payment)

8. **User Service → Gmail SMTP** (sends custom emails when admin triggers)

9. **JWT flow (internal, not a network call):**
   - User Service issues JWT on login
   - Order Service and Payment Service both verify the JWT using the shared SECRET_KEY — no HTTP call needed

---

## Key Data Flows to Highlight

**Flow 1 — Customer Purchase Journey:**
Browser → Login (User Service → users table → JWT issued) → Browse Products (User Service → products table) → Add to Cart (Order Service → creates orders row with status='cart' + order_items row) → Place Order (Order Service → status changes to 'pending') → Pay (Payment Service → validates order → updates status to 'confirmed' → sends invoice email via SMTP)

**Flow 2 — Admin Management:**
Browser → Admin Login (User Service → checks role='admin' → JWT with admin role) → View Stats (User Service → counts across orders, users tables) → Update Order Status (User Service → updates orders.status) → Email Customer (User Service → SMTP → customer's email)

**Flow 3 — Custom Cake Request:**
Browser → Submit Custom Cake (Order Service → custom_orders table → estimated_price calculated) → Admin reviews in dashboard (User Service → reads custom_orders) → Admin confirms and sets final_price

---

## Diagram Style Instructions

- Use a clean, modern style with a light background
- Group the three FastAPI services together in a "Backend Services" layer
- Show the MySQL database as a single block below the backend layer, with table names listed inside it
- Draw the React frontend at the top
- Show SMTP/Email as an external system on the side
- Use different arrow styles or colours to distinguish: frontend-to-service calls, service-to-database calls, service-to-SMTP calls, and JWT verification (can be a dashed arrow or annotation)
- Label every arrow with the method or action (e.g. POST /login, GET /products, INSERT order_items, etc.)
- Show the order status lifecycle (cart → pending → confirmed → completed) as a small state machine or annotation near the orders table
- Show the database foreign key relationships between tables