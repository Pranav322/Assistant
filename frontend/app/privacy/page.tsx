import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: "How Contextly collects, uses, and protects your data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              C
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Contextly
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-md border border-dashed bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          This is a draft template — review by legal counsel before launch.
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: August 20, 2026
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground">
          <section>
            <p>
              Contextly Inc. (&quot;Contextly&quot;, &quot;we&quot;,
              &quot;us&quot;) provides a platform for ingesting documents and
              deploying AI-powered chat widgets. This Privacy Policy explains
              what information we collect, how we use it, and the choices you
              have.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              What we collect
            </h2>
            <p className="mt-3 text-muted-foreground">
              We collect account information (name, email, organization),
              billing details, the documents and content you upload to build
              your chatbot, end-user chat transcripts exchanged with your
              deployed widgets, and technical data such as IP address,
              browser type, and usage logs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              How we use data
            </h2>
            <p className="mt-3 text-muted-foreground">
              We use collected data to operate and improve the service,
              provide customer support, process payments, secure the
              platform against abuse, and communicate important updates. We
              do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Data processing for AI/RAG
            </h2>
            <p className="mt-3 text-muted-foreground">
              Documents you upload are chunked, embedded, and stored in a
              vector index so your chatbot can retrieve relevant context at
              answer time. Retrieved context and end-user questions are sent
              to a large language model provider to generate responses. We
              retain uploaded documents and derived embeddings for as long as
              your project is active, and delete them within a reasonable
              period after project deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Third-party processors
            </h2>
            <p className="mt-3 text-muted-foreground">
              We rely on sub-processors to deliver the service, including
              cloud hosting providers, LLM providers for response generation,
              and payment processors for billing. Each processor is bound by
              contractual obligations to protect your data and use it only
              to provide services to us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Security
            </h2>
            <p className="mt-3 text-muted-foreground">
              We apply industry-standard safeguards, including encryption in
              transit, access controls, and regular review of our
              infrastructure, to protect data against unauthorized access,
              loss, or misuse. No method of transmission or storage is
              perfectly secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Your rights
            </h2>
            <p className="mt-3 text-muted-foreground">
              Depending on your location, you may have the right to access,
              correct, export, or delete your personal data, and to object to
              or restrict certain processing. To exercise these rights,
              contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
            <p className="mt-3 text-muted-foreground">
              Questions about this policy can be sent to{" "}
              <a
                href="mailto:privacy@contextly.live"
                className="text-primary underline underline-offset-4"
              >
                privacy@contextly.live
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
