# Getting Started

Welcome to the RAG Chatbot Platform documentation. This section will help you get up and running quickly.

## What is RAG Chatbot Platform?

RAG Chatbot Platform is a production-ready AI chatbot solution that combines:

- **Hybrid Search** - Vector + keyword search for optimal relevance
- **Semantic Chunking** - Intelligent document parsing and splitting
- **Widget Integration** - Easy embeddable chat widget
- **Background Processing** - Async ingestion with Dramatiq workers

## Quick Navigation

| Guide | Description |
|-------|-------------|
| [Installation](installation.md) | Set up your development environment |
| [Quickstart](quickstart.md) | Get running in 5 minutes |
| [Configuration](configuration.md) | Configure environment variables |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Your Website                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Chat Widget (iframe)                │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      API Server                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Auth      │  │   Chat      │  │  Ingestion  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Postgres │  │  Redis   │  │    S3    │
    │(pgvector)│  │          │  │          │
    └──────────┘  └──────────┘  └──────────┘
```

## Next Steps

Ready to get started? Head to the [Installation](installation.md) guide.
