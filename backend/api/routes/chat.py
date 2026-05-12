# backend/api/routes/chat.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.rag_service import answer_question

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    video_id: str
    question: str

@router.post("/ask")
async def ask_question(request: ChatRequest):
    """
    POST /chat/ask
    Body: { "video_id": "Gfr50f6ZBvo", "question": "Who is Demis?" }

    Returns the LLM's answer based on retrieved transcript chunks.
    """
    try:
        result = answer_question(request.video_id, request.question)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise  # re-raise HTTP exceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")