from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.payment import router as payment_router

app = FastAPI(title="Saista Bakers - Payment Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(payment_router)


@app.get("/health")
def health():
    from app.database import get_db_connection
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1")
    cur.fetchone()
    cur.close(); conn.close()
    return {"status": "healthy", "service": "payment-service", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=5003, reload=True)
