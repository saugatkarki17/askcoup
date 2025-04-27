# backend/app/services/embedding.py
from sentence_transformers import SentenceTransformer
import os

# Choose a suitable model
EMBEDDING_MODEL_NAME = 'all-MiniLM-L6-v2' # Example model

embedding_model = None

def load_embedding_model():
    """Loads the Sentence Transformer embedding model."""
    global embedding_model
    if embedding_model is None:
        try:
            print(f"Loading embedding model: {EMBEDDING_MODEL_NAME}...")
            embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
            print("Embedding model loaded successfully.")
        except Exception as e:
            print(f"Error loading embedding model {EMBEDDING_MODEL_NAME}: {e}")
            embedding_model = None
            # Depending on how critical this is, you might want to exit or raise error

def get_embedding(text: str):
    """Generates an embedding vector for the given text."""
    if embedding_model is None:
        print("Embedding model not loaded.")
        return None
    try:
        return embedding_model.encode(text).tolist()
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

# Load the model when the module is imported
load_embedding_model()