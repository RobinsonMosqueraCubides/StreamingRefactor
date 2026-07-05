import pytest
from datetime import timedelta
import jwt
from core.security import get_password_hash, verify_password, create_access_token, SECRET_KEY, ALGORITHM

def test_password_hashing():
    password = "my-secure-password"
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong-password", hashed) is False

def test_create_access_token():
    subject = "testuser"
    token = create_access_token(subject=subject, expires_delta=timedelta(minutes=15))
    
    # Decode and verify the token payload
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == subject
    assert "exp" in payload
