# Contextly - RAG Chatbot Platform  
 
Welcome to **Contextly**, a production-ready RAG (Retrieval-Augmented Generation) chatbot platform designed to be powerful, scalable, and easy to deploy.

## Overview

Contextly allows you to create custom chatbots trained on your own data. It features a robust backend for processing and vector search, a modern dashboard for management, and a lightweight widget for embedding chats on any website.

### Key Features
- **Hybrid Search**: Combines vector semantic search with keyword search for optimal retrieval.
- **Semantic Chunking**: Intelligently splits documents to preserve context.
- **Async Processing**: Heavy lifting (ingestion, embedding) is handled in the background by Dramatiq workers.
- **Widget Integration**: Easily embeddable chat widget for semantic search on your site.

---

## Project Structure

The repository is organized into three main components:

- **Backend** (`/backend`): The core logic, API, and background workers. Built with **FastAPI**, **PostgreSQL** (`pgvector`), and **Redis**.
- **Frontend** (`/frontend`): The user dashboard and widget UI. Built with **Next.js**, **React**, and **TailwindCSS**.
- **Contextly Widget** (`/contextly-widget`): A framework-agnostic NPM package for embedding the chatbot.

---

## Quick Start

We provide a helper script to get your local development environment (Database + Redis + Backend) up and running quickly.

### Prerequisites
- Docker & Docker Compose
- Node.js & npm/pnpm (for frontend)

### 1. Start Development Environment
Run the development setup script:
```bash
./backend/scripts/dev_up.sh
```
This script acts as a "one-stop shop" to:
- Check for Docker and start Redis/Infrastructure.
- Start the FastAPI backend on `http://localhost:8001`.
- Start the Next.js frontend on `http://localhost:3000`.

*Note: The first time you run this, you may need to install frontend dependencies manually if the script doesn't handle it, or just run `pnpm install` in `frontend/` once.*

---

## Backend Documentation

Located in `/backend`. **[Read the Backend Guide](backend/README.md)**

### Core Stack
- **API**: FastAPI
- **Database**: PostgreSQL with `pgvector`
- **Queue**: Redis + Dramatiq
- **LLM**: Azure OpenAI (extensible to others)

### Configuration
Create a `.env` file in the `backend/` directory. See `backend/.env.example` for a template.

**Key Environment Variables:**
- `DATABASE_URL`: Connection string for PostgreSQL.
- `REDIS_URL`: Connection string for Redis.
- `AZURE_OPENAI_API_KEY`: Your LLM provider key.
- `JWT_SECRET`: Secret for signing auth tokens.

For a full list of configuration options, please refer to `backend/README.md`.

---

## Frontend Documentation

Located in `/frontend`. **[Read the Frontend Guide](frontend/README.md)**

### Routes
- `/` - Marketing Landing Page
- `/projects` - Main Dashboard
- `/auth/*` - Authentication logic
- `/widget` - The iframe rendering the chat interface

### Commands
- `npm run dev`: Start development server.
- `npm run build`: Build for production.

---

## Widget Package

The `contextly-widget` is available as an NPM package for easy integration. **[Read the Widget Guide](contextly-widget/README.md)**

```bash
npm install contextly-widget
```

It allows you to inject the chat bubble into any website with a simple script tag or import, keeping your host site's styles clean by using an iframe/shadow DOM.

---

## Deployment

### Docker
The backend is fully containerized. To deploy updates:
1. Ensure your `.env` and Firebase credentials are in the `backend/` directory on your server.
2. The GitHub Action (`.github/workflows/deploy.yml`) will automatically build and deploy changes pushed to `main` (specifically for changes in `backend/`).

### Frontend
The frontend is a standard Next.js application, deployable to Vercel or any container service.

---

*Built with ❤️ by me , Antigravity , chatgpt , grok.ai , deepseek , claude , gemini*
