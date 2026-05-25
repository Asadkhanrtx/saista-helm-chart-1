from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.database import get_db_connection
from app.models import PaymentRequest
import os, smtplib, random, string
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter(prefix="/payment", tags=["payment"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:5001/login")
SECRET_KEY = os.getenv('SECRET_KEY', 'saista-bakers-secret-key-2024-production')
ALGORITHM = "HS256"


def get_current_user(token: str = Depends(oauth2_scheme)):
    exc = HTTPException(status_code=401, detail="Invalid credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise exc
        return {"user_id": int(user_id), "role": payload.get("role", "customer")}
    except JWTError:
        raise exc


def generate_invoice_number():
    return "SB-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


def send_invoice_email(to_email: str, username: str, order_data: dict, payment_mode: str, invoice_no: str):
    try:
        smtp_server = os.getenv('SMTP_SERVER', 'localhost')
        smtp_port = int(os.getenv('SMTP_PORT', 1025))
        sender = os.getenv('SENDER_EMAIL', 'noreply@saistabakers.com')
        smtp_user = os.getenv('SMTP_USER', '')
        smtp_pass = os.getenv('SMTP_PASSWORD', '')

        payment_labels = {"cod": "Cash on Delivery", "card": "Online - Card", "upi": "Online - UPI"}
        items_html = "".join([
            f"<tr><td style='padding:8px 12px;border-bottom:1px solid #f5f5f5'>{i['name']}</td>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #f5f5f5;text-align:center'>{i['quantity']}</td>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #f5f5f5;text-align:right'>Rs. {float(i['price'])*int(i['quantity']):.2f}</td></tr>"
            for i in order_data.get("items", [])
        ])

        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:20px;color:#333">
          <div style="background:linear-gradient(135deg,#f7cac9 0%,#a7d7c5 100%);padding:35px;border-radius:16px;text-align:center;margin-bottom:30px">
            <h1 style="font-family:Georgia,serif;color:#3d2b1f;margin:0;font-size:2.2rem">🎂 Saista Bakers</h1>
            <p style="color:#6b5044;margin:6px 0 0;font-size:1rem">Invoice & Order Confirmation</p>
          </div>

          <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin-bottom:20px;display:flex;justify-content:space-between">
            <div><p style="color:#aaa;font-size:0.8rem;margin:0">INVOICE NO</p><p style="font-weight:800;color:#333;margin:4px 0">{invoice_no}</p></div>
            <div><p style="color:#aaa;font-size:0.8rem;margin:0">DATE</p><p style="font-weight:800;color:#333;margin:4px 0">{datetime.now().strftime('%d %b %Y')}</p></div>
            <div><p style="color:#aaa;font-size:0.8rem;margin:0">ORDER ID</p><p style="font-weight:800;color:#333;margin:4px 0">#SA-{order_data['order_id']}</p></div>
          </div>

          <p>Dear <strong>{username}</strong>, thank you for your order! 🎉</p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
            <thead>
              <tr style="background:#f7cac9">
                <th style="padding:12px;text-align:left;color:#8b3a3a">Item</th>
                <th style="padding:12px;text-align:center;color:#8b3a3a">Qty</th>
                <th style="padding:12px;text-align:right;color:#8b3a3a">Amount</th>
              </tr>
            </thead>
            <tbody>{items_html}</tbody>
            <tfoot>
              <tr style="background:#fdfaf9">
                <td colspan="2" style="padding:14px 12px;font-weight:800;font-size:1.1rem">TOTAL</td>
                <td style="padding:14px 12px;text-align:right;font-weight:800;color:#d4af37;font-size:1.1rem">Rs. {order_data['total_price']:.2f}</td>
              </tr>
            </tfoot>
          </table>

          <div style="background:#e8f5f0;border-radius:12px;padding:18px;margin:20px 0;border-left:4px solid #a7d7c5">
            <h3 style="color:#3a9a82;margin:0 0 10px">📋 Order Details</h3>
            <p style="margin:4px 0"><strong>Payment Mode:</strong> {payment_labels.get(payment_mode, payment_mode)}</p>
            <p style="margin:4px 0"><strong>Payment Status:</strong> {"✅ Paid" if payment_mode != "cod" else "💵 Cash on Delivery"}</p>
            <p style="margin:4px 0"><strong>Delivery Address:</strong> {order_data.get('delivery_address', 'N/A')}</p>
            <p style="margin:4px 0"><strong>Delivery Date:</strong> {order_data.get('delivery_date', 'N/A')}</p>
          </div>

          {"<div style='background:#fff8e1;border-radius:12px;padding:18px;border-left:4px solid #ffd54f'><h4 style='color:#f9a825;margin:0 0 8px'>💵 COD Payment Instructions</h4><p style='margin:0;color:#666'>Please keep the exact amount ready at the time of delivery.<br>Our delivery person will collect Rs. " + str(order_data['total_price']) + " in cash.</p></div>" if payment_mode == 'cod' else ""}

          <hr style="border:none;border-top:1px solid #f0f0f0;margin:25px 0">
          <p style="color:#bbb;font-size:0.8rem;text-align:center">Saista Bakers | Crafted with Love ❤️<br>
          📞 7352710076 | 📸 @cakes_n_cookies_basket<br>
          Bhubaneswar: Swagat Vihar, Naharkanta, 751035 | Jamshedpur: HK Tower, 831006</p>
        </div>"""

        msg = MIMEMultipart('alternative')
        msg['From'] = sender
        msg['To'] = to_email
        msg['Subject'] = f"Invoice {invoice_no} - Order #SA-{order_data['order_id']} | Saista Bakers"
        msg.attach(MIMEText(body, 'html'))

        if smtp_port == 465:
            s = smtplib.SMTP_SSL(smtp_server, smtp_port)
        else:
            s = smtplib.SMTP(smtp_server, smtp_port)
            s.ehlo()
            if smtp_port == 587:
                s.starttls()
        if smtp_user and smtp_pass:
            s.login(smtp_user, smtp_pass)
        s.send_message(msg)
        s.quit()
        print(f"✓ Invoice email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False


@router.post("/pay")
def process_payment(req: PaymentRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Validate order belongs to user and is pending
        cur.execute("SELECT id, total_price, delivery_date, delivery_address FROM orders WHERE id=%s AND user_id=%s AND status='pending'",
            (req.order_id, user_id))
        order = cur.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found or already paid")

        order_id, total_price, delivery_date, delivery_address = order
        payment_status = "paid" if req.payment_mode in ("card", "upi") else "pending_cod"
        new_status = "confirmed" if req.payment_mode in ("card", "upi") else "confirmed"

        invoice_no = generate_invoice_number()

        # Update order
        cur.execute("UPDATE orders SET payment_mode=%s, payment_status=%s, status=%s WHERE id=%s",
            (req.payment_mode, payment_status, new_status, order_id))
        conn.commit()

        # Get order items for invoice
        cur.execute("""
            SELECT p.name, oi.quantity, oi.price_at_purchase
            FROM order_items oi JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id=%s
        """, (order_id,))
        items = [{"name": r[0], "quantity": r[1], "price": float(r[2])} for r in cur.fetchall()]

        # Get user email via direct DB lookup (loosely coupled - same DB different service)
        cur.execute("SELECT email, username FROM users WHERE id=%s", (user_id,))
        user_row = cur.fetchone()
        user_email = user_row[0] if user_row else None
        username = user_row[1] if user_row else "Customer"

        order_data = {
            "order_id": order_id,
            "total_price": float(total_price),
            "delivery_date": str(delivery_date) if delivery_date else None,
            "delivery_address": delivery_address,
            "items": items
        }

        email_sent = False
        if user_email:
            email_sent = send_invoice_email(user_email, username, order_data, req.payment_mode, invoice_no)

        return {
            "message": "Payment processed successfully",
            "invoice_number": invoice_no,
            "order_id": order_id,
            "payment_mode": req.payment_mode,
            "payment_status": payment_status,
            "total_paid": float(total_price),
            "email_sent": email_sent,
            "status": new_status
        }
    finally:
        cur.close(); conn.close()


@router.get("/invoice/{order_id}")
def get_invoice(order_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT o.id, o.total_price, o.status, o.payment_mode, o.payment_status,
                   o.delivery_date, o.delivery_address, u.username, u.email, u.full_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id=%s AND o.user_id=%s
        """, (order_id, user_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")
        cur.execute("""
            SELECT p.name, oi.quantity, oi.price_at_purchase
            FROM order_items oi JOIN products p ON oi.product_id=p.id
            WHERE oi.order_id=%s
        """, (order_id,))
        items = [{"name": r[0], "quantity": r[1], "price": float(r[2])} for r in cur.fetchall()]
        return {
            "order_id": row[0], "total_price": float(row[1] or 0),
            "status": row[2], "payment_mode": row[3], "payment_status": row[4],
            "delivery_date": str(row[5]) if row[5] else None,
            "delivery_address": row[6], "username": row[7],
            "email": row[8], "full_name": row[9], "items": items,
            "invoice_number": f"SB-{order_id:08d}"
        }
    finally:
        cur.close(); conn.close()
