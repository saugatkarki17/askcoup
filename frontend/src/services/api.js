// export async function sendMessageToBot(userMessage) {
//     try {
//       const res = await fetch("http://localhost:8000/chatbot", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ message: userMessage }),
//       });
//       const data = await res.json();
//       return data.reply;
//     } catch (error) {
//       console.error(error);
//       return "Error contacting the bot.";
//     }
//   }

// frontend/src/services/api.js
// Assuming your backend is running on localhost:8000
const API_BASE_URL = "http://localhost:8000";

// Existing sendMessageToBot (will be modified slightly later)
// export async function sendMessageToBot(userMessage) { ... }

// New function to add a message to a specific conversation and get the bot's reply
export async function addMessageToConversation(conversationId, userMessage) {
  try {
    // --- Corrected URL using template literals (backticks ``) ---
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      // -------------------------------------------------------------
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });
    if (!res.ok) {
      // Handle HTTP errors
      console.error(`HTTP error: ${res.status} ${res.statusText}`); // Log status
      try {
        const errorDetail = await res.json();
        console.error("Error detail:", errorDetail); // Log error detail if available
        throw new Error(`API error: ${res.status} ${res.statusText} - ${errorDetail.detail || res.url}`);
      } catch (jsonError) {
        // If res.json() fails (e.g., not JSON response), throw generic error
        throw new Error(`API error: ${res.status} ${res.statusText} - Failed to parse error response.`);
      }
    }
    const data = await res.json();
    return data; // Expecting { sender: 'bot', text: '...' }
  } catch (error) {
    console.error(`Error sending message to conversation ${conversationId}:`, error);
    throw error; // Re-throw to be caught by the component
  }
}


// New function to get conversation summaries
export async function getConversationSummaries() {
  try {
    const res = await fetch(`${API_BASE_URL}/conversations`);
    if (!res.ok) {
      const errorDetail = await res.json();
      throw new Error(`API error: ${res.status} ${res.statusText} - ${errorDetail.detail || res.url}`);
    }
    const data = await res.json();
    // This endpoint returns a list of conversation summary objects
    return data;
  } catch (error) {
    console.error("Error fetching conversation summaries:", error);
    throw error; // Re-throw
  }
}

// New function to get a specific conversation's history
export async function getConversationHistory(conversationId) {
  try {
    const url = `${API_BASE_URL}/conversations/${conversationId}`;
    console.log("DEBUG (api.js): Attempting to fetch history from URL:", url); // Add this debug log

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`DEBUG (api.js): HTTP error fetching history: ${res.status} ${res.statusText}`); // Log status
      try {
        const errorDetail = await res.json();
        console.error("DEBUG (api.js): Error detail fetching history:", errorDetail); // Log error detail
        throw new Error(`API error: ${res.status} ${res.statusText} - ${errorDetail.detail || res.url}`);
      } catch (jsonError) {
        throw new Error(`API error: ${res.status} ${res.statusText} - Failed to parse error response.`);
      }
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`Error fetching conversation history for ${conversationId}:`, error);
    throw error;
  }
}

// New function to start a new conversation
export async function startNewConversation() {
  try {
    const res = await fetch(`${API_BASE_URL}/conversations/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // No body needed for this endpoint
    });
    if (!res.ok) {
      const errorDetail = await res.json();
      throw new Error(`API error: ${res.status} ${res.statusText} - ${errorDetail.detail || res.url}`);
    }
    const data = await res.json();
    // This endpoint returns the new conversation object { id: '...', messages: [], ... }
    return data;
  } catch (error) {
    console.error("Error starting new conversation:", error);
    throw error; // Re-throw
  }
}

// --- Add this new function to delete a conversation ---
export async function deleteConversation(conversationId) {
  try {
    const url = `${API_BASE_URL}/conversations/${conversationId}`;
    console.log("DEBUG (api.js): Attempting to delete conversation:", url); // Add debug log

    const res = await fetch(url, {
      method: "DELETE", // Use DELETE method
    });

    if (!res.ok) {
      console.error(`DEBUG (api.js): HTTP error deleting conversation: ${res.status} ${res.statusText}`); // Log status
      try {
        const errorDetail = await res.json();
        console.error("DEBUG (api.js): Error detail deleting conversation:", errorDetail); // Log error detail
        throw new Error(`API error: ${res.status} ${res.statusText} - ${errorDetail.detail || res.url}`);
      } catch (jsonError) {
        // If res.json() fails (e.g., not JSON response for error), throw generic error
        throw new Error(`API error: ${res.status} ${res.statusText} - Failed to parse error response.`);
      }
    }
    // Assuming the backend returns a success message or 200 OK
    console.log(`Successfully deleted conversation ${conversationId}.`);
    return true; // Indicate success

  } catch (error) {
    console.error(`Error deleting conversation ${conversationId}:`, error);
    throw error; // Re-throw
  }
}

// Remove the old sendMessageToBot function if it's no longer used directly
// Or keep it if you still need a simple endpoint for other purposes
// export async function sendMessageToBot(userMessage) { ... } // Consider removing or renaming this