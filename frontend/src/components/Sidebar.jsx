// frontend/src/components/Sidebar.jsx
import { useState, useEffect } from 'react';
import { getConversationSummaries, startNewConversation, deleteConversation } from '../services/api'; // Ensure correct path
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Pass necessary props: active conversation ID and functions to handle conversation actions
export default function Sidebar({ activeConversationId, onSelectConversation, onCreateNewConversation }) {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate(); // Get navigate function
    const [conversations, setConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isDeleting, setIsDeleting] = useState({});

    // Fetch conversation summaries when the component mounts
    useEffect(() => {
        const fetchConversations = async () => {
            setIsLoading(true);
            setError(null); // Clear previous errors
            try {
                const summaries = await getConversationSummaries();
                // Optional: Sort conversations by creation date if you added a 'created_at' field in backend
                // summaries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setConversations(summaries);
            } catch (err) {
                console.error("Error fetching conversations:", err);
                setError("Failed to load conversations.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchConversations();

        // Optional: Set up polling to refresh history periodically
        // const pollInterval = setInterval(fetchConversations, 30000); // Refresh every 30 seconds
        // return () => clearInterval(pollInterval); // Clean up interval on unmount

    }, []); // Empty dependency array means run once on mount

    const handleNewChat = async () => {
        setIsLoading(true); // Maybe show loading state for new chat
        setError(null);
        try {
            const newConvo = await startNewConversation();
            // Add the new conversation to the list and select it
            // Prepend the new chat to the list displayed in the sidebar
            setConversations(prevConversations => [{ id: newConvo.id, title: newConvo.title, first_message: newConvo.title, created_at: newConvo.created_at }, ...prevConversations]);
            onCreateNewConversation(newConvo.id); // Notify parent to select this new chat
        } catch (err) {
            console.error("Error creating new conversation:", err);
            setError("Failed to create new chat.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Add handler for deleting a conversation ---
    const handleDeleteConversation = async (event, conversationId) => {
        // Prevent click on the list item from triggering selection
        event.stopPropagation(); // Stop event propagation

        if (isDeleting[conversationId]) return; // Prevent deleting multiple times

        setIsDeleting(prev => ({ ...prev, [conversationId]: true })); // Set deleting state for this ID
        setError(null); // Clear errors

        try {
            const success = await deleteConversation(conversationId);
            if (success) {
                // Remove the conversation from the local state
                setConversations(prevConversations => prevConversations.filter(convo => convo.id !== conversationId));
                // Notify parent if the deleted conversation was the active one
                if (activeConversationId === conversationId) {
                    onDeleteConversation(conversationId); // Notify parent
                }
            } else {
                // Handle case where backend reported not found (should be covered by API error)
                console.warn(`Delete successful for ${conversationId} but not found in local state?`);
            }
        } catch (err) {
            console.error(`Error deleting conversation ${conversationId}:`, err);
            setError(`Failed to delete conversation ${conversationId}.`); // Set error
        } finally {
            setIsDeleting(prev => ({ ...prev, [conversationId]: false })); // Reset deleting state
        }

        // --- Add Logout Handler ---
        const handleLogout = async () => {
            try {
                await logout(); // Call Firebase logout function
                navigate('/auth'); // Redirect to auth page after logout
            } catch (error) {
                console.error("Error during logout:", error);
                // Optionally, show an error message to the user
            }
        };

        // Re-fetch the list after deletion might be a good idea in case of external changes
        // fetchConversations(); // Uncomment if you want to refetch the whole list after deletion
    };
    return (
        // Use w-64 for width, bg-gray-800 for background, flex-col for layout
        // Added basic mobile responsive styles
        <div className="w-64 bg-gray-800 text-white flex flex-col h-screen mobile:w-full mobile:h-auto mobile:flex-row mobile:overflow-x-auto">
            {/* New Chat Button */}
            {/* Use p-4, bg-indigo-600, hover:bg-indigo-700 for styling */}
            <button
                onClick={handleNewChat}
                className="p-4 bg-indigo-600 hover:bg-indigo-700 transition-colors text-left font-medium mobile:flex-shrink-0 mobile:w-auto mobile:px-6 mobile:py-3 mobile:rounded-md mobile:m-2"
                disabled={isLoading} // Disable button while loading
            >
                {isLoading ? 'Creating...' : '+ New Chat'}
            </button>

            {/* Conversations List */}
            {/* Use flex-1 for growing, overflow-y-auto for scrolling */}
            <div className="flex-1 overflow-y-auto mobile:flex-grow mobile:overflow-x-auto mobile:overflow-y-hidden mobile:py-2">
                {isLoading && <div className="p-4 text-gray-400 mobile:p-2">Loading history...</div>}
                {error && <div className="p-4 text-red-400 mobile:p-2">Error: {error}</div>}
                {!isLoading && conversations.length === 0 && (
                    <div className="p-4 text-gray-500 mobile:p-2">No past conversations.</div>
                )}

                {/* Map through conversations and display summaries */}

                {conversations.map((convo) => (
                    // Modify the list item structure to include a delete button
                    <div
                        key={convo.id}
                        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700 transition-colors truncate ${activeConversationId === convo.id ? 'bg-gray-700 border-l-4 border-indigo-500' : ''
                            } mobile:flex-shrink-0 mobile:w-48 mobile:rounded-md mobile:m-1 mobile:p-3`}
                        onClick={() => onSelectConversation(convo.id)} // Handle selecting the conversation
                    >
                        {/* Conversation Title/Snippet */}
                        <span className="flex-1 truncate mr-2"> {/* Use flex-1 to allow text to truncate */}
                            {convo.title && convo.title !== 'New Chat' ? convo.title : convo.first_message || `Chat ${convo.id.substring(0, 4)}`}
                        </span>

                        {/* Delete Button/Icon */}
                        {/* You might use an icon library here (e.g., Heroicons, Font Awesome) */}
                        <button
                            onClick={(e) => handleDeleteConversation(e, convo.id)} // Call delete handler
                            className="text-gray-400 hover:text-red-500 transition-colors text-sm p-1 rounded hover:bg-gray-600 mobile:p-0"
                            disabled={isDeleting[convo.id]} // Disable while deleting
                            title={`Delete conversation "${convo.title || convo.first_message || convo.id}"`} // Add tooltip
                        >
                            {/* Replace with an actual delete icon if you have one */}
                            {isDeleting[convo.id] ? '...' : '✖'} {/* Simple text for delete, show '...' while deleting */}
                        </button>
                    </div>
                ))}
            </div>
            {/* --- User Info and Logout Area --- */}
            {currentUser && ( // Only show this if a user is logged in
                <div className="p-4 border-t border-gray-700 flex items-center justify-between mobile:flex-shrink-0 mobile:w-auto mobile:px-6 mobile:py-3 mobile:rounded-md mobile:m-2">
                    {/* User Icon (Placeholder) */}
                    {/* You can replace with an actual icon */}
                    <div className="text-gray-400 mr-3">
                        👤 {/* Simple person icon */}
                    </div>
                    {/* User Email/Info */}
                    <div className="flex-1 truncate text-sm mobile:hidden"> {/* Hide email on small mobile */}
                        {currentUser.email}
                    </div>
                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-400 hover:text-white transition-colors font-medium mobile:ml-2"
                    >
                        Logout
                    </button>
                </div>
            )}
            {/* Optional: Show login/signup prompt if no user */}
            {!currentUser && (
                <div className="p-4 border-t border-gray-700 text-center text-sm text-gray-400 mobile:hidden">
                    Please log in.
                </div>
            )}

        </div>
    );
}