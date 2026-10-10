import pytest
import hmac
import hashlib
import time
from app.services.auth_service import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
    verify_telegram_init_data,
)

def test_password_hashing():
    pwd = "supersecretpassword123"
    hashed = get_password_hash(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_jwt_token_flow():
    payload = {"sub": "42", "username": "whale_farmer"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "42"
    assert decoded["username"] == "whale_farmer"

def test_invalid_jwt_token():
    assert decode_access_token("invalid.token.here") is None

def test_telegram_init_data_verification():
    bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
    auth_date = int(time.time())
    
    # Construct valid data string
    data_dict = {
        "auth_date": str(auth_date),
        "query_id": "AAHdF6IQAAAAAN0XohDhrOrc",
        "user": '{"id":279058397,"first_name":"Alice","username":"alice_web3"}'
    }
    
    data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(data_dict.items())])
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    valid_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    
    init_data_str = f"auth_date={auth_date}&query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22Alice%22%2C%22username%22%3A%22alice_web3%22%7D&hash={valid_hash}"
    
    verified_user = verify_telegram_init_data(init_data_str, bot_token)
    assert verified_user is not None
    assert verified_user["id"] == 279058397
    assert verified_user["username"] == "alice_web3"

def test_telegram_init_data_tampered():
    bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
    tampered = "auth_date=123456&user=%7B%22id%22%3A1%7D&hash=fakehash123456"
    assert verify_telegram_init_data(tampered, bot_token) is None
