import { Markdown } from "@/components/markdown";

const content = `# Deployment

Deploy the RAG Chatbot Platform.

- [Docker](/docs/deployment/docker) - Local Docker deployment
- [Production](/docs/deployment/production) - Production setup
`;

export default function DeploymentPage() {
  return <Markdown>{content}</Markdown>;
}
