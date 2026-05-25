from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db_connection
from app.models import CustomCakeCreate
from app.routes import get_current_user

router = APIRouter(prefix="/custom-cake", tags=["custom"])


def calculate_price(pound: int, flavour: str) -> float:
    base = 300
    extra = (pound - 1) * 200 if pound > 1 else 0
    flavour_lower = flavour.lower()
    if any(f in flavour_lower for f in ['chocolate']):
        flavour_charge = 200 * pound
    elif any(f in flavour_lower for f in ['fondant']):
        flavour_charge = 250 * pound
    else:
        flavour_charge = 100 * pound  # fruit / others
    return float(base + extra + flavour_charge)


@router.post("", status_code=201)
def create_custom_cake(cake: CustomCakeCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    price = calculate_price(cake.pound, cake.flavour)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO custom_orders (user_id, pound, flavour, description, estimated_price, delivery_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending')
        """, (user_id, cake.pound, cake.flavour, cake.description, price, cake.delivery_date))
        conn.commit()
        order_id = cur.lastrowid
        return {"message": "Custom cake order created", "id": order_id, "estimated_price": price}
    finally:
        cur.close(); conn.close()


@router.get("s")
def get_custom_cakes(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, pound, flavour, description, estimated_price, final_price,
                   status, delivery_date, created_at
            FROM custom_orders WHERE user_id=%s ORDER BY created_at DESC
        """, (user_id,))
        rows = cur.fetchall()
        return {"custom_cakes": [
            {
                "id": r[0], "pound": r[1], "flavour": r[2], "description": r[3],
                "estimated_price": float(r[4]), "final_price": float(r[5]) if r[5] else None,
                "status": r[6], "delivery_date": str(r[7]) if r[7] else None, "created_at": str(r[8])
            } for r in rows
        ]}
    finally:
        cur.close(); conn.close()
