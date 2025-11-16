"""
Tests for authentication functionality.
"""
import pytest
from httpx import AsyncClient
from app.main import app
from app.core.auth import create_access_token, get_password_hash


@pytest.mark.asyncio
async def test_login_with_valid_credentials():
    """Test login with valid credentials."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Note: Auth is disabled by default, so this will return 501
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin"},
        )
        # Expecting 501 because auth is disabled in test mode
        assert response.status_code == 501


@pytest.mark.asyncio
async def test_get_current_user_without_auth():
    """Test getting current user when auth is disabled."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "username" in data
        assert "user_id" in data


def test_password_hashing():
    """Test password hashing and verification."""
    from app.core.auth import verify_password

    password = "test_password_123"
    hashed = get_password_hash(password)

    # Should not be the same as plain text
    assert hashed != password

    # Should verify correctly
    assert verify_password(password, hashed) is True

    # Should not verify with wrong password
    assert verify_password("wrong_password", hashed) is False


def test_jwt_token_creation_and_decoding():
    """Test JWT token creation and decoding."""
    from app.core.auth import decode_access_token

    # Create token
    token = create_access_token(data={"sub": "testuser", "user_id": "test-001"})
    assert token is not None
    assert isinstance(token, str)

    # Decode token
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "testuser"
    assert payload["user_id"] == "test-001"

    # Test invalid token
    invalid_payload = decode_access_token("invalid.token.here")
    assert invalid_payload is None
