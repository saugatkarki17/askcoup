# backend/app/services/llm.py

import os
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

# Global variables
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
LLM_MODEL_NAME = "gemini-2.0-flash"
llm_model = None

def initialize_llm():
    """Initializes the Google Generative AI Language Model."""
    global llm_model
    if llm_model is None:
        if not GOOGLE_API_KEY:
            print("GOOGLE_API_KEY not set. LLM functionality disabled.")
            return
        try:
            print(f"Initializing LLM: {LLM_MODEL_NAME}...")
            genai.configure(api_key=GOOGLE_API_KEY)
            llm_model = genai.GenerativeModel(LLM_MODEL_NAME)
            print("LLM initialized successfully.")
        except Exception as e:
            print(f"Error initializing LLM: {e}")
            llm_model = None

def generate_answer_from_context(query: str, context: list[str]) -> str:
    """Generates an intelligent answer based on query and provided context."""
    if llm_model is None:
        return "Sorry, the AI model is currently unavailable. Please try again later."

    try:
        # Build a strong RAG prompt
        context_text = "\n- ".join(context)
        prompt = f"""
You are a highly knowledgeable assistant for Caldwell University. Use ONLY the provided context below to answer the student's question politely and clearly. 
If the context does not contain an answer, politely say you don't know or suggest checking official sources.

Always format your replies using:
- Full sentences
- Professional, friendly tone
- Markdown formatting (use bullets, bold, headings if needed)
- Mention links cleanly if available.

Make answers in points if needed

Context:
- {context_text}

Question: {query}

Answer:
"""

        print("Sending prompt to LLM...")

        # Optional: Add generation parameters if needed
        generation_config = GenerationConfig(temperature=0.4, top_p=0.9)

        response = llm_model.generate_content(prompt)
        print("Received response from LLM.")

        if hasattr(response, "text"):
            return response.text.strip()
        else:
            return "Sorry, I couldn't generate a proper answer."

    except Exception as e:
        print(f"Error during answer generation: {e}")
        return "Sorry, I encountered an error while generating the response."

# Initialize on module load
initialize_llm()
