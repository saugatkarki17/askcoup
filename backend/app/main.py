# backend/app/main.py
from dotenv import load_dotenv
import os
load_dotenv()
print(f"DEBUG: PINECONE_INDEX_NAME from main.py: {os.getenv('PINECONE_INDEX_NAME')}")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

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

@app.post("/chatbot", response_model=ChatResponse)
async def chatbot_endpoint(req: ChatRequest):
    user_message = req.message
    print(f"Received message: {user_message}")

    # --- RAG Logic using Services ---

    # Check if Pinecone was initialized successfully during startup
    if pinecone_index_obj is None:
        print("Pinecone index not initialized. Cannot perform vector search.")
        return ChatResponse(reply="Sorry, the search service is not available.")


    # 1. Generate embedding for the user query
    query_embedding = get_embedding(user_message)

    if query_embedding is None:
        # Embedding failed, return an error response
        return ChatResponse(reply="Sorry, I couldn't process your message (embedding failed).")

    # 2. Query Pinecone for relevant documents - Pass the initialized index object
    # Adjust top_k as needed to retrieve enough context
    relevant_context = query_vector_store(pinecone_index_obj, query_embedding, top_k=5)

    if not relevant_context:
        # Fallback if no relevant documents are found
        print("No relevant documents found in Pinecone.")
        # You can refine this fallback: maybe a general LLM call or a standard "I don't know"
        reply = "Sorry, I couldn't find specific information about that in my knowledge base."
    else:
        # 3. Generate answer using LLM and retrieved context
        print(f"Found relevant context: {relevant_context}")
        reply = generate_answer_from_context(user_message, relevant_context)

        # Basic check if LLM failed or returned empty response
        if not reply:
             reply = "Sorry, I couldn't generate an answer based on the available information."


    return ChatResponse(reply=reply)

# You might add other endpoints here for admin tasks, health checks, etc.