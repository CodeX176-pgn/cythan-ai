"""
CyThan AI Backend
Streaming FastAPI backend using Google Gemini 3.5 Flash.
"""

from __future__ import annotations

import json
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# --------------------------------------------------------------------
# Environment
# --------------------------------------------------------------------

load_dotenv()

API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY not found. "
        "Please create a .env file or export the variable."
    )

client = genai.Client(api_key=API_KEY)
MODEL_NAME = "gemini-3.5-flash"
# --------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cythan-backend")

# --------------------------------------------------------------------
# FastAPI
# --------------------------------------------------------------------

app = FastAPI(
    title="CyThan AI Backend",
    version="1.0.0",
)

# --------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",

        "http://127.0.0.1:3000",
        "http://localhost:3000",

        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------------------------------------------------------
# Request Model
# --------------------------------------------------------------------


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)


# --------------------------------------------------------------------
# Health Check
# --------------------------------------------------------------------


@app.get("/")
async def root():
    return {"status": "running"}

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "CyThan AI",
    }


# --------------------------------------------------------------------
# Chat Endpoint
# --------------------------------------------------------------------


@app.post("/api/chat")
async def chat(request: ChatRequest):

    try:

        conversation: list[types.Content] = []

        # Previous messages
        for msg in request.history:

            role = "user"

            if msg.role.lower() == "assistant":
                role = "model"

            conversation.append(
                types.Content(
                    role=role,
                    parts=[types.Part(text=msg.content)],
                )
            )

        # Latest user message
        conversation.append(
            types.Content(
                role="user",
                parts=[types.Part(text=request.message)],
            )
        )

        async def stream():

            try:

                async for chunk in (
                    await client.aio.models.generate_content_stream(
                        model=MODEL_NAME,
                        contents=conversation,
                        config=types.GenerateContentConfig(
                            system_instruction=(
                                "You are CyThan AI, a helpful, intelligent, and friendly AI "
                                "assistant. Your name is CyThan AI. Never claim to be Gemini "
                                "when asked who you are; explain that you are CyThan AI, "
                                "powered by Google's Gemini technology.\n\n"

                                "You can help users with programming, mathematics, learning, "
                                "problem solving, brainstorming, writing, and general questions.\n\n"

                                "Give accurate and useful answers. Explain difficult concepts "
                                "clearly and adapt your explanations to the user's level. "
                                "For programming questions, provide clean, readable code and "
                                "explain important parts when useful.\n\n"

                                "Be friendly and conversational without being unnecessarily "
                                "verbose. Use Markdown when it improves readability."
                            )
                        )
                    )
                ):

                    if chunk.text:
                        yield chunk.text

            except Exception:

                logger.exception("Gemini streaming error")

                error = {
                    "error": "CyThan AI encountered an error while generating a response. "
                             "Please try again."
                }

                yield f"\n{json.dumps(error)}"

        return StreamingResponse(
            stream(),
            media_type="text/plain",
        )

    except Exception:

        logger.exception("Request processing failed")

        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing your request.",
        )
