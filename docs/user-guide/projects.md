# Managing Projects

Projects are the core of your chatbot experience. Each project represents a separate chatbot with its own knowledge base.

## Creating a Project

1.  Log in to the **Dashboard**.
2.  Click **"New Project"**.
3.  Give your project a name (e.g., "Customer Support Bot").
4.  Your project is now created!

## Ingesting Data (Knowledge Base)

To make your chatbot smart, you need to "ingest" data. This is how you teach it about your business or content.

### Uploading Files
1.  Navigate to your **Project Dashboard**.
2.  Click on the **"Sources"** or **"Ingestion"** tab.
3.  Click **"Upload Files"**.
4.  Select PDF, Text, or Markdown files from your computer.
5.  Supported formats: `.pdf`, `.txt`, `.md`.
6.  The system will process these files (parse, chunk, and embed them). You will see the status change to `Completed` when ready.

### Adding URLs
1.  In the **"Sources"** tab, select **"Add URL"**.
2.  Enter the full website address (e.g., `https://example.com/pricing`).
3.  The system will fetch the content of that page and add it to the knowledge base.

## API Keys

While primarily for developers, you may need to manage API Keys if you are using external integrations.
-   Go to **"Settings" > "API Keys"**.
-   You can create new keys or revoke existing ones.
-   **Security Warning**: Never share your API keys publicly.
