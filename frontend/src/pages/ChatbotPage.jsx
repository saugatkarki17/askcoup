// import ChatWindow from "../components/ChatWindow";

// function ChatbotPage() {
//   return (
//     <div className="flex justify-center items-center p-6">
//       <ChatWindow />
//     </div>
//   );
// }

// export default ChatbotPage;

// Assuming this is in frontend/src/pages/ChatbotPage.jsx

import { useState, useRef, useEffect } from "react";
// Remove the import for findAnswer as we will use the backend API
// import findAnswer from "../utils/findAnswer";

// Import the API service function
import { sendMessageToBot } from "../services/api"; // Correct import path

export default function Chatbot() { // If this component is named differently in your project, adjust accordingly
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const chatAreaRef = useRef(null);

  useEffect(() => {
    // Scroll to the bottom of the chat area whenever messages update (and when isLoading changes to false)
    if (!isLoading) {
         chatAreaRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]); // Add isLoading to dependency array

  // Make handleSend an async function because sendMessageToBot is async
  const handleSend = async () => {
    if (!input.trim() || isLoading) return; // Prevent empty messages or sending while loading

    const userMessage = { text: input, sender: "user" };
    // Add the user message to the state immediately
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput(""); // Clear the input field

    setIsLoading(true); // Set loading state to true

    try {
      // Call the backend API instead of findAnswer
      const botReply = await sendMessageToBot(input);

      // Add the bot's message to the state once the API call is complete
      const botMessage = { text: botReply, sender: "bot" };
      setMessages(prevMessages => [...prevMessages, botMessage]);

    } catch (error) {
      console.error("Error sending message to backend:", error);
      // Add an error message to the chat
      const errorMessage = { text: "Sorry, there was an error getting a response.", sender: "bot" };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false); // Set loading state back to false
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { // Send on Enter, allow Shift+Enter for new line
        e.preventDefault(); // Prevent default Enter behavior (like new line in textarea)
        handleSend(); // Send on Enter key
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="w-full h-screen bg-gray-800 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white p-6 flex items-center justify-center">
          <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-xl p-6 shadow-lg text-center">
            <h1 className="text-2xl font-semibold">Ask Coug</h1>
            <p className="text-sm text-indigo-200 mt-1">Your intelligent companion</p>
          </div>
        </div>

        {/* Chat Area with Scroll */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <span role="img" aria-label="sparkles">✨</span> Start the conversation! Ask me anything...
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex mb-2 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
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
          {/* Loading indicator */}
          {isLoading && (
             <div className="flex justify-start mb-2">
                <div className="max-w-xs p-3 rounded-lg bg-gray-700 text-gray-300 rounded-bl-none">
                    <div className="dot-typing"></div> {/* Simple loading animation CSS needed */}
                </div>
             </div>
          )}
          <div ref={chatAreaRef} /> {/* For auto-scrolling */}
        </div>

        {/* Input Area */}
        <div className="bg-gray-800 p-6 border-t border-gray-700">
          <div className="flex items-center">
            <input
              type="text" // Changed from 'textarea' to 'input' based on original code, but 'textarea' is often better for chat input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 p-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-white placeholder-gray-400"
              placeholder={isLoading ? "Thinking..." : "Ask away..."} // Update placeholder while loading
              disabled={isLoading} // Disable input while loading
            />
            <button
              onClick={handleSend}
              className={`bg-indigo-600 text-white px-6 py-3 rounded-lg ml-2 hover:bg-indigo-700 transition-colors font-medium ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading} // Disable button while loading
            >
              {isLoading ? "Sending..." : "Send"} {/* Update button text while loading */}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// You might need to add CSS for the dot-typing animation.
// Example CSS (add this to your App.css or index.css):
/*
.dot-typing {
  position: relative;
  left: -10px;
  width: 5px;
  height: 5px;
  border-radius: 5px;
  background-color: #989b9e;
  color: #989b9e;
  animation: dotTyping 1.5s infinite linear;
}

.dot-typing::before,
.dot-typing::after {
  content: "";
  display: inline-block;
  position: absolute;
  top: 0;
  width: 5px;
  height: 5px;
  border-radius: 5px;
  background-color: #989b9e;
  color: #989b9e;
}

.dot-typing::before {
  left: -10px;
  animation: dotTyping 1.5s infinite linear -.5s;
}

.dot-typing::after {
  left: 10px;
  animation: dotTyping 1.5s infinite linear -1s;
}

@keyframes dotTyping {
  0% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(10px);
  }
  75% {
    transform: translateX(10px);
  }
  100% {
    transform: translateX(0);
  }
}
*/
