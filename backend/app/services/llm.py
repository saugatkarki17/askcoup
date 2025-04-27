# backend/app/services/llm.py
import os
import google.generativeai as genai
from google.generativeai.types import GenerationConfig



# Configure LLM
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
LLM_MODEL_NAME = "gemini-2.0-flash" # Example LLM model

llm_model = None

def initialize_llm():
    """Initializes the Language Model."""
    global llm_model
    if llm_model is None:
        if GOOGLE_API_KEY:
            try:
                print(f"Initializing LLM: {LLM_MODEL_NAME}...")
                genai.configure(api_key=GOOGLE_API_KEY)
                llm_model = genai.GenerativeModel(LLM_MODEL_NAME)
                print("LLM initialized successfully.")
            except Exception as e:
                print(f"Error initializing Google Generative AI: {e}")
                llm_model = None # Set to None on error
        else:
            print("GOOGLE_API_KEY environment variable not set. LLM functionality will be disabled.")
            llm_model = None

def generate_answer_from_context(query: str, context: list[str]):
    """Generates an answer using the LLM based on the query and context."""
    if llm_model is None:
        print("LLM not initialized.")
        return "Sorry, the AI model is not available."

    try:
        # Construct the prompt for the LLM
        # This prompt engineering is crucial for RAG performance
        # It instructs the LLM to use the provided context
        prompt = f"""You are a helpful AI assistant providing information about the university based on the following context.
If the answer is not in the context, say you don't know or cannot find the information.

Context:
{chr(10).join(context)}

Question: {query}

Answer:"""

        print("Sending prompt to LLM...")
        # Optional: Configure generation parameters like temperature, top_p, top_k
        # generation_config = GenerationConfig(temperature=0.7, top_p=0.95, top_k=50)
        response = llm_model.generate_content(prompt)
        print("Received response from LLM.")

        # Extract the text from the LLM response.
        # Note: Error handling for potentially empty or malformed responses might be needed
        return response.text

    except Exception as e:
        print(f"Error generating LLM answer: {e}")
        # More specific error handling might be needed based on LLM API errors
        return "Sorry, I encountered an error while generating the answer."

# Initialize the LLM when the module is imported
initialize_llm()