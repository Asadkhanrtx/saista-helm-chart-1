# Saista Bakers — How the Application Works

A complete technical walkthrough of every component, every flow, and how they all connect.

---

## What This Application Is

Saista Bakers is a bakery e-commerce platform. Customers can sign up, browse cakes and cookies, add items to a cart, place an order, pay, and receive an invoice email. Admins can manage products, view and update orders, and email customers directly.

The application is split into **four parts**:

| Part | Technology | Runs on |
|------|-----------|---------|
| Frontend | React 18 (SPA) | Browser |
| User Service | Python FastAPI | Port 5001 |
| Order Service | Python FastAPI | Port 5002 |
| Payment Service | Python FastAPI | Port 5003 |
| Database | MySQL 8.0 | Port 3306 (RDS) |

All three backend services talk to **one shared MySQL database**. There is no separate database per service.

---

## The Database — What Gets Stored Where

Before understanding any flow, you need to know the database structure because everything eventually reads or writes here.

### `users` table
Stores every registered account.
```
id | username | email | password_hash | full_name | role | created_at
```
- `password_hash` — the actual password is never stored. It goes through **bcrypt** (a one-way hashing algorithm) before being saved. On login, bcrypt compares the entered password against the stored hash.
- `role` — either `'customer'` (default) or `'admin'`. This controls what someone can access.

### `products` table
The product catalog — cakes and cookies.
```
id | name | description | category | price | image_url | available
```
- `image_url` is a path like `/images/gallery/img1.jpeg` — this points to the static image files that Nginx serves from the frontend EC2.
- `available` — if set to FALSE, the product won't appear to customers.

### `orders` table
Every cart and every placed order is a row here. The difference between a cart and an order is just the `status` column.
```
id | user_id | total_price | status | delivery_address | delivery_date | payment_mode | payment_status | invoice_sent | created_at
```
- `status` lifecycle:
  ```
  'cart' → 'pending' → 'confirmed' → 'completed' → 'cancelled'
  ```
  When you add to cart, an order row is created with `status='cart'`.
  When you click Place Order, status becomes `'pending'`.
  When payment is processed, status becomes `'confirmed'`.

- `payment_mode` — `'cod'`, `'card'`, or `'upi'`
- `payment_status` — `'unpaid'`, `'paid'`, or `'pending_cod'`

### `order_items` table
Each product inside an order gets its own row here.
```
id | order_id | product_id | quantity | price_at_purchase
```
- `price_at_purchase` — the price is snapshotted when you add to cart. So if the admin changes a product's price later, your cart total doesn't change.

### `custom_orders` table
Custom cake requests (specific pound size, flavour, description).
```
id | user_id | pound | flavour | description | estimated_price | final_price | delivery_date | status | created_at
```
- `estimated_price` is auto-calculated by the Order Service based on pound size.
- `final_price` is set manually by the admin after reviewing the request.

---

## JWT — What It Is and How It Works Here

**JWT (JSON Web Token)** is how the application proves that a request is coming from a logged-in user without checking the database on every request.

### What a JWT looks like
A JWT is a string split into three parts by dots:
```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0Iiwicm9sZSI6ImN1c3RvbWVyIn0.xyz123
   HEADER                        PAYLOAD                          SIGNATURE
```
- **Header** — says what algorithm was used (HS256 in this app)
- **Payload** — contains `sub` (the user's ID) and `role` (customer or admin). This is readable by anyone — it is NOT encrypted, just encoded in Base64.
- **Signature** — the Header + Payload signed with the `SECRET_KEY`. This cannot be faked without knowing the key.

### The SECRET_KEY
All three backend services share the same `SECRET_KEY` (defined in their `.env` files):
```
SECRET_KEY=saista-bakers-secret-key-2024-production
```
This shared key is what allows Order Service and Payment Service to verify a token that was *issued* by User Service — without calling User Service at all.

### The JWT Flow

```
1. User logs in → POST /api/users/login
   User Service checks password → creates JWT:
   payload = { "sub": "4", "role": "customer" }
   signs it with SECRET_KEY → returns token

2. Browser receives token → stores in localStorage as 'authToken'

3. Every subsequent request from the browser includes:
   Authorization: Bearer eyJhbGci...

4. Order Service or Payment Service receives request
   → decodes JWT with same SECRET_KEY
   → reads user_id from payload
   → proceeds — no call to User Service needed

5. If token is missing, expired, or tampered:
   → Service returns HTTP 401 Unauthorized
   → Browser clears token, redirects to login
```

### JWT Expiry
The token does not have an explicit expiry set in the current implementation. Tokens persist in localStorage until the user clears browser data or logs out.

---

## The Four Components in Detail

### 1. React Frontend

The React app runs entirely in the browser. When you visit `saistabakers.com`, Nginx sends the browser a single HTML file plus a JavaScript bundle. React then takes over — all page changes (Products, Cart, Payment) happen without a full page reload. This is what "Single Page Application" means.

The frontend has one file that centralises all backend communication — `src/api/api.js`. It defines three Axios clients:

```
userAPI    → talks to /api/users  (User Service)
orderAPI   → talks to /api/orders (Order Service)
paymentAPI → talks to /api/payment (Payment Service)
adminAPI   → talks to /api/users  (still User Service, under /admin/* paths)
```

Every protected API call attaches the JWT from localStorage:
```javascript
headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
```

**Page → Service mapping:**

| Page | Service called | What it does |
|------|---------------|--------------|
| Signup | User Service | Creates user in DB |
| Login | User Service | Returns JWT |
| Products | User Service | Reads products table |
| Cart | Order Service | Reads/writes orders + order_items |
| Payment | Payment Service | Processes payment, sends email |
| Orders | Order Service | Reads orders for logged-in user |
| Custom Cake | Order Service | Writes to custom_orders table |
| Admin Dashboard | User Service | Stats, orders, customers, products CRUD |

---

### 2. User Service (Port 5001)

This is the most important service. It owns three things:
- **Authentication** (signup, login, JWT issuance)
- **Product catalog** (all product reads and admin writes)
- **Admin functionality** (dashboard stats, order management, customer emails)
- **Database schema ownership** — it runs `migrate_db.py` on startup, which creates all tables and seeds the first admin user and 5 products

**Password hashing flow:**
```
Signup:  password "Asad@1234" → bcrypt.hash() → "$2b$12$xyz..." → stored in DB
Login:   password "Asad@1234" → bcrypt.verify("Asad@1234", "$2b$12$xyz...") → True → issue JWT
```
The original password never touches the database.

**Admin user seeded by migration:**
```
username: asadadmin
password: Asad@1234
role:     admin
```

**What it reads/writes in the DB:**
- `users` — full read/write
- `products` — full read/write
- `orders` — read (for admin dashboard)
- `order_items` — read (for order details in admin)
- `custom_orders` — read (for admin dashboard)

---

### 3. Order Service (Port 5002)

Manages everything cart and order related. Has no admin functionality — customers only.

**How the cart works:**

When a customer adds the first item, the service does two things atomically:
1. Creates a row in `orders` table with `status='cart'` and `total_price=0`
2. Creates a row in `order_items` with the product_id, quantity, and current price

On every subsequent add-to-cart, it checks if an open cart (status='cart') already exists for that user. If yes, it adds a new `order_items` row to that same order. If no, it creates a new `orders` row.

**How order placement works:**

```
POST /order → { order_id, delivery_address, delivery_date }

Service does:
1. Finds the orders row with that id and status='cart'
2. Calculates total_price by summing (quantity × price_at_purchase) for all order_items
3. Updates orders row:
   - status: 'cart' → 'pending'
   - delivery_address: saved
   - delivery_date: saved
   - total_price: calculated
4. Returns the updated order
```

The order is now sitting at `status='pending'` waiting for payment.

**JWT verification (local):**
```python
# It does NOT call User Service
# It uses the shared SECRET_KEY to verify locally:
payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
user_id = payload["sub"]  # extracted from token directly
```

**What it reads/writes in the DB:**
- `orders` — full read/write
- `order_items` — full read/write
- `custom_orders` — full read/write
- `products` — read only (to get price at time of add-to-cart)
- `users` — read only (implicit through user_id in JWT)

---

### 4. Payment Service (Port 5003)

Handles the final step of the purchase. Three payment modes are supported:

| Mode | What happens |
|------|-------------|
| `card` | payment_status = 'paid' immediately |
| `upi` | payment_status = 'paid' immediately |
| `cod` | payment_status = 'pending_cod' — payment collected on delivery |

**What happens on POST /payment/pay:**
```
1. Validate JWT → extract user_id
2. Find the order in DB:
   - Must belong to this user_id
   - Must have status='pending' (not 'cart', not already 'confirmed')
3. Generate invoice number: "SB-" + 8 random alphanumeric chars → e.g. SB-AX73KP2Q
4. Update the orders row:
   - payment_mode: 'cod' / 'card' / 'upi'
   - payment_status: 'paid' or 'pending_cod'
   - status: 'confirmed'
5. Fetch order_items with product names (JOIN with products table)
6. Fetch user's email from users table (direct DB read — no HTTP call to User Service)
7. Send invoice email via SMTP
8. Return invoice details to frontend
```

**What it reads/writes in the DB:**
- `orders` — reads to validate, writes status/payment fields
- `order_items` — read (to build invoice line items)
- `products` — read (to get product names for invoice)
- `users` — read (to get email address to send invoice to)

---

## SMTP — How Email Works

Both User Service and Payment Service send emails. Here is exactly how:

**Library used:** Python's built-in `smtplib` + `email.mime` — no third-party email library.

**SMTP server used:** Gmail (`smtp.gmail.com`, port 587)

**Authentication:** Gmail App Password — this is a 16-character password generated specifically for this app from your Google account. It is NOT your regular Gmail password. You generated it at Google Account → Security → App Passwords.

**Connection flow for every email sent:**
```
1. Open TCP connection to smtp.gmail.com:587
2. Send EHLO (introduce ourselves to the mail server)
3. Upgrade to encrypted connection via STARTTLS
4. Login with:   SMTP_USER=asadchamp109@gmail.com
                 SMTP_PASSWORD=zjkgouwcksgbyndq  (app password)
5. Send the email message
6. Close the connection
```

This connection is opened and closed fresh for every single email — there is no persistent connection pool.

**What the invoice email contains:**
- Saista Bakers branding header (pink-to-green gradient)
- Invoice number (e.g. SB-AX73KP2Q)
- Order date
- Order ID
- Line item table: product name | quantity | amount
- Total amount
- Payment mode and payment status
- Delivery address and delivery date
- COD instructions (if payment mode is cod)
- Contact info (phone, Instagram, address)

This HTML is built as a Python string inside the Payment Service and sent as `Content-Type: text/html`.

**Admin email (User Service):**
When an admin goes to the Admin Dashboard and clicks "Email Customer", they type a subject and message body. The User Service takes that text, wraps it in a simple email, and sends it via the same SMTP connection flow above. No invoice — just a plain message to the customer.

---

## The Complete Customer Journey (End to End)

### Step 1 — Signup
```
Browser → POST /api/users/signup
  Body: { username, email, password, full_name }

User Service:
  1. Checks if username or email already exists in users table
  2. Hashes the password with bcrypt
  3. INSERTs new row into users table (role='customer')
  4. Returns success

Browser: shows "signup successful", redirects to login
```

### Step 2 — Login
```
Browser → POST /api/users/login
  Body: { username, password }

User Service:
  1. SELECTs user WHERE username=?
  2. bcrypt.verify(entered_password, stored_hash) → True
  3. Creates JWT:
     payload = { sub: user.id, role: "customer" }
     token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
  4. Returns { access_token: "eyJ...", token_type: "bearer" }

Browser:
  localStorage.setItem('authToken', 'eyJ...')
  Redirects to home page
```

### Step 3 — Browse Products
```
Browser → GET /api/users/products
  (No auth header needed — products are public)

User Service:
  SELECT * FROM products WHERE available=TRUE

Returns array of products with name, price, category, image_url
```

### Step 4 — Add to Cart
```
Browser → POST /api/orders/cart
  Headers: { Authorization: Bearer eyJ... }
  Body: { product_id: 1, quantity: 2 }

Order Service:
  1. Decodes JWT → user_id = 4
  2. Checks: does user 4 have an open order with status='cart'?
     → No: INSERT into orders { user_id:4, status:'cart', total_price:0 }
     → Yes: use that existing order's id
  3. SELECT price FROM products WHERE id=1 → 450.00
  4. INSERT into order_items { order_id, product_id:1, quantity:2, price_at_purchase:450.00 }

Returns: { cart_id: 12, message: "Added to cart" }
```

### Step 5 — Place Order
```
Browser → POST /api/orders/order
  Headers: { Authorization: Bearer eyJ... }
  Body: { order_id: 12, delivery_address: "123 MG Road", delivery_date: "2026-06-10" }

Order Service:
  1. Decodes JWT → user_id = 4
  2. SELECT * FROM orders WHERE id=12 AND user_id=4 AND status='cart' → found
  3. SELECT SUM(quantity * price_at_purchase) FROM order_items WHERE order_id=12 → 900.00
  4. UPDATE orders SET
       status='pending',
       total_price=900.00,
       delivery_address='123 MG Road',
       delivery_date='2026-06-10'
     WHERE id=12

Returns: { order_id: 12, total_price: 900.00, status: 'pending' }
```

### Step 6 — Pay
```
Browser → POST /api/payment/payment/pay
  Headers: { Authorization: Bearer eyJ... }
  Body: { order_id: 12, payment_mode: "upi" }

Payment Service:
  1. Decodes JWT → user_id = 4
  2. SELECT * FROM orders WHERE id=12 AND user_id=4 AND status='pending' → found
  3. invoice_no = "SB-" + random 8 chars → "SB-AX73KP2Q"
  4. UPDATE orders SET
       payment_mode='upi',
       payment_status='paid',
       status='confirmed'
     WHERE id=12
  5. SELECT oi.quantity, oi.price_at_purchase, p.name
     FROM order_items oi JOIN products p ON oi.product_id=p.id
     WHERE oi.order_id=12
     → [{ name:'Signature Chocolate Cake', quantity:2, price:450.00 }]
  6. SELECT email, username FROM users WHERE id=4
     → { email:'customer@gmail.com', username:'testuser' }
  7. Build HTML invoice → send via Gmail SMTP
  8. Return { invoice_number:'SB-AX73KP2Q', total_paid:900.00, status:'confirmed', email_sent:true }
```

### Step 7 — Customer receives invoice email
```
Gmail SMTP delivers HTML email to customer@gmail.com
Contains:
  Invoice No: SB-AX73KP2Q
  Order #SA-12
  Item: Signature Chocolate Cake × 2 = Rs. 900.00
  Total: Rs. 900.00
  Payment: Online - UPI (Paid)
  Delivery: 123 MG Road | 2026-06-10
```

---

## The Admin Journey

### Admin Login
```
Browser → POST /api/users/admin/login
  Body: { username: "asadadmin", password: "Asad@1234" }

User Service:
  1. Finds user, verifies bcrypt hash
  2. Checks: user.role == 'admin' → True
  3. Issues JWT with { sub: 1, role: "admin" }

Every admin endpoint then checks:
  if payload["role"] != "admin": raise HTTP 403 Forbidden
```

### Admin Updates Order Status
```
Browser → PUT /api/users/admin/orders/12/status
  Headers: { Authorization: Bearer admin-jwt }
  Body: { status: "completed" }

User Service:
  1. Decodes JWT → checks role='admin'
  2. UPDATE orders SET status='completed' WHERE id=12
```

### Admin Emails a Customer
```
Browser → POST /api/users/admin/email-customer
  Body: { customer_id: 4, subject: "Your order update", message: "Your cake is ready!" }

User Service:
  1. SELECT email FROM users WHERE id=4
  2. Opens connection to smtp.gmail.com:587
  3. Sends email to customer's address
  4. Returns { email_sent: true }
```

---

## How the Three Services Talk to Each Other

This is a common question. The short answer: **they mostly don't talk to each other at runtime.**

| Who | Calls Who | How | Why |
|-----|----------|-----|-----|
| Order Service | User Service | ❌ Does NOT call | JWT verified locally with shared key |
| Payment Service | User Service | ❌ Does NOT call | JWT verified locally + DB used for user email lookup |
| Payment Service | Order Service | ❌ Does NOT call | Reads order data directly from shared DB |
| All services | MySQL DB | ✅ Direct TCP | Each has its own connection pool |
| User Service | Gmail SMTP | ✅ TCP port 587 | Admin email feature |
| Payment Service | Gmail SMTP | ✅ TCP port 587 | Invoice emails on payment |

The only inter-service dependency is the **shared SECRET_KEY** for JWT. As long as all three `.env` files have the same SECRET_KEY value, each service can independently verify any token — no HTTP round-trip needed.

---

## Request Path (What Actually Happens When Browser Makes a Call)

```
Browser makes:  GET /api/users/products

→  DNS resolves saistabakers.com to ALB IP
→  ALB receives request on port 80
→  ALB checks path: /api/* matches Priority 1 rule
→  ALB forwards to Backend Target Group → Backend EC2 (round-robin between EC2-1 and EC2-2)
→  Nginx on Backend EC2 receives request on port 80
→  Nginx matches: /api/users/* → strips prefix → proxies to localhost:5001/products
→  User Service FastAPI handles GET /products
→  Queries MySQL: SELECT * FROM products WHERE available=TRUE
→  Returns JSON array
→  Response travels back: FastAPI → Nginx → ALB → Browser
```

Total network hops: Browser → ALB → EC2 Nginx → FastAPI → MySQL → back

---

## Port and Endpoint Quick Reference

| Service | Port | Key Endpoints |
|---------|------|--------------|
| User Service | 5001 | POST /signup, POST /login, GET /products, GET /admin/stats |
| Order Service | 5002 | POST /cart, POST /order, GET /orders, POST /custom-cake |
| Payment Service | 5003 | POST /payment/pay, GET /payment/invoice/{id} |
| MySQL (RDS) | 3306 | All services connect here |
| Gmail SMTP | 587 | User Service + Payment Service send emails here |

| Frontend Route | What it shows |
|---------------|--------------|
| `/` | Intro / landing page |
| `/home` | Home with featured products |
| `/products` | Full product catalog |
| `/cart` | Shopping cart |
| `/payment/:orderId` | Payment page for a specific order |
| `/orders` | Customer's order history |
| `/custom-cake` | Custom cake order form |
| `/gallery` | Photo gallery |
| `/about` | About page |
| `/login` `/signup` | Auth pages |
| `/admin/login` | Admin login |
| `/admin` | Admin dashboard |

---

## Summary

```
Browser (React SPA)
    │
    ├── /api/users/*  ──► User Service (:5001)
    │                         │  Issues JWT on login
    │                         │  Owns products catalog
    │                         │  Admin dashboard
    │                         │  Sends admin emails (SMTP)
    │                         │
    ├── /api/orders/* ──► Order Service (:5002)
    │                         │  Cart management
    │                         │  Order placement
    │                         │  Custom cake requests
    │                         │
    └── /api/payment/*──► Payment Service (:5003)
                              │  Payment processing
                              │  Invoice generation
                              │  Sends invoice emails (SMTP)
                              │
                    ┌─────────▼──────────┐
                    │   MySQL Database   │
                    │  (saista_bakers)   │
                    │                   │
                    │  users            │
                    │  products         │
                    │  orders           │
                    │  order_items      │
                    │  custom_orders    │
                    └───────────────────┘

JWT: issued by User Service, verified locally by all three services using shared SECRET_KEY
SMTP: Gmail port 587 — used by User Service (admin emails) and Payment Service (invoices)
```