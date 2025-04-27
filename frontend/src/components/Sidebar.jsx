// frontend/src/components/Sidebar.jsx
import { useState, useEffect } from 'react';
import { getConversationSummaries, startNewConversation, deleteConversation } from '../services/api'; // Ensure correct path
import { useNavigate } from 'react-router-dom';

export default function Sidebar({ activeConversationId, onSelectConversation, onCreateNewConversation, onDeleteConversation }) {
    const navigate = useNavigate(); 
    const [conversations, setConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isDeleting, setIsDeleting] = useState({});

    useEffect(() => {
        const fetchConversations = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const summaries = await getConversationSummaries();
                setConversations(summaries);
            } catch (err) {
                console.error("Error fetching conversations:", err);
                setError("Failed to load conversations.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchConversations();
    }, []);

    const handleNewChat = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const newConvo = await startNewConversation();
            setConversations(prevConversations => [
                { id: newConvo.id, title: newConvo.title, first_message: newConvo.title, created_at: newConvo.created_at },
                ...prevConversations
            ]);
            onCreateNewConversation(newConvo.id);
        } catch (err) {
            console.error("Error creating new conversation:", err);
            setError("Failed to create new chat.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteConversation = async (event, conversationId) => {
        event.stopPropagation();

        if (isDeleting[conversationId]) return;

        setIsDeleting(prev => ({ ...prev, [conversationId]: true }));
        setError(null);

        try {
            const success = await deleteConversation(conversationId);
            if (success) {
                setConversations(prevConversations => prevConversations.filter(convo => convo.id !== conversationId));
                if (activeConversationId === conversationId) {
                    onDeleteConversation(conversationId);
                }
            } else {
                console.warn(`Delete successful for ${conversationId} but not found in local state?`);
            }
        } catch (err) {
            console.error(`Error deleting conversation ${conversationId}:`, err);
            setError(`Failed to delete conversation ${conversationId}.`);
        } finally {
            setIsDeleting(prev => ({ ...prev, [conversationId]: false }));
        }
    };

    return (
        <div className="w-64 bg-gray-800 text-white flex flex-col h-screen mobile:w-full mobile:h-auto mobile:flex-row mobile:overflow-x-auto">
            <button
                onClick={handleNewChat}
                className="p-4 bg-indigo-600 hover:bg-indigo-700 transition-colors text-left font-medium mobile:flex-shrink-0 mobile:w-auto mobile:px-6 mobile:py-3 mobile:rounded-md mobile:m-2"
                disabled={isLoading}
            >
                {isLoading ? 'Creating...' : '+ New Chat'}
            </button>

            <div className="flex-1 overflow-y-auto mobile:flex-grow mobile:overflow-x-auto mobile:overflow-y-hidden mobile:py-2">
                {isLoading && <div className="p-4 text-gray-400 mobile:p-2">Loading history...</div>}
                {error && <div className="p-4 text-red-400 mobile:p-2">Error: {error}</div>}
                {!isLoading && conversations.length === 0 && (
                    <div className="p-4 text-gray-500 mobile:p-2">No past conversations.</div>
                )}

                {conversations.map((convo) => (
                    <div
                        key={convo.id}
                        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700 transition-colors truncate ${activeConversationId === convo.id ? 'bg-gray-700 border-l-4 border-indigo-500' : ''} mobile:flex-shrink-0 mobile:w-48 mobile:rounded-md mobile:m-1 mobile:p-3`}
                        onClick={() => onSelectConversation(convo.id)}
                    >
                        <span className="flex-1 truncate mr-2">
                            {convo.title && convo.title !== 'New Chat' ? convo.title : convo.first_message || `Chat ${convo.id.substring(0, 4)}`}
                        </span>

                        <button
                            onClick={(e) => handleDeleteConversation(e, convo.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors text-sm p-1 rounded hover:bg-gray-600 mobile:p-0"
                            disabled={isDeleting[convo.id]}
                            title={`Delete conversation "${convo.title || convo.first_message || convo.id}"`}
                        >
                            {isDeleting[convo.id] ? '...' : '✖'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
