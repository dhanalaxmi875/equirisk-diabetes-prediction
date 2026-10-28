"""
MongoDB database configuration and connection management.
"""

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv

load_dotenv()

class MongoDB:
    """MongoDB database connection manager."""
    
    def __init__(self):
        self.client = None
        self.db = None
        self.enabled = False
        self.connect()
    
    def connect(self):
        """Establish connection to MongoDB."""
        mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
        db_name = os.getenv('MONGODB_DB_NAME', 'equirisk')
        
        try:
            # Increase timeout for Atlas connections
            self.client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000,
                socketTimeoutMS=10000,
                retryWrites=True,
                w='majority'
            )
            # Test connection
            self.client.admin.command('ping')
            self.db = self.client[db_name]
            self.enabled = True
            print(f"[MongoDB] Connected to database: {db_name}")
        except ConnectionFailure as e:
            print(f"[MongoDB] Connection failed: {e}")
            print(f"[MongoDB] Authentication features will be disabled. To enable, install MongoDB or update MONGODB_URI")
            self.enabled = False
    
    def get_db(self):
        """Get database instance."""
        if self.db is None and self.enabled:
            self.connect()
        return self.db
    
    def close(self):
        """Close database connection."""
        if self.client:
            self.client.close()
            print("[MongoDB] Connection closed")

# Global database instance
mongodb = MongoDB()
db = mongodb.get_db() if mongodb.enabled else None
