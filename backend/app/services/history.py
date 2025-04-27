# backend/app/services/history.py
import json
import os
from typing import List, Dict, Any, Optional
from uuid import uuid4 # To generate unique conversation IDs
from datetime import datetime

# Define the path to the history file relative to the backend directory
HISTORY_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'chat_history.json')

# Ensure the data directory exists
HISTORY_DIR = os.path.dirname(HISTORY_FILE)
if not os.path.exists(HISTORY_DIR):
    os.makedirs(HISTORY_DIR)

# Ensure the history file exists and is initialized as an empty object if it's new
if not os.path.exists(HISTORY_FILE) or os.path.getsize(HISTORY_FILE) == 0:
    with open(HISTORY_FILE, 'w') as f:
        json.dump({}, f)

# --- Data Structure (Pydantic models would be better, but simple dict for now) ---
# A conversation will be a dictionary stored in the main history object
# {
#   "conversation_id_1": {
#     "messages": [
#       {"sender": "user", "text": "Hello"},
#       {"sender": "bot", "text": "Hi there!"}
#     ],
#     "created_at": "timestamp", # Optional
#     "title": "First message snippet" # Optional title
#   },
#   "conversation_id_2": { ... }
# }

# Load history from the file
def load_history() -> Dict[str, Dict[str, Any]]:
    """Loads the chat history from the JSON file."""
    try:
        with open(HISTORY_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        # Return empty history if file doesn't exist or is invalid
        return {}

# Save history to the file
def save_history(history_data: Dict[str, Dict[str, Any]]):
    """Saves the chat history to the JSON file."""
    try:
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history_data, f, indent=4) # Use indent for readability
    except IOError as e:
        print(f"Error saving history to file: {e}")

# --- History Management Functions ---

def get_all_conversations_summaries() -> List[Dict[str, Any]]:
    """Returns a list of summaries for all conversations."""
    history = load_history()
    summaries = []
    for convo_id, convo_data in history.items():
        # Create a summary (e.g., first message and ID)
        first_message = convo_data.get("messages", [])[0].get("text", "New Chat") if convo_data.get("messages") else "New Chat"
        summaries.append({
            "id": convo_id,
            "title": convo_data.get("title", first_message), # Use stored title or first message
            "first_message": first_message,
            "created_at": convo_data.get("created_at", "") # Include creation timestamp if stored
        })
    # Optional: Sort by creation date if available
    # summaries.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return summaries

def get_conversation_by_id(convo_id: str) -> Optional[Dict[str, Any]]:
    """Returns a specific conversation by its ID."""
    history = load_history()
    return history.get(convo_id)

def create_new_conversation() -> Dict[str, Any]:
    """Creates and returns a new empty conversation."""
    history = load_history()
    new_convo_id = str(uuid4()) # Generate unique ID
    new_convo_data = {
        "messages": [],
        "created_at": datetime.now().isoformat(), # Add the created_at field with current timestamp
        "title": "New Chat" # Default title
    }
    history[new_convo_id] = new_convo_data
    save_history(history)
    print(f"Created new conversation with ID: {new_convo_id}")
    # Return ID along with data, ensuring created_at is included
    return {"id": new_convo_id, **new_convo_data}

def add_message_to_conversation(convo_id: str, sender: str, text: str) -> Optional[Dict[str, Any]]:
    """Adds a message to a specific conversation."""
    history = load_history()
    convo = history.get(convo_id)

    if convo is None:
        print(f"Error: Conversation with ID {convo_id} not found.")
        return None

    new_message = {"sender": sender, "text": text}
    convo["messages"].append(new_message)

    # Optional: Update title with first message if it's the first message
    if len(convo["messages"]) == 1 and convo.get("title") == "New Chat":
         convo["title"] = text[:50] + "..." if len(text) > 50 else text

    save_history(history)
    print(f"Added message to conversation ID: {convo_id}")
    return new_message # Return the message that was added

# --- Add this new function to delete a conversation ---
def delete_conversation(convo_id: str) -> bool:
    """Deletes a specific conversation by its ID."""
    history = load_history()
    if convo_id in history:
        del history[convo_id] # Remove the entry
        save_history(history) # Save the updated history
        print(f"Deleted conversation with ID: {convo_id}")
        return True # Indicate success
    else:
        print(f"Error: Conversation with ID {convo_id} not found for deletion.")
        return False # Indicate failure (not found)

# You might add functions for deleting conversations later