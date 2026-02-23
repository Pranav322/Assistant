import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Quickstart",
  description:
    "Set up your first Contextly project, ingest content, and embed the chat widget in under five minutes.",
  path: "/docs/getting-started/quickstart",
});

const content = `# Quickstart

Get your first AI chatbot running in under 5 minutes.

## Step 1: Create an Account

1. Visit the platform and click **Register**
2. Enter your email and password

## Step 2: Create a Project

1. From the dashboard, click **New Project**
2. Give it a name (e.g., "Support Bot")
3. Add your website domain to **Allowed Origins** (e.g., \`https://mysite.com\`)

## Step 3: Upload Your Content

1. Open your new project
2. Click **Add Source**
3. Upload a PDF or enter a URL
4. Wait for the status to show **Completed** — your content is now indexed

## Step 4: Get Your Credentials

1. Go to **Settings → API Keys** in your project
2. Click **Create API Key** and copy it (you'll only see it once)
3. Note your **Project ID** from the project dashboard

## Step 5: Embed the Widget

Add this snippet to your website, just before \`</body>\`:

\`\`\`html
<script
  src="https://widget.contextly.live/embed.js"
  data-token="YOUR_WIDGET_TOKEN"
  data-project-id="YOUR_PROJECT_ID"
  data-origin="https://yourwebsite.com"
  async
></script>
\`\`\`

> To generate a widget token, see the [Chat Widget guide](/docs/platform/widget).

## Step 6: Chat!

Your chatbot is now live. Users can ask questions about your uploaded content and get AI-powered answers with citations.

## What's Next?

- [Projects](/docs/platform/projects) — Managing content and knowledge bases
- [Chat Widget](/docs/platform/widget) — Customization and advanced embedding
- [API Keys](/docs/platform/api-keys) — Programmatic access
`;

export default function QuickstartPage() {
  return <Markdown>{content}</Markdown>;
}
