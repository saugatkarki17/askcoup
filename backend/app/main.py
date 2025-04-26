from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow frontend CORS (localhost:5173 is Vite default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.post("/chatbot")
async def chatbot_endpoint(req: ChatRequest):
    user_message = req.message
    # Simple bot logic (later you can replace with your AI model)
    if "hello" in user_message.lower():
        reply = "Hi there! How can I help you?"
    elif "bye" in user_message.lower():
        reply = "Goodbye! Have a nice day!"
    else:
        reply = f"You said: {user_message}"
    return {"reply": reply}
