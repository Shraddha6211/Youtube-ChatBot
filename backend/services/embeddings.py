# backend/services/embeddings.py

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from backend.core.config import settings

# ⚠️ In-memory store: resets when server restarts.
# We will replace this with Pinecone in Phase 4.
# For now, we use a dictionary: { video_id: FAISS vector store }
_vector_stores: dict[str, FAISS] = {}

def _get_embeddings() -> OpenAIEmbeddings:
    """Creates the embedding model. Called internally."""
    return OpenAIEmbeddings(
        model=settings.EMBEDDING_MODEL,
        api_key=settings.OPENAI_API_KEY
    )

def embed_and_store(video_id: str, chunks: list[Document]) -> FAISS:
    """
    Takes chunked documents, creates embeddings, and stores them in FAISS.

    Why cache by video_id?
    If a user asks multiple questions about the same video, we don't want
    to re-embed the entire transcript each time. That would be slow AND
    waste money (OpenAI charges per token for embeddings).

    Args:
        video_id: Used as the cache key
        chunks: List of Document objects from the chunker

    Returns:
        The FAISS vector store
    """
    if video_id in _vector_stores:
        # Already processed this video — return cached store
        return _vector_stores[video_id]

    embeddings = _get_embeddings()

    vector_store = FAISS.from_documents(
        documents=chunks,
        embedding=embeddings
    )

    # Cache it so future questions about the same video are instant
    _vector_stores[video_id] = vector_store
    return vector_store


def get_vector_store(video_id: str) -> FAISS | None:
    """
    Returns the vector store for a video if it's been processed.
    Returns None if the video hasn't been indexed yet.
    """
    return _vector_stores.get(video_id)