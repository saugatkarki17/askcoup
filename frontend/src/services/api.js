export async function sendMessageToBot(userMessage) {
    try {
      const res = await fetch("http://localhost:8000/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      return data.reply;
    } catch (error) {
      console.error(error);
      return "Error contacting the bot.";
    }
  }
  