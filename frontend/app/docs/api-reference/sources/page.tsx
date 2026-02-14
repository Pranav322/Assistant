import { Markdown } from "@/components/markdown";

const content = `# Sources Endpoints

Sources are documents (files or URLs) that are ingested and indexed.

## POST /sources/upload

Upload a file to be processed.

**Headers:** \`x-api-key: chat_...\` (Standard for programmatic ingestion)

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| \`file\` | file | PDF, TXT, MD, or DOCX |

Response (202):
\`\`\`json
{
  "id": "src_123",
  "type": "file",
  "status": "processing",
  "metadata": {
    "filename": "document.pdf"
  }
}
\`\`\`

## POST /sources/url

Add a URL to be scraped.

\`\`\`json
{
  "url": "https://example.com/support"
}
\`\`\`

## GET /sources/{id}

Get source details and status.

## Source Status

| Status | Description |
|--------|-------------|
| \`pending\` | Waiting to be processed |
| \`processing\` | Currently being parsed/chunked |
| \`completed\` | Successfully indexed |
| \`failed\` | Processing failed |

## DELETE /sources/{id}

Delete a source and its chunks.

## Supported File Types

| Type | Extension | Notes |
|------|-----------|-------|
| PDF | .pdf | Up to 1000 pages |
| Markdown | .md | |
| Text | .txt | |
| HTML | .html, .htm | |
`;

export default function SourcesEndpointsPage() {
  return <Markdown>{content}</Markdown>;
}
