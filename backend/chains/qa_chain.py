# backend/chains/qa_chain.py

from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langchain_community.vectorstores import FAISS
from backend.core.config import settings

# The system prompt — what the AI "is" and how it behaves
# Notice: more detailed than your original. Specificity = better answers.
SYSTEM_PROMPT = PromptTemplate(
    template="""You are a helpful assistant that answers questions about YouTube videos.

You have been given transcript excerpts from the video. Use ONLY this context to answer.

Rules:
- If the answer is in the context, answer clearly and directly.
- If the context doesn't contain the answer, say: "I couldn't find that in the video."
- Never make up information not present in the transcript.
- Keep answers concise but complete.

Transcript context:
{context}

Question: {question}

Answer:""",
    input_variables=["context", "question"]
)

def _format_docs(retrieved_docs) -> str:
    """Joins retrieved document chunks into a single context string."""
    return "\n\n".join(doc.page_content for doc in retrieved_docs)


def build_qa_chain(vector_store: FAISS):
    """
    Builds the complete RAG chain from a vector store.

    Chain flow:
    question → [retriever gets context, question passes through]
             → prompt template fills in context + question
             → LLM generates answer
             → parser extracts plain string
    """
    llm = ChatOpenAI(
        model=settings.LLM_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0,  # 0 = deterministic answers, good for factual QA
    )

    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 4}  # retrieve 4 most relevant chunks
    )

    # This is the exact chain you built — just organized properly
    chain = (
        RunnableParallel({
            "context": retriever | RunnableLambda(_format_docs),
            "question": RunnablePassthrough()
        })
        | SYSTEM_PROMPT
        | llm
        | StrOutputParser()
    )

    return chain