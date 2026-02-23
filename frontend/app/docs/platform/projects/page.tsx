import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Managing Projects",
  description: "Create, configure, and maintain Contextly projects and their knowledge sources.",
  path: "/docs/platform/projects",
});

const content = `# Managing Projects

Projects are the containers for your chatbots. Each project has its own knowledge base, API keys, and widget configuration.

## Creating a Project

1. Log in to the **Dashboard**
2. Click **New Project**
3. Give your project a name (e.g., "Documentation Assistant")
4. Your project is now created and ready to be trained

## Adding Content

To make your chatbot useful, you need to feed it your content. This is called "ingestion."

### Uploading Files

1. Open your project from the dashboard
2. Click the **Sources** tab
3. Click **Upload Files**
4. Select files from your computer
5. Supported formats: \`.pdf\`, \`.txt\`, \`.md\`
6. Wait for the status to show **Completed**

### Adding URLs

1. In the **Sources** tab, click **Add URL**
2. Enter the full page address (e.g., \`https://example.com/pricing\`)
3. The system fetches and indexes the page content automatically

## Managing Sources

Once content is ingested, you can:

- **View** all sources and their processing status
- **Delete** sources you no longer need
- **Re-ingest** a source if the original content has changed

## Project Settings

In your project settings you can:

- **Rename** the project
- **Set Allowed Origins** — the domains where your widget is allowed to run
- **Manage API Keys** — see the [API Keys](/docs/platform/api-keys) page
- **Delete** the project (this is permanent)
`;

export default function ProjectsPage() {
  return <Markdown>{content}</Markdown>;
}
