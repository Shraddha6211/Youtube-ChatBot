# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import video, chat

app = FastAPI(
    title="YouTube Chat API",
    description="Ask questions about any YouTube video using RAG",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes — now /video/index and /chat/ask exist
app.include_router(video.router)
app.include_router(chat.router)

@app.get("/")
async def root():
    return {"message": "YouTube Chat API is running", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy"}