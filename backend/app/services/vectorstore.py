# backend/app/services/vectorstore.py
import os

# from pinecone import Pinecone # No longer needed here for initialization

# We will get the initialized index object from main.py

# Remove global pinecone_index = None
# Remove initialize_pinecone() function

# The query function now accepts the Pinecone index object
def query_vector_store(pinecone_index_obj, embedding, top_k: int = 3):
    """Queries the Pinecone index with the given embedding."""
    if pinecone_index_obj is None:
        print("Pinecone index object not provided to query_vector_store.")
        return []

    try:
        print(f"Querying Pinecone with top_k={top_k}...")
        # Use the provided index object for the query
        query_results = pinecone_index_obj.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True # Make sure to include metadata to get the text back
        )

        # Process query_results to extract relevant information (the text chunks)
        relevant_docs = []
        if query_results and query_results.matches:
            for match in query_results.matches:
                if 'text' in match.metadata:
                    relevant_docs.append(match.metadata['text'])

        print(f"Found {len(relevant_docs)} relevant documents.")
        return relevant_docs
    except Exception as e:
        print(f"Error querying Pinecone: {e}")
        return []

# Remove the call to initialize_pinecone() at the end of the file