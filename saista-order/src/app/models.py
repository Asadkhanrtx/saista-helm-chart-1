from pydantic import BaseModel
from typing import Optional

class CartItemAdd(BaseModel):
    product_id: int
    quantity: int = 1

class OrderPlace(BaseModel):
    order_id: int
    delivery_address: str
    delivery_date: str

class CustomCakeCreate(BaseModel):
    pound: int
    flavour: str
    description: str
    delivery_date: str

class CustomCakeStatusUpdate(BaseModel):
    status: str
    final_price: Optional[float] = None
