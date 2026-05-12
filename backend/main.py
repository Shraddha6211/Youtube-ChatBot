# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import your route files (we'll build these next)
# from backend.api.routes import chat, video

app = FastAPI(
    title="YouTube Chat API",
    description="Ask questions about any YouTube video",
    version="1.0.0"
)

# CORS — allows your frontend (different port) to talk to this backend
# Without this, browsers block the request for security reasons
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # In production: specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "YouTube Chat API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}