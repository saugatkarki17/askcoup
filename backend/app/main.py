# backend/app/main.py

from dotenv import load_dotenv
import os
load_dotenv()
print(f"DEBUG: PINECONE_INDEX_NAME from main.py: {os.getenv('PINECONE_INDEX_NAME')}")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from pinecone import Pinecone

# Import your service modules
from app.services.embedding import get_embedding
from app.services.vectorstore import query_vector_store
from app.services.llm import generate_answer_from_context

# --- Pinecone Initialization Function ---

def initialize_pinecone_index():
    """Initializes and returns a Pinecone index object."""
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
    PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")

    if not PINECONE_API_KEY or not PINECONE_INDEX_NAME:
        print("Pinecone environment variables not fully set.")
        return None

    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)

        # List indexes
        active_indexes = pc.list_indexes()
        index_names = [index_info.get("name") for index_info in active_indexes]

        if PINECONE_INDEX_NAME not in index_names:
            print(f"Pinecone index '{PINECONE_INDEX_NAME}' not found. Please create it.")
            return None

        index = pc.Index(PINECONE_INDEX_NAME)
        print("Pinecone index initialized successfully.")
        return index
    except Exception as e:
        print(f"Error initializing Pinecone: {e}")
        return None

# --- Initialize Pinecone at Module Level ---

pinecone_index_obj = initialize_pinecone_index()

# --- FastAPI App Setup ---

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FastAPI Startup Event ---

@app.on_event("startup")
def startup_event():
    """(Optional) Can do health checks or re-initialize services if needed."""
    print("--- FastAPI Startup Event ---")
    if pinecone_index_obj is None:
        print("Warning: Pinecone index was not initialized successfully at startup.")

# --- API Routes ---

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@app.post("/chatbot", response_model=ChatResponse)
async def chatbot_endpoint(req: ChatRequest):
    user_message = req.message
    print(f"Received message: {user_message}")

    if pinecone_index_obj is None:
        return ChatResponse(reply="Sorry, the search service is not available (Pinecone error).")

    # 1. Embed the query
    query_embedding = get_embedding(user_message)
    if query_embedding is None:
        return ChatResponse(reply="Sorry, embedding failed. Please try again.")

    # 2. Search Pinecone
    relevant_context = query_vector_store(pinecone_index_obj, query_embedding, top_k=5)
    if not relevant_context:
        reply = "Sorry, I couldn't find information about that."
    else:
        # 3. Generate final reply
        reply = generate_answer_from_context(user_message, relevant_context)
        if not reply:
            reply = "Sorry, I couldn't generate a confident answer."

    return ChatResponse(reply=reply)
