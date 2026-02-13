import { Markdown } from "@/components/markdown";

const content = `# Concepts

Deep dive into platform concepts and architecture.

- [Architecture](/docs/concepts/architecture) - System design
- [Retrieval Pipeline](/docs/concepts/retrieval-pipeline) - How RAG works
- [Security](/docs/concepts/security) - Security practices
`;

export default function ConceptsPage() {
  return <Markdown>{content}</Markdown>;
}
