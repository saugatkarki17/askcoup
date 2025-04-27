// frontend/src/pages/ChatbotPage.jsx

import { useState, useEffect } from 'react';
import ChatWindow from '../components/ChatWindow'; // Ensure correct path to your ChatWindow component
import Sidebar from '../components/Sidebar'; // Ensure correct path to your Sidebar component

// Assuming api.js is in services folder relative to src
import { startNewConversation, getConversationHistory } from '../services/api'; // Ensure correct path


function ChatbotPage() {
    // State to hold the ID of the currently active conversation
    const [activeConversationId, setActiveConversationId] = useState(null);
    // State to hold the messages for the active conversation displayed in ChatWindow
    const [currentConversationMessages, setCurrentConversationMessages] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true); // Start in loading state


    // Add log here to see state changes
    useEffect(() => {
        console.log("DEBUG (ChatbotPage State): isLoadingHistory:", isLoadingHistory);
        console.log("DEBUG (ChatbotPage State): activeConversationId:", activeConversationId);
        console.log("DEBUG (ChatbotPage State): currentConversationMessages.length:", currentConversationMessages.length);
    }, [isLoadingHistory, activeConversationId, currentConversationMessages]);


    // Effect to always create a new conversation when the page loads
    useEffect(() => {
        const initializeNewConversation = async () => {
            console.log("Creating a new conversation by default.");
            setIsLoadingHistory(true); // Show loading state while creating
             try {
                const newConvo = await startNewConversation();
                setActiveConversationId(newConvo.id);
                setCurrentConversationMessages([]); // New convo starts empty
                // We won't save the new ID to localStorage if we always default to new
                console.log(`Created initial new conversation with ID: ${newConvo.id}`);
                // State updates will be logged by the effect above
             } catch (error) {
                 console.error("Error creating initial new conversation:", error);
                 // Handle error if new chat creation fails
             } finally {
                 console.log("DEBUG (initializeNewConversation): Setting isLoadingHistory to false.");
                 setIsLoadingHistory(false); // Hide loading state
             }
        };

        initializeNewConversation();

        // Clean up function if needed
        // return () => { /* cleanup */ };

    }, []); // Empty dependency array means run once on mount


    // Function to handle selecting a conversation from the sidebar
    const handleSelectConversation = async (conversationId) => {
        // Prevent re-selecting same convo or attempting while initialization/loading is in progress
        if (activeConversationId === conversationId || isLoadingHistory) {
             console.log("Ignoring select conversation:", conversationId, "Active:", activeConversationId, "Loading:", isLoadingHistory);
             return;
        }

        console.log(`Selecting conversation: ${conversationId}`);
        setIsLoadingHistory(true); // Show loading state while fetching history
        try {
            const convo = await getConversationHistory(conversationId);
            if (convo && convo.messages) { // Ensure convo and messages exist
                setActiveConversationId(convo.id);
                setCurrentConversationMessages(convo.messages);
                localStorage.setItem('lastConversationId', convo.id); // Save last selected convo ID (Optional - remove if always new chat is desired)
                console.log(`Loaded history for conversation: ${convo.id} with ${convo.messages.length} messages.`);
                // State updates will be logged by the effect above
            } else {
                console.error(`Conversation ${conversationId} not found or empty in history.`);
                // Handle error or empty convo - maybe select a new chat or just log
            }
        } catch (error) {
             console.error(`Error fetching conversation history for ${conversationId}:`, error);
             // Handle fetch error
        } finally {
             console.log("DEBUG (handleSelectConversation): Setting isLoadingHistory to false.");
             setIsLoadingHistory(false); // Hide loading state
        }
    };


     // Function to handle creating a new conversation (called by Sidebar)
     // Keep this function the same - it gets the new ID and updates state
    const handleCreateNewConversation = (newConversationId) => {
        // The Sidebar component already calls the API and notifies us the new ID
        setActiveConversationId(newConversationId);
        setCurrentConversationMessages([]); // New convo starts empty
        localStorage.setItem('lastConversationId', newConversationId); // Save the new convo ID as the last selected (Optional - remove if always new chat is desired)
        console.log(`Started new conversation: ${newConversationId}`);
        // No need to set isLoadingHistory here, as Sidebar handles its own loading state for the button
    };


    // Function to handle deleting a conversation (called by Sidebar)
    const handleDeleteConversation = (deletedConversationId) => {
        console.log(`Conversation ${deletedConversationId} was deleted.`);
        // If the deleted conversation was the one currently active...
        if (activeConversationId === deletedConversationId) {
            console.log("Deleted active conversation. Starting a new one.");
            // ... clear the current view and start a new chat by default
            setActiveConversationId(null); // Clear active ID
            setCurrentConversationMessages([]); // Clear messages
            // We should probably trigger a new chat creation here if the active one is deleted
            // For now, let the user manually click "New Chat" or refresh
             localStorage.removeItem('lastConversationId'); // Remove from local storage if used
        }
        // Sidebar component already removes it from its list and refreshes summaries if needed
    };


    // Function to update messages for the active conversation (called by ChatWindow after send/reply)
    const handleMessageSent = (userMessage, botReply) => {
        // This function is called by ChatWindow after a round trip (user -> bot)
        // The messages are already saved in the backend by ChatWindow's API call
        // We update the state here so ChatWindow re-renders with the new messages
         setCurrentConversationMessages(prevMessages => [...prevMessages, userMessage, botReply]);
         console.log(`Messages updated for conversation ${activeConversationId}`);
         // Note: If you implement updating sidebar summary, do it here or in Sidebar's useEffect
    };


    // --- Layout using flex and h-screen/w-64 ---
    return (
      // Main container: flex layout, full screen height, dark background from original theme
      // Use bg-gray-900 for background
      <div className="flex h-screen bg-gray-900 text-white mobile:flex-col">

        {/* Sidebar component */}
        <Sidebar
           activeConversationId={activeConversationId}
           onSelectConversation={handleSelectConversation}
           onCreateNewConversation={handleCreateNewConversation}
           onDeleteConversation={handleDeleteConversation} // Pass the delete handler
        />

        {/* Main Chat Area: Takes the remaining width, is a flex column */}
        <div className="flex-1 flex flex-col">
          {/* Conditionally render loading state, the ChatWindow, or a placeholder message */}
          {isLoadingHistory ? (
              // Loading state message (use a text color consistent with the theme)
              <div className="flex-1 flex items-center justify-center text-gray-400">Loading chat history...</div>
          ) : activeConversationId ? (
              <ChatWindow
                  conversationId={activeConversationId}
                  initialMessages={currentConversationMessages} // Pass messages to display
                  onMessageSent={handleMessageSent} // Pass callback for when messages are sent
              />
          ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">Select a chat from the sidebar or start a new one.</div>
          )}
        </div>
      </div>
    );
}

export default ChatbotPage;