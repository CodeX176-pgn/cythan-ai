# CyThan AI

CyThan AI is a full-stack, ChatGPT-style AI application built with a vanilla HTML/CSS/JavaScript frontend and a Python FastAPI backend powered by Google's Gemini 3.5 Flash-lite-lite model.

The frontend is designed to be lightweight, responsive, and deployable as a static website, while the backend handles AI requests and streams Gemini responses to the browser in real time.

---

## Features

* Modern dark-mode chat interface
* Responsive desktop and mobile layout
* Chat history maintained in memory
* Real-time AI response streaming
* Google Gemini 3.5 Flash-lite
* FastAPI backend
* Vanilla JavaScript frontend
* `uv` dependency management
* Dockerized backend
* GitHub Pages frontend deployment
* Render/Railway backend deployment
* CORS support for frontend/backend communication

---

## Project Structure

```text
cythan-ai/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── backend/
│   ├── main.py
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── pyproject.toml
│   ├── uv.lock
│   └── .env
│
├── .github/
│   └── workflows/
│       └── deploy-frontend.yml
│
├── .gitignore
└── README.md
```

---

# Requirements

Before starting, install:

* Python 3.13+
* `uv`
* Git
* A Google AI Studio API key
* A GitHub account

Docker is recommended for testing the production backend locally.

---

# Backend Setup

## 1. Enter the backend directory

```bash
cd backend
```

---

## 2. Initialize the project

If you are creating the backend from scratch:

```bash
uv init
```

---

## 3. Install dependencies

```bash
uv add fastapi uvicorn google-genai python-dotenv
```

This creates or updates:

```text
pyproject.toml
uv.lock
```

The lock file should be committed to Git.

---

# Google Gemini API Key

CyThan AI uses Google's Gemini API through the `google-genai` Python SDK.

Create a `.env` file inside the `backend` directory:

```text
backend/.env
```

Add:

```env
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

Never commit the real `.env` file to GitHub.

The backend reads the key using:

```python
import os

api_key = os.environ.get("GEMINI_API_KEY")
```

---

# Run the Backend Locally

From the `backend` directory:

```bash
uv run uvicorn main:app --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

FastAPI's interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

---

# Frontend Setup

The frontend does not require Node.js or a JavaScript framework.

The files are:

```text
frontend/
├── index.html
├── style.css
└── app.js
```

The JavaScript automatically uses the local backend during development:

```text
http://127.0.0.1:8000
```

and the production backend when the website is deployed.

Update the production URL in `app.js`:

```javascript
const CONFIG = {

    localBackend:
        "http://127.0.0.1:8000",

    productionBackend:
        "https://YOUR-CYTHAN-BACKEND.onrender.com"

};
```

Replace the production URL with the URL provided by your cloud provider.

---

# Run the Frontend Locally

You can use a simple local development server.

For example, from the `frontend` directory:

```bash
python -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500
```

Make sure the FastAPI backend is running at the same time.

Your local architecture is:

```text
Browser
   │
   │
   ▼
Frontend
127.0.0.1:5500
   │
   │ POST /api/chat
   ▼
FastAPI
127.0.0.1:8000
   │
   │
   ▼
Gemini 3.5 Flash-lite
```

---

# Test the Chat

Enter a message such as:

```text
Explain Python functions in simple terms.
```

The frontend sends:

```json
{
    "message": "Explain Python functions in simple terms.",
    "history": []
}
```

The backend sends the request to Gemini and streams the response back to the browser.

As chunks arrive, the frontend displays them in real time.

---

# Docker

The backend includes a production Dockerfile using `uv`.

From the repository root:

```bash
docker build -t cythan-backend ./backend
```

Run it:

```bash
docker run \
    --rm \
    -p 8000:8000 \
    -e GEMINI_API_KEY="YOUR_API_KEY_HERE" \
    cythan-backend
```

The backend should now be available at:

```text
http://127.0.0.1:8000
```

---

# Git Configuration

From the project root:

```bash
git init
```

Add the files:

```bash
git add .
```

Create the first commit:

```bash
git commit -m "Prepare CyThan AI for deployment"
```

Add your GitHub repository:

```bash
git remote add origin https://github.com/YOUR_USERNAME/cythan-ai.git
```

Push the project:

```bash
git branch -M main
git push -u origin main
```

---

# Deploy the Backend to Render

## 1. Create a Render Web Service

Connect your GitHub repository to Render.

Select:

```text
Runtime: Docker
Root Directory: backend
```

Render will find:

```text
backend/Dockerfile
```

and build the backend automatically.

---

## 2. Configure the Gemini API key

In your Render service:

```text
Environment
    ↓
Environment Variables
```

Add:

```text
GEMINI_API_KEY
```

with the value of your Google AI Studio API key.

Do not put the key in your Git repository.

---

## 3. Deploy

Render will build the Docker image and start the FastAPI application.

The backend will receive a URL similar to:

```text
https://cythan-backend.onrender.com
```

Your API endpoint will therefore be:

```text
https://cythan-backend.onrender.com/api/chat
```

---

# CORS Configuration

The backend must allow requests from the GitHub Pages website.

For example:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://YOUR_USERNAME.github.io",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Replace:

```text
https://YOUR_USERNAME.github.io
```

with your actual GitHub Pages origin.

---

# Deploy the Frontend to GitHub Pages

The repository contains:

```text
frontend/
├── index.html
├── style.css
└── app.js
```

The GitHub Actions workflow in:

```text
.github/workflows/deploy-frontend.yml
```

automatically publishes this directory.

Push your changes:

```bash
git add .
git commit -m "Deploy frontend"
git push
```

GitHub Actions will deploy the frontend.

Your website will have a URL similar to:

```text
https://YOUR_USERNAME.github.io/cythan-ai/
```

---

# Production Architecture

After deployment, the application looks like this:

```text
                  INTERNET
                     │
                     ▼
        ┌─────────────────────────┐
        │       GitHub Pages      │
        │                         │
        │  index.html             │
        │  style.css              │
        │  app.js                 │
        └────────────┬────────────┘
                     │
                     │ HTTPS
                     │ POST /api/chat
                     ▼
        ┌─────────────────────────┐
        │         Render          │
        │                         │
        │     Docker Container    │
        │            │            │
        │        FastAPI          │
        │            │            │
        │      google-genai       │
        └────────────┬────────────┘
                     │
                     │ HTTPS
                     ▼
        ┌─────────────────────────┐
        │    Google Gemini API    │
        │                         │
        │  Gemini 3.5 Flash-lite  │
        └─────────────────────────┘
```

---

# Security

Never expose your Gemini API key in frontend JavaScript.

Do NOT do this:

```javascript
const GEMINI_API_KEY = "AIza...";
```

Instead:

```text
Frontend
    │
    │ API request
    ▼
FastAPI Backend
    │
    │ GEMINI_API_KEY
    ▼
Google Gemini
```

The Gemini API key should only exist as a server-side environment variable.

---

# Development Workflow

After making changes:

```bash
git add .
git commit -m "Update CyThan AI"
git push
```

GitHub Pages will deploy the frontend workflow automatically.

Render can automatically deploy the backend when the connected branch receives a new commit.

---

# Troubleshooting

## Backend won't start

Check:

```bash
uv run uvicorn main:app --reload
```

Then visit:

```text
http://127.0.0.1:8000/docs
```

---

## Gemini API error

Check that:

```env
GEMINI_API_KEY=...
```

exists locally.

For Render, verify the variable exists in:

```text
Render Dashboard
→ Your Service
→ Environment
```

---

## CORS error

Make sure the exact GitHub Pages origin is included in:

```python
allow_origins
```

For example:

```text
https://username.github.io
```

not the complete page path.

---

## Frontend cannot connect to backend

Check the production URL in:

```text
frontend/app.js
```

For example:

```javascript
productionBackend:
    "https://cythan-backend.onrender.com"
```

Then verify:

```text
https://cythan-backend.onrender.com/
```

returns the backend health response.

---

# Future Improvements

Possible next features include:

* Persistent conversations
* User authentication
* Markdown rendering
* Code syntax highlighting
* Copy-code buttons
* Regenerate response
* Stop-generation button
* Conversation deletion
* Chat search
* Database storage
* PostgreSQL
* Rate limiting
* API usage monitoring
* Better error reporting
* Production logging
* Streaming using Server-Sent Events
* Custom CyThan AI system instructions

---

# License

Add your preferred license here.

---

## Summary

CyThan AI uses:

| Component              | Technology                      |
| ---------------------- | ------------------------------- |
| Frontend               | HTML + CSS + Vanilla JavaScript |
| Backend                | FastAPI                         |
| AI                     | Gemini 3.5 Flash-lite           |
| Python package manager | uv                              |
| Python SDK             | google-genai                    |
| Local configuration    | python-dotenv                   |
| Backend deployment     | Render / Railway                |
| Frontend deployment    | GitHub Pages                    |
| Containerization       | Docker                          |
| Source control         | Git + GitHub                    |

CyThan AI is designed so the frontend and backend can be developed independently while communicating through a simple `/api/chat` streaming API.
