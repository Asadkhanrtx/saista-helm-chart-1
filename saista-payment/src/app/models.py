from pydantic import BaseModel
from typing import Optional

class PaymentRequest(BaseModel):
    order_id: int
    payment_mode: str          # "cod" | "card" | "upi"
    # Card fields (dummy, optional)
    card_number: Optional[str] = None
    card_name: Optional[str] = None
    card_expiry: Optional[str] = None
    card_cvv: Optional[str] = None
    # UPI fields (dummy, optional)
    upi_id: Optional[str] = None

class InvoiceResponse(BaseModel):
    order_id: int
    customer_name: str
    customer_email: str
    items: list
    total_price: float
    payment_mode: str
    payment_status: str
    delivery_date: Optional[str]
    delivery_address: Optional[str]
    invoice_number: str
