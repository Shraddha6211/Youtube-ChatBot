# backend/services/rag_service.py

"""
The RAG Service is the conductor of the orchestra.

It doesn't play any instrument itself — it tells each musician
(transcript, chunker, embeddings, chain) when to play.

Any FastAPI route that needs RAG functionality calls THIS file,
not the individual services directly.
"""

from backend.services.transcript import get_transcript, extract_video_id
from backend.utils.chunker import split_transcript
from backend.services.embeddings import embed_and_store, get_vector_store
from backend.chains.qa_chain import build_qa_chain

def index_video(url_or_id: str) -> dict:
    """
    Full indexing pipeline: transcript → chunks → embeddings → stored.

    This is what runs when a user submits a new YouTube URL.

    Returns a dict with status info — the FastAPI route will
    return this as JSON to the frontend.
    """
    video_id = extract_video_id(url_or_id)

    # Don't re-process if already indexed
    if get_vector_store(video_id):
        return {
            "video_id": video_id,
            "status": "already_indexed",
            "message": "Video was already processed. Ready to chat!"
        }

    # Step 1: Get transcript
    transcript = get_transcript(video_id)

    # Step 2: Split into chunks
    chunks = split_transcript(transcript)

    # Step 3: Embed and store
    embed_and_store(video_id, chunks)

    return {
        "video_id": video_id,
        "status": "indexed",
        "chunk_count": len(chunks),
        "transcript_length": len(transcript),
        "message": f"Video indexed successfully. {len(chunks)} chunks stored."
    }


def answer_question(video_id: str, question: str) -> dict:
    """
    Retrieves context and generates an answer for a question.

    Called when a user sends a chat message.
    """
    vector_store = get_vector_store(video_id)

    if not vector_store:
        return {
            "error": "Video not indexed yet. Please submit the URL first.",
            "video_id": video_id
        }

    chain = build_qa_chain(vector_store)
    answer = chain.invoke(question)

    return {
        "video_id": video_id,
        "question": question,
        "answer": answer
    }