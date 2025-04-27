# backend/scripts/ingest_data.py
# Add the backend directory to the Python path
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Existing imports
from dotenv import load_dotenv
from pinecone import Pinecone, Index
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_pinecone import Pinecone as PineconeVectorStore # Alias for clarity
from typing import List, Dict, Any

# --- Configuration ---
# Set the path to your .env file relative to this script's location
# This path assumes your .env file is directly in the backend directory
DOTENV_PATH = './.env'

# Embedding model configuration
EMBEDDING_MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'
EMBEDDING_DIMENSION = 384 # Must match the dimension you set for the 'ask-coup' index

# Pinecone index configuration
INDEX_NAME = "ask-coup" # This must match the index name in your .env and dashboard

# --- Environment Loading ---
# Load environment variables from the specified .env file path
load_dotenv(DOTENV_PATH) # Changed to use DOTENV_PATH

# Debugging: Check if .env file is loaded correctly
if not os.path.exists(DOTENV_PATH):
    print(f"Error: .env file not found at {DOTENV_PATH}")
else:
    print(f".env file loaded from {DOTENV_PATH}")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

# Debugging: Check if environment variables are loaded
if not PINECONE_API_KEY:
    print("Error: PINECONE_API_KEY is not set.")
if not PINECONE_INDEX_NAME:
    print("Error: PINECONE_INDEX_NAME is not set.")

# --- Data Source ---
# Ensure you have a file like backend/data/subjects.py
# containing a list variable named 'knowledge_base_entries'
try:
    # Assuming knowledge_base_entries is a list of strings or documents
    from data.subjects import knowledge_base_entries
    print("Successfully imported knowledge_base_entries.")
except ImportError:
    print("Error: Could not import knowledge_base_entries from backend.data.subjects.")
    print("Please ensure you have the file backend/data/subjects.py with the data.")
    knowledge_base_entries = [] # Initialize as empty if import fails
except Exception as e:
     print(f"An unexpected error occurred importing knowledge_base_entries: {e}")
     knowledge_base_entries = []


# --- Ingestion Process ---
def ingest_data_to_pinecone():
    """Handles the data loading, embedding, and ingestion into Pinecone."""

    # 1. Validate Environment Variables
    if not PINECONE_API_KEY or not INDEX_NAME: # Add 'or not PINECONE_ENVIRONMENT' if needed
        print("\nError: Required Pinecone environment variables (PINECONE_API_KEY, INDEX_NAME) are not set.")
        print(f"Please ensure they are in your .env file at the specified path: {DOTENV_PATH}")
        return

    print("Environment variables loaded successfully.")
    print(f"Loaded PINECONE_API_KEY (first 5 chars): {PINECONE_API_KEY[:5] if PINECONE_API_KEY else 'None'}") # Added debug print
    print(f"Loaded INDEX_NAME: {INDEX_NAME}") # Added debug print
    print(f"Targeting Pinecone index: {INDEX_NAME}")

    # 2. Initialize Embedding Model
    try:
        print(f"\nLoading embedding model: {EMBEDDING_MODEL_NAME}...")
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
        print("Embedding model loaded successfully.")
    except Exception as e:
        print(f"Error loading embedding model {EMBEDDING_MODEL_NAME}: {e}")
        return

    # 3. Initialize Pinecone Client (using v2+)
    try:
        print("\nInitializing Pinecone client...")
        # Add environment=PINECONE_ENVIRONMENT if you uncommented it above
        pc = Pinecone(api_key=PINECONE_API_KEY)
        print("Pinecone client initialized.")

        # 4. Check/Create Index
        print(f"\nChecking for index '{INDEX_NAME}'...")
        active_indexes = pc.list_indexes()
        index_names = [idx['name'] for idx in active_indexes] # Robust check

        if INDEX_NAME not in index_names:
            print(f"Index '{INDEX_NAME}' not found. Creating index...")
            # Define the spec based on your Pinecone setup (Serverless is common now)
            # You might need to adjust the region part based on PINECONE_ENVIRONMENT if set
            pc.create_index(
                name=INDEX_NAME,
                dimension=EMBEDDING_DIMENSION,
                metric="cosine", # or "dotproduct", "euclidean" - must match your index creation choice
                spec={"serverless": {"cloud": "aws", "region": "us-east-1"}} # Match your index's cloud and region
            )
            print(f"Index '{INDEX_NAME}' created. Waiting for index to be ready...")
            # Optional: Add a loop here to wait until index.describe_index().status['state'] == 'Ready'
        else:
            print(f"Index '{INDEX_NAME}' already exists.")

        # 5. Initialize Pinecone Vector Store (Langchain)
        print(f"\nInitializing Langchain Pinecone vector store for index '{INDEX_NAME}'...")
        # Use from_existing_index as the script ensures the index exists
        vector_store = PineconeVectorStore.from_existing_index(index_name=INDEX_NAME, embedding=embeddings)
        print("Langchain Pinecone vector store initialized.")

        # 6. Load and Process Data (using the imported knowledge_base_entries)
        if not knowledge_base_entries:
             print("\nNo data entries found in knowledge_base_entries. Nothing to ingest.")
             return

        print(f"\nIngesting {len(knowledge_base_entries)} data entries...")

        # 7. Add Data to Vector Store
        # Langchain's add_texts handles chunking (basic) and embedding
        # You can provide metadata alongside texts
        # Assuming knowledge_base_entries is a list of strings or Langchain Documents
        texts_to_add = []
        metadata_list = []

        if knowledge_base_entries and isinstance(knowledge_base_entries[0], str):
             texts_to_add = knowledge_base_entries
             # Create simple metadata for each entry
             metadata_list = [{"source": "knowledge_base_entry", "index": i} for i in range(len(knowledge_base_entries))]
        # elif knowledge_base_entries and isinstance(knowledge_base_entries[0], Document): # If using Langchain Document objects
        #      texts_to_add = [doc.page_content for doc in knowledge_base_entries]
        #      metadata_list = [doc.metadata for doc in knowledge_base_entries]
        # elif knowledge_base_entries and isinstance(knowledge_base_entries[0], dict): # Example if data is list of {'text': '...', 'meta': {...}}
        #      texts_to_add = [entry.get('text', '') for entry in knowledge_base_entries]
        #      metadata_list = [entry.get('meta', {}) for entry in knowledge_base_entries]
        else:
             print("Error: Unsupported or empty format for knowledge_base_entries. Expected list of strings or Documents.")
             return

        if not texts_to_add:
             print("No valid texts extracted from knowledge_base_entries for ingestion.")
             return


        # Use add_texts to embed and upload
        # Langchain handles batching internally with add_texts
        ids = vector_store.add_texts(texts_to_add, metadatas=metadata_list)
        print(f"\nSuccessfully added {len(ids)} vectors to Pinecone.")


    except Exception as e:
        print(f"\nAn error occurred during ingestion: {e}")
        import traceback
        traceback.print_exc() # Print full traceback for debugging


# --- Main Execution ---
if __name__ == "__main__":
    print("--- Starting Data Ingestion Script ---")
    ingest_data_to_pinecone()
    print("--- Data Ingestion Script Finished ---")