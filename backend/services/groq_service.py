import os
import logging
from groq import Groq
from dotenv import load_dotenv
from typing import Dict, Any, List

load_dotenv()
logger = logging.getLogger(__name__)

# Reusable configuration
MODEL_NAME = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")

class GroqService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            logger.error("CRITICAL: GROQ_API_KEY environment variable is missing.")
        # Initialize client lazily or immediately if key exists
        self.client = Groq(api_key=self.api_key) if self.api_key else None

    def test_connection(self) -> Dict[str, Any]:
        """
        Tests the connection to the Groq API using a simple request.
        Returns a success message if the model is reachable.
        """
        if not self.client:
            return {"status": "error", "message": "Groq API key is missing."}
            
        try:
            completion = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": "Hello, respond with exactly 'connection successful'."}],
                max_tokens=10,
                temperature=0.0
            )
            response_text = completion.choices[0].message.content.strip().lower()
            if "connection successful" in response_text:
                return {"status": "success", "message": "Successfully connected to Groq API using llama-3.3-70b-versatile."}
            else:
                return {"status": "success", "message": "Connection succeeded but received unexpected response.", "details": response_text}
        except Exception as e:
            logger.error(f"Groq API connection test failed: {e}")
            return {"status": "error", "message": f"Connection failed: {str(e)}"}

    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        """
        Generates a JSON response from the Groq API.
        """
        if not self.client:
            raise ValueError("Missing Groq API Key")
            
        try:
            completion = self.client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            return completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq generation error: {e}")
            raise e

# Singleton instance
groq_service = GroqService()
