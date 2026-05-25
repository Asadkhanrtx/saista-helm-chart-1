from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import os

router_auth = APIRouter()
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
