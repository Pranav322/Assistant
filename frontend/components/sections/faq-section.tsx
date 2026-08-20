"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AnimatedSection } from "@/components/animated-section";

const faqs = [
  {
    question: "What content can I upload?",
    answer:
      "You can upload PDFs, paste a website URL, or add Markdown and plain text. We extract, chunk, embed, and index it automatically.",
  },
  {
    question: "How does the widget stay secure on my domain?",
    answer:
      "The widget runs inside an isolated iframe and communicates over origin-validated postMessage. API calls use short-lived JWT tokens tied to your allowed origins.",
  },
  {
    question: "Can I self-host Contextly?",
    answer:
      "Yes. The backend is packaged as Docker Compose services (API, worker, Redis) and connects to your own PostgreSQL database.",
  },
  {
    question: "What models power the chatbot?",
    answer:
      "Responses use Azure OpenAI GPT-4, and embeddings are generated with Azure OpenAI text-embedding-3-small for accurate semantic retrieval.",
  },
  {
    question: "How do I monitor usage and performance?",
    answer:
      "Contextly emits structured JSON logs and Prometheus metrics for API latency, token usage, ingestion success, and widget load times.",
  },
];

export function FaqSection() {
  return (
    <section className="border-b bg-muted/20 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[800px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="mb-12 text-center sm:mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            FAQ
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions? Answered.
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AnimatedSection>
      </div>
    </section>
  );
}
