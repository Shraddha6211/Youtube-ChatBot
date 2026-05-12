# backend/api/routes/video.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.rag_service import index_video

router = APIRouter(prefix="/video", tags=["video"])

# Pydantic model — defines what the request body must look like
# FastAPI validates this automatically. If the field is missing → 422 error.
class VideoRequest(BaseModel):
    url: str  # The YouTube URL or video ID

@router.post("/index")
async def index_video_endpoint(request: VideoRequest):
    """
    POST /video/index
    Body: { "url": "https://www.youtube.com/watch?v=..." }

    Fetches transcript, chunks it, embeds it, stores it.
    Returns status info.
    """
    try:
        result = index_video(request.url)
        return result
    except ValueError as e:
        # ValueError = something we anticipated (no transcript, bad URL)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Unexpected errors — 500 means "server broke"
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")