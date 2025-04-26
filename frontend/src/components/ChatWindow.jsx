import { useState, useRef, useEffect } from "react";
        import findAnswer from "../utils/findAnswer";

        export default function Chatbot() {
          const [input, setInput] = useState("");
          const [messages, setMessages] = useState([]);
          const chatAreaRef = useRef(null);

          useEffect(() => {
            // Scroll to the bottom of the chat area whenever messages update
            chatAreaRef.current?.scrollIntoView({ behavior: "smooth" });
          }, [messages]);

          const handleSend = () => {
            if (!input.trim()) return; // Prevent empty messages
            const userMessage = { text: input, sender: "user" };
            const botMessage = { text: findAnswer(input), sender: "bot" };

            setMessages([...messages, userMessage, botMessage]);
            setInput("");
          };

          const handleKeyPress = (e) => {
            if (e.key === "Enter") handleSend(); // Send on Enter key
          };

          return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
              <div className="w-full h-screen bg-gray-800 flex flex-col">
                {/* Header */}
                <div className="bg-gray-800 text-white p-6 flex items-center justify-center">
                  <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-xl p-6 shadow-lg text-center">
                    <h1 className="text-2xl font-semibold">Ask Coup</h1>
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
                  <div ref={chatAreaRef} /> {/* For auto-scrolling */}
                </div>

                {/* Input Area */}
                <div className="bg-gray-800 p-6 border-t border-gray-700">
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 p-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-white placeholder-gray-400"
                      placeholder="Ask away..."
                    />
                    <button
                      onClick={handleSend}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg ml-2 hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }
     