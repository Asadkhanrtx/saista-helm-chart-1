from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db_connection
from app.models import OrderPlace
from app.routes import get_current_user

router = APIRouter(tags=["orders"])


@router.post("/order", status_code=201)
def place_order(req: OrderPlace, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM orders WHERE id=%s AND user_id=%s AND status='cart'", (req.order_id, user_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Cart not found")

        cur.execute("SELECT SUM(quantity * price_at_purchase) FROM order_items WHERE order_id=%s", (req.order_id,))
        total = cur.fetchone()[0]
        if not total:
            raise HTTPException(status_code=400, detail="Cart is empty")

        cur.execute("""
            UPDATE orders SET status='pending', total_price=%s,
            delivery_address=%s, delivery_date=%s
            WHERE id=%s
        """, (total, req.delivery_address, req.delivery_date, req.order_id))
        conn.commit()
        return {
            "message": "Order placed",
            "order_id": req.order_id,
            "total_price": float(total),
            "status": "pending"
        }
    finally:
        cur.close(); conn.close()


@router.get("/orders")
def get_orders(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, total_price, status, delivery_date, delivery_address,
                   payment_mode, payment_status, created_at
            FROM orders
            WHERE user_id=%s AND status != 'cart'
            ORDER BY created_at DESC
        """, (user_id,))
        rows = cur.fetchall()
        return {"orders": [
            {
                "id": r[0], "total_price": float(r[1] or 0),
                "status": r[2], "delivery_date": str(r[3]) if r[3] else None,
                "delivery_address": r[4], "payment_mode": r[5],
                "payment_status": r[6], "created_at": str(r[7])
            } for r in rows
        ]}
    finally:
        cur.close(); conn.close()


@router.get("/orders/{order_id}")
def get_order(order_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, total_price, status, delivery_date, delivery_address,
                   payment_mode, payment_status, created_at
            FROM orders WHERE id=%s AND user_id=%s AND status != 'cart'
        """, (order_id, user_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")
        # Get items
        cur.execute("""
            SELECT p.name, oi.quantity, oi.price_at_purchase
            FROM order_items oi JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id=%s
        """, (order_id,))
        items = [{"name": r[0], "quantity": r[1], "price": float(r[2])} for r in cur.fetchall()]
        return {
            "id": row[0], "total_price": float(row[1] or 0),
            "status": row[2], "delivery_date": str(row[3]) if row[3] else None,
            "delivery_address": row[4], "payment_mode": row[5],
            "payment_status": row[6], "created_at": str(row[7]),
            "items": items
        }
    finally:
        cur.close(); conn.close()
