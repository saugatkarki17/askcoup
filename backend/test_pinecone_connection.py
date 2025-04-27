# backend/test_pinecone_connection.py
import os
from dotenv import load_dotenv
from pinecone import Pinecone

# Load environment variables from the .env file
# Ensure the path is correct relative to this script's location
load_dotenv(dotenv_path='.env')

# Get environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
# Optional: Add environment/region if you suspect it's needed even for v2
# PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT") # e.g., 'us-east-1'

print(f"Attempting to connect to Pinecone...")
print(f"Using API Key (first 5 chars): {PINECONE_API_KEY[:5] if PINECONE_API_KEY else 'None'}")
print(f"Looking for Index Name: {PINECONE_INDEX_NAME}")
# print(f"Using Environment (if set): {PINECONE_ENVIRONMENT}") # Uncomment if using environment

if not PINECONE_API_KEY or not PINECONE_INDEX_NAME:
    print("Error: Pinecone environment variables not fully set.")
else:
    try:
        # Initialize Pinecone (using v2 syntax)
        # Add environment=PINECONE_ENVIRONMENT if you uncommented it above
        pc = Pinecone(api_key=PINECONE_API_KEY)

        # List all indexes in the account associated with the API key
        print("Listing available indexes...")
        active_indexes = pc.list_indexes()
        print(f"Found indexes: {active_indexes}")

        # Correct way to check if an index with the specific name exists in the list of dictionaries
        index_names = [index_info.get("name") for index_info in active_indexes] # Use .get for safety

        if PINECONE_INDEX_NAME in index_names:
                print(f"Success: Index '{PINECONE_INDEX_NAME}' was found in the listed indexes.")
                 # Optional: Try connecting to the index object to further test the connection
                try:
                    index = pc.Index(PINECONE_INDEX_NAME)
                    print(f"Successfully obtained index object: {index.name}")
                except Exception as connect_e:
                    print(f"Error obtaining index object: {connect_e}")

        else:
                print(f"Failure: Index '{PINECONE_INDEX_NAME}' was NOT found in the listed indexes returned by Pinecone.")
                print("Please ensure the index name is correct and it exists in the Pinecone project associated with this API key.")

    except Exception as e:
        print(f"An error occurred during Pinecone connection or listing indexes: {e}")
        print("Please double-check your API key and network connectivity.")

print("Test script finished.")