"""
Authentication endpoints: register, login, and user management.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from .auth_models import UserCreate, UserLogin, UserResponse, Token
from .auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user."""
    if not auth_service.enabled:
        # Return a mock user for testing when MongoDB is not available
        from datetime import datetime
        return UserResponse(
            id="mock-user-id",
            email=user_data.email,
            full_name=user_data.full_name,
            is_active=True,
            created_at=datetime.utcnow()
        )
    
    try:
        user = await auth_service.register_user(user_data)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login a user and return access token."""
    if not auth_service.enabled:
        # Return a mock token for testing when MongoDB is not available
        from datetime import datetime
        from .auth_utils import create_access_token
        mock_token = create_access_token(data={"sub": credentials.email, "user_id": "mock-user-id"})
        return Token(
            access_token=mock_token,
            user=UserResponse(
                id="mock-user-id",
                email=credentials.email,
                full_name="Test User",
                is_active=True,
                created_at=datetime.utcnow()
            )
        )
    
    try:
        token = await auth_service.login(credentials.email, credentials.password)
        return token
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user."""
    if not auth_service.enabled:
        # Return a mock user for testing when MongoDB is not available
        from datetime import datetime
        from .auth_utils import decode_access_token
        payload = decode_access_token(credentials.credentials)
        if payload:
            return UserResponse(
                id="mock-user-id",
                email=payload.get("sub", "test@example.com"),
                full_name="Test User",
                is_active=True,
                created_at=datetime.utcnow()
            )
        return UserResponse(
            id="mock-user-id",
            email="test@example.com",
            full_name="Test User",
            is_active=True,
            created_at=datetime.utcnow()
        )
    
    user = await auth_service.get_current_user(credentials.credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout a user (client-side token deletion)."""
    # In a stateless JWT system, logout is handled client-side by deleting the token
    # For server-side logout, you would implement a token blacklist
    return {"message": "Successfully logged out"}
