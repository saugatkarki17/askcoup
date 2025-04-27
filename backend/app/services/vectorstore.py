# backend/app/services/vectorstore.py

import uuid

def store_in_pinecone(pinecone_index_obj, embedding, metadata: dict):
    """Stores a single embedding with metadata into the Pinecone index."""
    if pinecone_index_obj is None:
        print("Pinecone index object not provided to store_in_pinecone.")
        return

    try:
        print(f"Storing embedding to Pinecone...")
        pinecone_index_obj.upsert(
            vectors=[{
                "id": str(uuid.uuid4()),  # generate a unique ID for each entry
                "values": embedding,
                "metadata": metadata
            }]
        )
        print("Embedding stored successfully.")
    except Exception as e:
        print(f"Error storing embedding to Pinecone: {e}")

def query_vector_store(pinecone_index_obj, embedding, top_k: int = 3):
    """Queries the Pinecone index with the given embedding."""
    if pinecone_index_obj is None:
        print("Pinecone index object not provided to query_vector_store.")
        return []

    try:
        print(f"Querying Pinecone with top_k={top_k}...")
        query_results = pinecone_index_obj.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True  # include metadata to retrieve text
        )

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
