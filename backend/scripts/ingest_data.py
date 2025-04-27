# backend/scripts/ingest_data.py

import os
import sys
import pdfplumber
import re

# Add app folder to path for absolute imports
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.services.embedding import get_embedding  # embedding function
from app.services.vectorstore import store_in_pinecone  # function to STORE
from app.main import pinecone_index_obj  # your initialized pinecone index

# --- Constants ---
PDF_FOLDER_PATH = os.path.join(os.path.dirname(__file__), "..", "data")
PDF_FILES = [
    "GENERAL.pdf",       
    "CONTACTS.pdf",  
]

# --- Functions ---
def load_pdf_text(pdf_path):
    """Extracts text from a single PDF and splits it into smaller chunks."""
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return []

    print(f"Loading and reading PDF: {pdf_path}")
    texts = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    chunks = split_text_into_chunks(text)
                    texts.extend(chunks)
                else:
                    print(f"Warning: Page {page_num + 1} has no extractable text.")
    except Exception as e:
        print(f"Error reading PDF file: {e}")
        return []

    return texts

def split_text_into_chunks(text, max_length=500):
    """Splits text into smaller chunks of roughly max_length characters."""
    sentences = re.split(r'(?<=[.!?]) +', text)
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= max_length:
            current_chunk += sentence + " "
        else:
            chunks.append(current_chunk.strip())
            current_chunk = sentence + " "

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks

def ingest_pdfs(pdf_folder, pdf_list):
    """Ingests multiple PDFs into the vector store."""
    total_entries = 0
    for pdf_file in pdf_list:
        pdf_path = os.path.join(pdf_folder, pdf_file)
        knowledge_base_entries = load_pdf_text(pdf_path)

        if not knowledge_base_entries:
            print(f"Skipping {pdf_file} because no entries were found.")
            continue

        print(f"Preparing {len(knowledge_base_entries)} entries from {pdf_file} for ingestion...")

        for idx, entry in enumerate(knowledge_base_entries):
            try:
                embedding = get_embedding(entry)  # Get embedding
                store_in_pinecone(pinecone_index_obj, embedding, metadata={"text": entry})
                print(f"Ingested entry {idx + 1}/{len(knowledge_base_entries)} from {pdf_file}")
                total_entries += 1
            except Exception as e:
                print(f"Failed to ingest entry {idx + 1} from {pdf_file}: {e}")

    print(f" Finished ingestion. Total entries stored: {total_entries}")

# --- Main ---
def main():
    ingest_pdfs(PDF_FOLDER_PATH, PDF_FILES)

if __name__ == "__main__":
    main()
