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

# Import Pinecone here for initialization in the startup event
from pinecone import Pinecone

# Import the functions from our new services modules
from .services.embedding import get_embedding
# Import query_vector_store, but it now expects the index object
from .services.vectorstore import query_vector_store
from .services.llm import generate_answer_from_context

# Define a global variable to hold the initialized Pinecone index object
pinecone_index_obj = None

app = FastAPI()

# Allow frontend CORS (localhost:5173 is Vite default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
def startup_event():
    """Initializes Pinecone when the FastAPI application starts."""
    global pinecone_index_obj

    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
    PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")

    print("\n--- Running FastAPI Startup Event ---")
    # --- Add a simple test print ---
    print("DEBUG: Inside startup event - attempting Pinecone init.")
    # -------------------------------
    print(f"DEBUG [Startup]: PINECONE_API_KEY (first 5 chars): {PINECONE_API_KEY[:5] if PINECONE_API_KEY else 'None'}")
    print(f"DEBUG [Startup]: PINECONE_INDEX_NAME: {PINECONE_INDEX_NAME}")
    print(f"DEBUG [Startup]: PINECONE_ENVIRONMENT: {PINECONE_ENVIRONMENT}")


    if not PINECONE_API_KEY or not PINECONE_INDEX_NAME:
        print("Pinecone environment variables not fully set during startup. Pinecone functionality disabled.")
        pinecone_index_obj = None
        return

    try:
        print(f"Initializing Pinecone connection during startup...")
        # Add environment=PINECONE_ENVIRONMENT if you are setting that variable
        pc = Pinecone(api_key=PINECONE_API_KEY)

        # --- THIS IS THE CRUCIAL DEBUG PRINT ---
        print("DEBUG [Startup]: Listing available indexes...")
        active_indexes = pc.list_indexes()
        print(f"DEBUG [Startup]: Found indexes: {active_indexes}") # <--- ENSURE THIS LINE IS PRESENT
        # ------------------------------------------

        # Check if the specific index exists in the list (using the corrected logic)
        index_names = [index_info.get("name") for index_info in active_indexes]

        if PINECONE_INDEX_NAME not in index_names:
             print(f"Pinecone index '{PINECONE_INDEX_NAME}' not found during startup. Please create it.")
             pinecone_index_obj = None
        else:
            # Get the Index object and store it in the global variable
            pinecone_index_obj = pc.Index(PINECONE_INDEX_NAME)
            print("Pinecone index initialized successfully during startup.")

    except Exception as e:
        print(f"Error initializing Pinecone during startup: {e}")
        pinecone_index_obj = None
    print("--- Startup Event Finished ---")

# --- FastAPI Shutdown Event (Optional but Recommended) ---
# If you had resources to close, like database connections, you'd add them here
# @app.on_event("shutdown")
# def shutdown_event():
#     """Cleans up resources when the FastAPI application shuts down."""
#     print("Shutting down application...")
#     # Example: Close a database connection pool


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
     title: str # Optional title
     created_at: str # Optional timestamp

# @app.post("/chatbot", response_model=ChatResponse)
# async def chatbot_endpoint(req: ChatRequest):
#     user_message = req.message
#     print(f"Received message: {user_message}")

#     # --- RAG Logic using Services ---

#     # Check if Pinecone was initialized successfully during startup
#     if pinecone_index_obj is None:
#         print("Pinecone index not initialized. Cannot perform vector search.")
#         return ChatResponse(reply="Sorry, the search service is not available.")


#     # 1. Generate embedding for the user query
#     query_embedding = get_embedding(user_message)

#     if query_embedding is None:
#         # Embedding failed, return an error response
#         return ChatResponse(reply="Sorry, I couldn't process your message (embedding failed).")

#     # 2. Query Pinecone for relevant documents - Pass the initialized index object
#     # Adjust top_k as needed to retrieve enough context
#     relevant_context = query_vector_store(pinecone_index_obj, query_embedding, top_k=5)

#     if not relevant_context:
#         # Fallback if no relevant documents are found
#         print("No relevant documents found in Pinecone.")
#         # You can refine this fallback: maybe a general LLM call or a standard "I don't know"
#         reply = "Sorry, I couldn't find specific information about that in my knowledge base."
#     else:
#         # 3. Generate answer using LLM and retrieved context
#         print(f"Found relevant context: {relevant_context}")
#         reply = generate_answer_from_context(user_message, relevant_context)

#         # Basic check if LLM failed or returned empty response
#         if not reply:
#              reply = "Sorry, I couldn't generate an answer based on the available information."


#     return ChatResponse(reply=reply)

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