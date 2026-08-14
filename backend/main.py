"""
CyThan AI Backend
FastAPI backend using Google Gemini.

Features:
- Streaming text chat
- Persistent chat history handled by the frontend
- Gemini quota detection
- Global AI service cooldown
- AI service status endpoint
- API backend for the CyThan AI frontend
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from google import genai
from google.genai import types
from pydantic import BaseModel, Field, field_validator

# --------------------------------------------------------------------
# Environment
# --------------------------------------------------------------------

ENVIRONMENT = os.environ.get("ENVIRONMENT", "production").strip().lower()

# Only load .env during explicit local development. Production secrets
# must come from the hosting provider's environment variables.
if ENVIRONMENT in {"development", "dev", "local"}:
    load_dotenv()

API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY not found. "
        "Please create a .env file or export the variable."
    )


client = genai.Client(
    api_key=API_KEY
)


# --------------------------------------------------------------------
# Models
# --------------------------------------------------------------------

CHAT_MODEL = "gemini-3.5-flash-lite"


# --------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO
)

logger = logging.getLogger(
    "cythan-backend"
)


# --------------------------------------------------------------------
# FastAPI
# --------------------------------------------------------------------

app = FastAPI(
    title="CyThan AI Backend",
    version="1.5.0",
    # API documentation is disabled by default in production. Set
    # ENABLE_API_DOCS=true only when interactive docs are needed.
    docs_url="/docs" if os.environ.get("ENABLE_API_DOCS", "false").lower() == "true" else None,
    redoc_url="/redoc" if os.environ.get("ENABLE_API_DOCS", "false").lower() == "true" else None,
    openapi_url="/openapi.json" if os.environ.get("ENABLE_API_DOCS", "false").lower() == "true" else None,
)


# --------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------

# Trust only the hostnames that should ever reach this API. Additional
# hosts can be supplied through ALLOWED_HOSTS as a comma-separated list.
_default_hosts = [
    "cythan-ai.onrender.com",
    "localhost",
    "127.0.0.1",
]
_allowed_hosts = [
    host.strip()
    for host in os.environ.get("ALLOWED_HOSTS", ",".join(_default_hosts)).split(",")
    if host.strip()
]

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=_allowed_hosts,
)

# The frontend does not use cookies or browser credentials. Keep CORS
# narrowly scoped to the production site plus local development origins.
_default_origins = [
    "https://codex176-pgn.github.io",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]
_allowed_origins = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", ",".join(_default_origins)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# --------------------------------------------------------------------
# SECURITY HEADERS
# --------------------------------------------------------------------

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    )
    # HSTS is safe here because the public Render service is HTTPS-only.
    response.headers.setdefault(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
    )

    # Prevent browsers/proxies from caching API responses that may
    # contain user-specific chat data or service status.
    if request.url.path.startswith("/api/") or request.url.path == "/health":
        response.headers.setdefault("Cache-Control", "no-store")

    return response


# --------------------------------------------------------------------
# REQUEST SIZE PROTECTION
# --------------------------------------------------------------------

MAX_REQUEST_BODY_BYTES = 512 * 1024


@app.middleware("http")
async def enforce_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")

    if content_length:
        try:
            if int(content_length) > MAX_REQUEST_BODY_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={
                        "error": "REQUEST_TOO_LARGE",
                        "message": "The request is too large. Please shorten the message or conversation history.",
                    },
                )
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "INVALID_CONTENT_LENGTH",
                    "message": "The request contains an invalid Content-Length header.",
                },
            )

    return await call_next(request)


# --------------------------------------------------------------------
# VALIDATION ERROR HANDLER
# --------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    logger.warning(
        "Rejected invalid request: %s %s",
        request.method,
        request.url.path,
    )

    return JSONResponse(
        status_code=422,
        content={
            "error": "INVALID_REQUEST",
            "message": (
                "The request is invalid or exceeds the allowed limits. "
                "Please check your message and conversation data."
            ),
        },
    )


# --------------------------------------------------------------------
# Global AI Service State
# --------------------------------------------------------------------

# Timestamp until which Gemini should be considered unavailable.
#
# This is intentionally global to the backend process.
#
# If the API is running on a single Render instance, all visitors
# connected to that instance will see the same service state.
AI_COOLDOWN_UNTIL = 0.0


# Lock used when starting Gemini requests.
#
# This helps prevent several requests arriving at exactly the same
# time from all hitting Gemini before the cooldown state is updated.
AI_REQUEST_LOCK = asyncio.Lock()


# Default cooldown if Gemini does not provide a retry delay.
DEFAULT_COOLDOWN_SECONDS = 60

# --------------------------------------------------------------------
# REQUEST PROTECTION
# --------------------------------------------------------------------

# These limits are deliberately conservative for a public demo. They
# protect the single Gemini API key without making normal conversation
# frustrating. The counters live in memory and therefore reset when
# the backend restarts. For a multi-instance deployment, use a shared
# rate-limit store such as Redis later.
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 10
RATE_LIMIT_HISTORY_MAX_REQUESTS = 40
RATE_LIMIT_HISTORY_WINDOW_SECONDS = 3600
MAX_MESSAGE_LENGTH = 12_000
MAX_HISTORY_MESSAGES = 30
MAX_HISTORY_MESSAGE_LENGTH = 8_000

_request_log: dict[str, list[float]] = {}
_request_log_lock = asyncio.Lock()


def get_client_identifier(request: Request) -> str:
    """Return a stable client identifier for rate limiting.

    Render and other reverse proxies normally provide X-Forwarded-For.
    The first address is used in production; local development falls
    back to request.client.host. This value is used only for throttling
    and is never sent to Gemini.
    """
    forwarded_for = request.headers.get("x-forwarded-for")

    if forwarded_for:
        first_ip = forwarded_for.split(",", 1)[0].strip()
        if first_ip:
            return first_ip

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


async def check_rate_limit(client_id: str) -> tuple[bool, int]:
    """Check per-client minute/hour request limits.

    Returns (allowed, retry_after_seconds).
    """
    now = time.time()

    async with _request_log_lock:
        timestamps = _request_log.setdefault(client_id, [])

        cutoff_minute = now - RATE_LIMIT_WINDOW_SECONDS
        cutoff_hour = now - RATE_LIMIT_HISTORY_WINDOW_SECONDS

        timestamps[:] = [
            stamp for stamp in timestamps
            if stamp > cutoff_hour
        ]

        minute_count = sum(
            stamp > cutoff_minute
            for stamp in timestamps
        )

        if minute_count >= RATE_LIMIT_MAX_REQUESTS:
            oldest = min(
                stamp for stamp in timestamps
                if stamp > cutoff_minute
            )
            return False, max(1, int(oldest + RATE_LIMIT_WINDOW_SECONDS - now))

        if len(timestamps) >= RATE_LIMIT_HISTORY_MAX_REQUESTS:
            oldest = min(timestamps)
            return False, max(1, int(oldest + RATE_LIMIT_HISTORY_WINDOW_SECONDS - now))

        timestamps.append(now)

        # Keep the dictionary from growing forever if many visitors
        # connect to the service over time.
        if len(_request_log) > 5000:
            stale_before = now - RATE_LIMIT_HISTORY_WINDOW_SECONDS
            stale_keys = [
                key for key, values in _request_log.items()
                if not values or max(values) <= stale_before
            ]
            for key in stale_keys[:1000]:
                _request_log.pop(key, None)

        return True, 0



# --------------------------------------------------------------------
# AI SERVICE STATE HELPERS
# --------------------------------------------------------------------

def get_remaining_cooldown() -> int:
    """
    Return the estimated number of seconds remaining
    before the AI service becomes available.

    Returns 0 when the service is available.
    """

    remaining = (
        AI_COOLDOWN_UNTIL -
        time.time()
    )

    if remaining <= 0:
        return 0

    return max(
        1,
        int(
            remaining
        )
    )


def ai_service_available() -> bool:
    """
    Return True when CyThan is allowed to contact Gemini.
    """

    return (
        get_remaining_cooldown() <= 0
    )


def extract_retry_seconds(error: Exception) -> int:
    """
    Try to extract Gemini's suggested retry delay.

    Gemini commonly includes information such as:

        retry in 34s

    or:

        'retryDelay': '34s'

    If nothing can be extracted, fall back to a safe default.
    """

    error_text = str(error)

    patterns = [

        r"retry in\s+(\d+(?:\.\d+)?)s",

        r"retryDelay['\"]?\s*:\s*['\"](\d+)s['\"]",

        r"retryDelay.*?(\d+)s",

    ]


    for pattern in patterns:

        match = re.search(
            pattern,
            error_text,
            re.IGNORECASE
        )

        if match:

            try:

                seconds = float(
                    match.group(1)
                )

                return max(
                    1,
                    int(
                        seconds
                    )
                )

            except (
                ValueError,
                TypeError
            ):

                pass


    return DEFAULT_COOLDOWN_SECONDS


def mark_ai_unavailable(
    seconds: int
) -> None:
    """
    Mark the Gemini service as temporarily unavailable.
    """

    global AI_COOLDOWN_UNTIL

    new_until = (
        time.time() +
        max(
            1,
            seconds
        )
    )


    # Never shorten an existing cooldown.
    AI_COOLDOWN_UNTIL = max(
        AI_COOLDOWN_UNTIL,
        new_until
    )


    logger.warning(
        "Gemini AI service temporarily unavailable. "
        "Estimated cooldown: %s seconds.",
        get_remaining_cooldown()
    )


def mark_ai_available() -> None:
    """
    Clear the cooldown state.
    """

    global AI_COOLDOWN_UNTIL

    if AI_COOLDOWN_UNTIL:

        logger.info(
            "Gemini AI service is available again."
        )

    AI_COOLDOWN_UNTIL = 0.0


def is_quota_error(
    error: Exception
) -> bool:
    """
    Determine whether an exception represents a Gemini
    rate-limit/quota exhaustion error.
    """

    error_text = str(
        error
    ).lower()


    return (
        "429" in error_text
        or
        "resource_exhausted" in error_text
        or
        "quota exceeded" in error_text
    )


def is_network_error(
    error: Exception
) -> bool:
    """
    Detect common local/network failures such as DNS resolution
    failures and connection failures.

    These are reported separately from Gemini quota exhaustion so
    the frontend can show a useful service-status message.
    """

    error_text = str(error).lower()

    network_terms = (
        "getaddrinfo failed",
        "connecterror",
        "connection refused",
        "connection reset",
        "name or service not known",
        "temporary failure in name resolution",
        "network is unreachable",
        "timed out",
        "timeout",
    )

    return any(
        term in error_text
        for term in network_terms
    )


# --------------------------------------------------------------------
# Request Models
# --------------------------------------------------------------------

class ChatMessage(BaseModel):

    role: str = Field(
        ...,
        min_length=1,
        max_length=20
    )

    content: str = Field(
        ...,
        min_length=1,
        max_length=MAX_HISTORY_MESSAGE_LENGTH
    )

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"user", "assistant"}:
            raise ValueError("role must be user or assistant")
        return normalized

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("content cannot be empty")
        return value


class ChatRequest(BaseModel):

    message: str = Field(
        ...,
        min_length=1,
        max_length=MAX_MESSAGE_LENGTH
    )

    history: list[ChatMessage] = Field(
        default_factory=list,
        max_length=MAX_HISTORY_MESSAGES
    )

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message cannot be empty")
        return value


# --------------------------------------------------------------------
# Health Check
# --------------------------------------------------------------------

@app.get("/health")
async def health_check():

    remaining = get_remaining_cooldown()


    return {

        "status":
            "ok" if remaining == 0 else "degraded",

        "service":
            "CyThan AI",

        "ai_available":
            remaining == 0,

        "cooldown_remaining":
            remaining,

    }


# --------------------------------------------------------------------
# AI STATUS
# --------------------------------------------------------------------

@app.get("/api/status")
async def ai_status():

    remaining = get_remaining_cooldown()

    if remaining == 0:
        return {
            "available": True,
            "status": "available",
            "cooldown_remaining": 0,
            "message": "AI service is available.",
        }

    return {
        "available": False,
        "status": "cooldown",
        "cooldown_remaining": remaining,
        "message": (
            "CyThan AI is temporarily unavailable because "
            "the AI service has reached its current usage limit."
        ),
    }


def service_unavailable_response(
    message: str,
    status_code: int = 503
) -> JSONResponse:
    """
    Return a safe, structured response for temporary service failures.
    """

    return JSONResponse(
        status_code=status_code,
        content={
            "error": "AI_SERVICE_UNAVAILABLE",
            "message": message,
        },
    )


# --------------------------------------------------------------------
# REQUEST RATE-LIMIT RESPONSE
# --------------------------------------------------------------------

def request_rate_limit_response(seconds: int) -> JSONResponse:
    seconds = max(1, seconds)

    return JSONResponse(
        status_code=429,
        content={
            "error": "REQUEST_RATE_LIMITED",
            "message": (
                "Too many requests were sent from this client. "
                "Please wait a moment and try again."
            ),
            "retry_after": seconds,
        },
        headers={
            "Retry-After": str(seconds),
        },
    )


# --------------------------------------------------------------------
# QUOTA ERROR RESPONSE
# --------------------------------------------------------------------

def quota_response(
    seconds: int
) -> JSONResponse:
    """
    Return a consistent response for Gemini quota exhaustion.
    """

    seconds = max(
        1,
        seconds
    )


    return JSONResponse(

        status_code=429,

        content={

            "error":
                "AI_SERVICE_UNAVAILABLE",

            "message":
                (
                    "CyThan AI is temporarily unavailable "
                    "because the AI service has reached "
                    "its current usage limit."
                ),

            "retry_after":
                seconds,

            "estimated_available_in":
                seconds,

        },

        headers={

            "Retry-After":
                str(seconds),

        },

    )


# --------------------------------------------------------------------
# SYSTEM INSTRUCTION
# --------------------------------------------------------------------

SYSTEM_INSTRUCTION = (
    "You are CyThan AI, a helpful, "
    "intelligent, and friendly AI "
    "assistant. Your name is CyThan AI. "

    "You were created by Ndoh Kamsi C. "
    "and are powered by Google's "
    "Gemini technology.\n\n"

    "Do not introduce yourself, mention "
    "your name, mention your creator, "
    "or explain what technology powers "
    "you unless the user asks about "
    "your identity, origin, creator, "
    "or capabilities.\n\n"

    "For normal questions, answer the "
    "user's question directly without "
    "an unnecessary greeting or "
    "introduction.\n\n"

    "You can help users with programming, "
    "mathematics, learning, problem "
    "solving, brainstorming, writing, "
    "and general questions.\n\n"

    "Give accurate and useful answers. "
    "Explain difficult concepts clearly "
    "and adapt your explanations to the "
    "user's level.\n\n"

    "For programming questions, provide "
    "clean, readable code and explain "
    "important parts when useful.\n\n"

    "Be friendly and conversational "
    "without being unnecessarily "
    "verbose. Use Markdown when it "
    "improves readability."
)


# --------------------------------------------------------------------
# CHAT ENDPOINT
# --------------------------------------------------------------------

@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    http_request: Request,
):

    # ---------------------------------------------------------------
    # Per-client request protection
    # ---------------------------------------------------------------

    client_id = get_client_identifier(http_request)
    allowed, retry_after = await check_rate_limit(client_id)

    if not allowed:
        logger.warning(
            "Request rate limit reached. Retry in %s seconds.",
            retry_after,
        )
        return request_rate_limit_response(retry_after)

    # ---------------------------------------------------------------
    # Check global cooldown BEFORE contacting Gemini
    # ---------------------------------------------------------------

    remaining = get_remaining_cooldown()


    if remaining > 0:

        logger.warning(
            "Chat request rejected because "
            "Gemini is in cooldown. "
            "Remaining: %s seconds.",
            remaining
        )


        return quota_response(
            remaining
        )


    try:

        conversation: list[
            types.Content
        ] = []


        # ------------------------------------------------------------
        # Previous messages
        # ------------------------------------------------------------

        for msg in request.history:

            role = "user"


            if (
                msg.role.lower()
                == "assistant"
            ):

                role = "model"


            conversation.append(

                types.Content(

                    role=role,

                    parts=[

                        types.Part(
                            text=msg.content
                        )

                    ],

                )

            )


        # ------------------------------------------------------------
        # Latest user message
        # ------------------------------------------------------------

        conversation.append(

            types.Content(

                role="user",

                parts=[

                    types.Part(
                        text=request.message
                    )

                ],

            )

        )


        # ------------------------------------------------------------
        # Start Gemini request
        #
        # IMPORTANT:
        #
        # We start the Gemini request BEFORE returning
        # StreamingResponse so a quota error can become
        # a real HTTP 429 response.
        # ------------------------------------------------------------

        async with AI_REQUEST_LOCK:

            # Check again after waiting for the lock.
            #
            # Another request may have triggered a quota
            # cooldown while this request was waiting.

            remaining = get_remaining_cooldown()


            if remaining > 0:

                return quota_response(
                    remaining
                )


            try:

                response_stream = (

                    await client.aio.models
                    .generate_content_stream(

                        model=CHAT_MODEL,

                        contents=conversation,

                        config=(
                            types.GenerateContentConfig(

                                system_instruction=
                                    SYSTEM_INSTRUCTION

                            )
                        )

                    )

                )


            except Exception as error:

                # ----------------------------------------------------
                # Gemini quota/rate-limit error
                # ----------------------------------------------------

                if is_quota_error(
                    error
                ):

                    retry_seconds = extract_retry_seconds(error)


                    mark_ai_unavailable(
                        retry_seconds
                    )


                    logger.warning(
                        "Gemini quota reached. "
                        "Retry after approximately "
                        "%s seconds.",
                        retry_seconds
                    )


                    return quota_response(
                        retry_seconds
                    )


                # ----------------------------------------------------
                # Network/connectivity error
                # ----------------------------------------------------

                if is_network_error(error):

                    logger.warning(
                        "Gemini service could not be reached: %s",
                        error
                    )

                    return service_unavailable_response(
                        (
                            "CyThan AI is temporarily unable to "
                            "reach the AI service. Please try again shortly."
                        ),
                        status_code=503,
                    )


                # ----------------------------------------------------
                # Other Gemini error
                # ----------------------------------------------------

                logger.exception(
                    "Gemini request failed"
                )


                raise HTTPException(

                    status_code=500,

                    detail=(
                        "CyThan AI encountered "
                        "an error while contacting "
                        "the AI service."
                    ),

                )


        # ------------------------------------------------------------
        # STREAM RESPONSE
        # ------------------------------------------------------------

        async def stream():

            try:

                async for chunk in (
                    response_stream
                ):

                    if chunk.text:

                        yield chunk.text


                # If the request successfully completed,
                # make sure the cooldown is cleared.

                mark_ai_available()


            except Exception as error:

                # ----------------------------------------------------
                # Quota error occurring during streaming
                #
                # This can happen if Gemini accepts the request
                # but later reports a quota problem.
                # ----------------------------------------------------

                if is_quota_error(
                    error
                ):

                    retry_seconds = extract_retry_seconds(error)


                    mark_ai_unavailable(
                        retry_seconds
                    )


                    logger.warning(
                        "Gemini quota reached "
                        "during streaming. "
                        "Cooldown: %s seconds.",
                        retry_seconds
                    )


                    error_data = {

                        "error":
                            "AI_SERVICE_UNAVAILABLE",

                        "message":
                            (
                                "CyThan AI is temporarily "
                                "unavailable because the "
                                "AI service has reached "
                                "its current usage limit."
                            ),

                        "retry_after":
                            retry_seconds,

                    }


                    yield (
                        "\n"
                        +
                        json.dumps(
                            error_data
                        )
                    )


                    return


                # ----------------------------------------------------
                # Network/connectivity error
                # ----------------------------------------------------

                if is_network_error(error):

                    logger.warning(
                        "Gemini streaming connection failed: %s",
                        error
                    )

                    error_data = {
                        "error": "AI_SERVICE_UNAVAILABLE",
                        "message": (
                            "CyThan AI is temporarily unable to "
                            "reach the AI service. Please try again shortly."
                        ),
                    }

                    yield (
                        "\n"
                        + json.dumps(error_data)
                    )

                    return


                # ----------------------------------------------------
                # Other streaming error
                # ----------------------------------------------------

                logger.exception(
                    "Gemini streaming error"
                )


                error_data = {

                    "error":
                        "GENERATION_ERROR",

                    "message":
                        (
                            "CyThan AI encountered "
                            "an error while generating "
                            "a response. Please try again."
                        ),

                }


                yield (
                    "\n"
                    +
                    json.dumps(
                        error_data
                    )
                )


        return StreamingResponse(

            stream(),

            media_type="text/plain",

        )


    except HTTPException:

        raise


    except Exception:

        logger.exception(
            "Request processing failed"
        )


        raise HTTPException(

            status_code=500,

            detail=(
                "An unexpected error occurred "
                "while processing your request."
            ),

        )
