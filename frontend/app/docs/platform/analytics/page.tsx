import { Markdown } from "@/components/markdown";

const content = `# Analytics & Usage

Track how your chatbot is performing and how much it costs.

## Usage Metrics

Navigate to the **Analytics** tab in your project to see:

- **Total Requests** — Number of messages sent to your chatbot
- **Tokens Used** — Computational effort used by the AI
  - *Input Tokens* — Cost of reading the user's question and your knowledge base context
  - *Output Tokens* — Cost of generating the answer

## Charts

- **Requests over Time** — See peak usage hours and days
- **Token Usage** — Monitor consumption against your limits

## Exporting Data

(Coming Soon) You will be able to export chat logs and usage data for further analysis.
`;

export default function AnalyticsPage() {
    return <Markdown>{content}</Markdown>;
}
