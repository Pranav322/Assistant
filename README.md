# Contextly

This is the repository for Contextly, a RAG (Retrieval-Augmented Generation) chatbot platform. This is a production-grade system composed of several moving parts that actually do something useful.

## Structure

The repository is split into three main components. 

### 1. Backend (`/backend`)
The brain of the operation.
- **Stack**: FastAPI (Python), PostgreSQL with `pgvector` for embeddings, Redis for caching/queueing, and Dramatiq for background workers.
- **Function**: Handles ingestion, vector search, chat logic, and user management.
- **Deployment**: It runs in Docker. 

### 2. Frontend (`/frontend`)
The face of the operation.
- **Stack**: Next.js (React), TailwindCSS.
- **Function**: Provides the dashboard for managing chatbots, projects, and viewing analytics.
- **Deployment**: Next.js standard deployment. Vercel.

### 3. Widget (`/contextly-widget`)
The appendable limb.
- **Type**: NPM Package (`contextly-widget`).
- **Function**: A lightweight, framework-agnostic script that embeds the chat interface into third-party websites.
- **Usage**:
  ```bash
  npm install contextly
  ```
  Then import it and initialize it. It renders inside an iframe or shadow DOM to avoid polluting the host site's CSS.

## Development


### Quick Start
To spin up the local development environment (Backend + Database + Redis):

```bash
./backend/scripts/dev_up.sh
```

This script is smart enough to find the docker executables and set up the environment. 
## Deployment

The backend is containerized. The `deploy.yml` workflow handles pushing updates to the VPS.
- It expects specific secrets to be set in the repository.
- It expects the VPS to have the environment files (`.env`, `firebase-credentials.json`) inside the `backend/` directory.

---

