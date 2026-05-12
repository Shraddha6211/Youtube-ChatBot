# backend/core/config.py

from dotenv import load_dotenv  # reads your .env file
import os

# Load the .env file into environment variables
load_dotenv()

class Settings:
    """
    Central place for all configuration.
    Every other file imports from here — never directly from os.environ.
    Why? If you rename a key, you fix it in ONE place.
    """
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_ENVIRONMENT: str = os.getenv("PINECONE_ENVIRONMENT", "")
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "youtube-chat")

    # Model settings
    LLM_MODEL: str = "gpt-4o-mini"      # cheap, fast, good enough
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Chunking settings (we'll tune these in Phase 4)
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

# Create a single instance — imported everywhere
settings = Settings()