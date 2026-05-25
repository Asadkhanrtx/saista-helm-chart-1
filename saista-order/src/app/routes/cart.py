from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db_connection
from app.models import CartItemAdd
from app.routes import get_current_user

router = APIRouter(prefix="/cart", tags=["cart"])


@router.post("", status_code=201)
def add_to_cart(item: CartItemAdd, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Get product price
        cur.execute("SELECT id, price FROM products WHERE id=%s AND available=TRUE", (item.product_id,))
        product = cur.fetchone()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        price = float(product[1])

        # Find or create cart
        cur.execute("SELECT id FROM orders WHERE user_id=%s AND status='cart'", (user_id,))
        existing = cur.fetchone()

        if existing:
            order_id = existing[0]
            # Check if item already in cart
            cur.execute("SELECT id, quantity FROM order_items WHERE order_id=%s AND product_id=%s", (order_id, item.product_id))
            existing_item = cur.fetchone()
            if existing_item:
                new_qty = existing_item[1] + item.quantity
                cur.execute("UPDATE order_items SET quantity=%s WHERE id=%s", (new_qty, existing_item[0]))
            else:
                cur.execute("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (%s,%s,%s,%s)",
                    (order_id, item.product_id, item.quantity, price))
        else:
            cur.execute("INSERT INTO orders (user_id, total_price, status) VALUES (%s, 0, 'cart')", (user_id,))
            order_id = cur.lastrowid
            cur.execute("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (%s,%s,%s,%s)",
                (order_id, item.product_id, item.quantity, price))

        conn.commit()
        return {"message": "Added to cart", "order_id": order_id}
    finally:
        cur.close(); conn.close()


@router.get("/{order_id}")
def get_cart(order_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM orders WHERE id=%s AND user_id=%s AND status='cart'", (order_id, user_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Cart not found")
        cur.execute("""
            SELECT oi.id, p.name, oi.quantity, oi.price_at_purchase,
                   (oi.quantity * oi.price_at_purchase) as item_total
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id=%s
        """, (order_id,))
        rows = cur.fetchall()
        items = [{"id": r[0], "name": r[1], "quantity": r[2], "price": float(r[3]), "item_total": float(r[4])} for r in rows]
        total = sum(i["item_total"] for i in items)
        return {"items": items, "total": total, "order_id": order_id}
    finally:
        cur.close(); conn.close()


@router.delete("/{order_id}/item/{item_id}")
def remove_from_cart(order_id: int, item_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM orders WHERE id=%s AND user_id=%s AND status='cart'", (order_id, user_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Cart not found")
        cur.execute("DELETE FROM order_items WHERE id=%s AND order_id=%s", (item_id, order_id))
        conn.commit()
        return {"message": "Item removed"}
    finally:
        cur.close(); conn.close()
