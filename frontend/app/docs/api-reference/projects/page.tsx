import { Markdown } from "@/components/markdown";

const content = `# Project Endpoints

## GET /projects

List all projects for the authenticated user.

**Headers:** \`Authorization: Bearer <jwt>\`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| \`limit\` | int | 20 | Max items |
| \`offset\` | int | 0 | Pagination offset |

Response:
\`\`\`json
{
  "items": [
    {
      "id": "proj_123",
      "name": "My Support Bot",
      "allowed_origins": ["https://example.com"],
      "usage": {
        "requests": 1500,
        "tokens_total": 125000
      }
    }
  ],
  "total": 5
}
\`\`\`

## POST /projects

Create a new project.

\`\`\`json
{
  "name": "My Support Bot",
  "description": "Customer support chatbot",
  "allowed_origins": ["https://example.com"]
}
\`\`\`

## GET /projects/{id}

Get a specific project.

## PATCH /projects/{id}

Update a project.

## DELETE /projects/{id}

Delete a project.

## GET /projects/{id}/sources

List all sources in a project.
`;

export default function ProjectsEndpointsPage() {
  return <Markdown>{content}</Markdown>;
}
