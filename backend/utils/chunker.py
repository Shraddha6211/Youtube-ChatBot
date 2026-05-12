# backend/utils/chunker.py

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from backend.core.config import settings

def split_transcript(transcript: str) -> list[Document]:
    """
    Takes a raw transcript string and splits it into overlapping chunks.

    Why RecursiveCharacterTextSplitter?
    It tries to split on paragraphs first, then sentences, then words.
    This keeps ideas together instead of cutting mid-sentence.

    Returns a list of LangChain Document objects (not plain strings).
    Document objects carry both the text AND metadata — useful later.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,       # from config — easy to tune
        chunk_overlap=settings.CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""]  # tries these in order
    )

    # create_documents wraps each chunk in a Document object
    chunks = splitter.create_documents([transcript])
    return chunks