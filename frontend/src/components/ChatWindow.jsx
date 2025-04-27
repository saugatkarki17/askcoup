// frontend/src/components/ChatWindow.jsx
import { useState, useRef, useEffect } from "react";
// Remove the import for findAnswer and old sendMessageToBot
// import findAnswer from "../utils/findAnswer";
// import { sendMessageToBot } => this was removed from api.js

// Import the new API service function for adding messages
import { addMessageToConversation } from '../services/api'; // Ensure correct path


// Accept conversationId, initialMessages, and onMessageSent props
export default function ChatWindow({ conversationId, initialMessages, onMessageSent }) {

    console.log("DEBUG (ChatWindow Props): conversationId:", conversationId);
    console.log("DEBUG (ChatWindow Props): initialMessages.length:", initialMessages ? initialMessages.length : 0);
  // Use initialMessages as the starting point for the messages state displayed in THIS window
  // This state will be updated locally as user sends messages in THIS active convo
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatAreaRef = useRef(null);

   // Update messages state when initialMessages prop changes (when selecting a new conversation from sidebar)
  useEffect(() => {
     console.log("ChatWindow received new initialMessages:", initialMessages);
     setMessages(initialMessages || []);
  }, [initialMessages]);


  useEffect(() => {
    // Scroll to the bottom of the chat area whenever messages update or loading finishes
    // Use a timeout to ensure scrolling happens after DOM update
    const scrollTimeout = setTimeout(() => {
        if (!isLoading) {
             chatAreaRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, 50); // Small delay

    return () => clearTimeout(scrollTimeout); // Clean up timeout

  }, [messages, isLoading]);


  // Make handleSend an async function
  const handleSend = async () => {
    // Ensure a conversation is active and prevent empty messages or sending while loading
    if (!input.trim() || isLoading || !conversationId) {
         console.log("Cannot send: Empty input, loading, or no active conversation.");
         return;
    }

    const userMessageText = input.trim();
    // Add the user message to the state immediately for quick display
    const userMessage = { text: userMessageText, sender: "user" };

    // Optimistically update UI
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput(""); // Clear the input field

    setIsLoading(true); // Set loading state to true

    try {
      // Call the new backend API endpoint to add message and get bot reply
      // The backend saves the history, we just get the bot's message back ({ sender: 'bot', text: '...' })
      const botMessage = await addMessageToConversation(conversationId, userMessageText);

      // Add the bot's message to the state once the API call is complete
      setMessages(prevMessages => [...prevMessages, botMessage]);

       // Notify the parent (ChatbotPage) that a message pair was sent and saved in backend
       // This is important for the parent to update its state and potentially the sidebar summary
       onMessageSent(userMessage, botMessage);


    } catch (error) {
      console.error("Error sending message:", error);
      // Rollback user message if needed, or add an error message
      // For simplicity, adding an error message is often fine
      const errorMessage = { text: "Sorry, there was an error getting a response.", sender: "bot" };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
       // Optionally, notify parent of error if needed
    } finally {
      setIsLoading(false); // Set loading state back to false
    }
  };


  const handleKeyPress = (e) => {
    // Send on Enter, allow Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // Prevent default Enter behavior (like new line in textarea)
        handleSend(); // Send on Enter key
    }
  };

  // Display message if no conversation is selected or history is loading (handled by parent ChatbotPage now)
  // The parent ChatbotPage will conditionally render this component or loading/placeholder messages

  // Retain the original container styling but make it flex-1 to fit beside sidebar
  return (
    // Removed min-h-screen and center justify from here, handled by ChatbotPage
    // Added flex-1 to take available width next to sidebar
    <div className="w-full h-screen bg-gray-800 flex flex-col flex-1"> {/* Use flex-1 here */}
      {/* Original Header - Keep this styling and content */}
      {/* The parent page handles the overall flex layout, so the header stays within the chat window */}
      <div className="bg-gray-800 text-white p-6 flex items-center justify-center border-b border-gray-700 mobile:p-4 mobile:text-center">
         <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-xl p-6 shadow-lg text-center mobile:p-4">
           <h1 className="text-2xl font-semibold mobile:text-xl">Ask Coup</h1>
           <p className="text-sm text-indigo-200 mt-1 mobile:text-xs">Your intelligent companion</p>
         </div>
      </div>


      {/* Chat Area with Scroll - Retain styling */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        {/* Show initial message if no messages AND NOT loading initial history (loading handled by parent) */}
        {messages.length === 0 && !isLoading ? (
          // Use consistent text color with the theme
          <div className="text-center text-gray-500 mt-10">
            <span role="img" aria-label="sparkles">✨</span> Start the conversation! Ask me anything...
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index} // Using index as key is okay here as messages are only added
              className={`flex mb-2 ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                // Retain message bubble styling
                className={`max-w-2xl p-3 rounded-lg ${
                  msg.sender === "user"
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-gray-700 text-gray-300 rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        {/* Loading indicator - Retain styling */}
        {isLoading && (
           <div className="flex justify-start mb-2">
              <div className="max-w-xs p-3 rounded-lg bg-gray-700 text-gray-300 rounded-bl-none">
                  <div className="dot-typing"></div> {/* Simple loading animation CSS needed */}
              </div>
           </div>
        )}
        <div ref={chatAreaRef} /> {/* For auto-scrolling */}
      </div>

      {/* Input Area - Retain styling */}
      <div className="bg-gray-800 p-6 border-t border-gray-700 mobile:p-4">
        <div className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            // Retain input styling
            className="flex-1 p-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-white placeholder-gray-400"
            placeholder={isLoading ? "Thinking..." : "Ask away..."}
            disabled={isLoading || !conversationId} // Disable input if loading or no conversation selected
          />
          <button
            onClick={handleSend}
            // Retain button styling
            className={`bg-indigo-600 text-white px-6 py-3 rounded-lg ml-2 hover:bg-indigo-700 transition-colors font-medium ${isLoading || !conversationId ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading || !conversationId} // Disable button if loading or no conversation selected
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Ensure you have the CSS for the dot-typing animation in your App.css or index.css
/* Example CSS: (Already provided in previous steps)
.dot-typing { ... }
.dot-typing::before, .dot-typing::after { ... }
@keyframes dotTyping { ... }
*/


// import { useState, useRef, useEffect } from "react";
//         import findAnswer from "../utils/findAnswer";

//         export default function Chatbot() {
//           const [input, setInput] = useState("");
//           const [messages, setMessages] = useState([]);
//           const chatAreaRef = useRef(null);

//           useEffect(() => {
//             // Scroll to the bottom of the chat area whenever messages update
//             chatAreaRef.current?.scrollIntoView({ behavior: "smooth" });
//           }, [messages]);

//           const handleSend = () => {
//             if (!input.trim()) return; // Prevent empty messages
//             const userMessage = { text: input, sender: "user" };
//             const botMessage = { text: findAnswer(input), sender: "bot" };

//             setMessages([...messages, userMessage, botMessage]);
//             setInput("");
//           };

//           const handleKeyPress = (e) => {
//             if (e.key === "Enter") handleSend(); // Send on Enter key
//           };

//           return (
//             <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
//               <div className="w-full h-screen bg-gray-800 flex flex-col">
//                 {/* Header */}
//                 <div className="bg-gray-800 text-white p-6 flex items-center justify-center">
//                   <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-xl p-6 shadow-lg text-center">
//                     <h1 className="text-2xl font-semibold">Ask Coup</h1>
//                     <p className="text-sm text-indigo-200 mt-1">Your intelligent companion</p>
//                   </div>
//                 </div>

//                 {/* Chat Area with Scroll */}
//                 <div className="flex-1 overflow-y-auto p-6 flex flex-col">
//                   {messages.length === 0 ? (
//                     <div className="text-center text-gray-500 mt-10">
//                       <span role="img" aria-label="sparkles">✨</span> Start the conversation! Ask me anything...
//                     </div>
//                   ) : (
//                     messages.map((msg, index) => (
//                       <div
//                         key={index}
//                         className={`flex mb-2 ${
//                           msg.sender === "user" ? "justify-end" : "justify-start"
//                         }`}
//                       >
//                         <div
//                           className={`max-w-2xl p-3 rounded-lg ${
//                             msg.sender === "user"
//                               ? "bg-indigo-600 text-white rounded-br-none"
//                               : "bg-gray-700 text-gray-300 rounded-bl-none"
//                           }`}
//                         >
//                           {msg.text}
//                         </div>
//                       </div>
//                     ))
//                   )}
//                   <div ref={chatAreaRef} /> {/* For auto-scrolling */}
//                 </div>

//                 {/* Input Area */}
//                 <div className="bg-gray-800 p-6 border-t border-gray-700">
//                   <div className="flex items-center">
//                     <input
//                       type="text"
//                       value={input}
//                       onChange={(e) => setInput(e.target.value)}
//                       onKeyPress={handleKeyPress}
//                       className="flex-1 p-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-white placeholder-gray-400"
//                       placeholder="Ask away..."
//                     />
//                     <button
//                       onClick={handleSend}
//                       className="bg-indigo-600 text-white px-6 py-3 rounded-lg ml-2 hover:bg-indigo-700 transition-colors font-medium"
//                     >
//                       Send
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           );
//         }
     