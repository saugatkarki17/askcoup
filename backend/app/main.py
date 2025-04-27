# backend/app/main.py

from dotenv import load_dotenv
import os
from typing import List
load_dotenv()
print(f"DEBUG: PINECONE_INDEX_NAME from main.py: {os.getenv('PINECONE_INDEX_NAME')}")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from .services.history import (
    get_all_conversations_summaries,
    get_conversation_by_id,
    create_new_conversation,
    add_message_to_conversation,
    delete_conversation,
    load_history # We might not need to expose load_history directly via an endpoint
)

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
    
# --- Pydantic Models ---
class Message(BaseModel):
    sender: str
    text: str

class ConversationSummary(BaseModel):
    id: str
    title: str
    first_message: str # Use this for displaying in the sidebar
    created_at: str # Optional timestamp

class Conversation(BaseModel):
    id: str
    messages: List[Message]
    title: str  # Optional title
    created_at: str  # Optional timestamp

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

# --- New Chat History Endpoints ---

@app.get("/conversations", response_model=List[ConversationSummary])
async def list_conversations():
    """Returns a list of summaries for all conversations."""
    return get_all_conversations_summaries()

@app.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Returns a specific conversation by its ID."""
    convo = get_conversation_by_id(conversation_id)

    if convo is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Need to return as Conversation model
    return Conversation(
         id=conversation_id, # Corrected: Use the parameter name
         messages=[Message(**msg) for msg in convo.get("messages", [])],
         title=convo.get("title", "Untitled"),
         created_at=convo.get("created_at", "")
    )


@app.post("/conversations/new", response_model=Conversation)
async def start_new_conversation():
    """Creates and returns a new empty conversation."""
    return create_new_conversation()

# --- Add this new DELETE endpoint ---
@app.delete("/conversations/{conversation_id}")
async def delete_conversation_endpoint(conversation_id: str):
    """Deletes a specific conversation by its ID."""
    success = delete_conversation(conversation_id)
    if success:
        return {"message": f"Conversation {conversation_id} deleted successfully."}
    else:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found.")

# --- Modified Chatbot Endpoint (Now adds message and gets bot reply) ---
# The frontend will call this endpoint for every message
@app.post("/conversations/{conversation_id}/messages", response_model=Message)
async def add_message_and_get_reply(conversation_id: str, req: ChatRequest):
    user_message_text = req.message
    print(f"Received message for conversation {conversation_id}: {user_message_text}")

    # 1. Add user message to history
    user_message = add_message_to_conversation(conversation_id, "user", user_message_text)
    if user_message is None:
         raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")

    # 2. Get Bot Reply (using RAG logic)
    bot_reply_text = "Sorry, the RAG service is not available." # Default fallback

    # Check if Pinecone was initialized successfully during startup
    if pinecone_index_obj is None:
        print("Pinecone index not initialized. Cannot perform vector search.")
    else:
        # Generate embedding for the user query
        query_embedding = get_embedding(user_message_text)

        if query_embedding is None:
            print("Embedding failed. Cannot perform vector search.")
        else:
            # Query Pinecone for relevant documents
            relevant_context = query_vector_store(pinecone_index_obj, query_embedding, top_k=5)

            if not relevant_context:
                print("No relevant documents found in Pinecone.")
                bot_reply_text = "Sorry, I couldn't find specific information about that in my knowledge base."
            else:
                print(f"Found relevant context: {relevant_context}")
                bot_reply_text = generate_answer_from_context(user_message_text, relevant_context)

                # Basic check if LLM failed or returned empty response
                if not bot_reply_text:
                     bot_reply_text = "Sorry, I couldn't generate an answer based on the available information."


    # 3. Add bot reply to history
    bot_message = add_message_to_conversation(conversation_id, "bot", bot_reply_text)
    if bot_message is None:
        # This should not happen if adding user message succeeded, but good practice
        print("Error adding bot message to history.")
        # You might want to return the user message that was successfully added, or an error
        raise HTTPException(status_code=500, detail="Failed to save bot reply")

    # Return the bot message to the frontend
    return Message(**bot_message) # Return the bot message as a Pydantic model


# You might add other endpoints here for admin tasks, health checks, etc.
