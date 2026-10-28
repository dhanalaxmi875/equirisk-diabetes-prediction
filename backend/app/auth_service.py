"""
Authentication service: handles user registration, login, and token management.
"""

from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
from .database import db, mongodb
from .auth_models import UserCreate, UserInDB, UserResponse, Token
from .auth_utils import get_password_hash, verify_password, create_access_token, decode_access_token


class AuthService:
    """Service for authentication operations."""
    
    def __init__(self):
        self.enabled = mongodb.enabled
        self.users_collection = db.users if db else None
    
    async def register_user(self, user_data: UserCreate) -> UserResponse:
        """Register a new user."""
        if not self.enabled:
            raise ValueError("Authentication is not available. MongoDB is not connected.")
        
        # Check if user already exists
        existing_user = self.users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise ValueError("Email already registered")
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user document
        user_doc = {
            "email": user_data.email,
            "full_name": user_data.full_name,
            "hashed_password": hashed_password,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        
        # Insert into database
        result = self.users_collection.insert_one(user_doc)
        
        # Return user response
        return UserResponse(
            id=str(result.inserted_id),
            email=user_doc["email"],
            full_name=user_doc["full_name"],
            is_active=user_doc["is_active"],
            created_at=user_doc["created_at"]
        )
    
    async def authenticate_user(self, email: str, password: str) -> Optional[UserInDB]:
        """Authenticate a user with email and password."""
        if not self.enabled:
            return None
        
        user = self.users_collection.find_one({"email": email})
        if not user:
            return None
        
        if not verify_password(password, user["hashed_password"]):
            return None
        
        return UserInDB(
            id=str(user["_id"]),
            email=user["email"],
            full_name=user["full_name"],
            hashed_password=user["hashed_password"],
            is_active=user["is_active"],
            created_at=user["created_at"]
        )
    
    async def login(self, email: str, password: str) -> Token:
        """Login a user and return access token."""
        if not self.enabled:
            raise ValueError("Authentication is not available. MongoDB is not connected.")
        
        user = await self.authenticate_user(email, password)
        if not user:
            raise ValueError("Invalid email or password")
        
        if not user.is_active:
            raise ValueError("User account is inactive")
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user.email, "user_id": str(user.id)}
        )
        
        # Return token with user info
        return Token(
            access_token=access_token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
                created_at=user.created_at
            )
        )
    
    async def get_current_user(self, token: str) -> Optional[UserResponse]:
        """Get current user from JWT token."""
        if not self.enabled:
            return None
        
        payload = decode_access_token(token)
        if payload is None:
            return None
        
        email = payload.get("sub")
        if email is None:
            return None
        
        user = self.users_collection.find_one({"email": email})
        if user is None:
            return None
        
        return UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            full_name=user["full_name"],
            is_active=user["is_active"],
            created_at=user["created_at"]
        )


# Global auth service instance
auth_service = AuthService()
