import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "The terms that govern your use of Contextly.",
  path: "/terms",
});

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: August 20, 2026
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Acceptance
            </h2>
            <p className="mt-3 text-muted-foreground">
              By creating an account or using Contextly Inc. (&quot;Contextly&quot;,
              &quot;we&quot;, &quot;us&quot;) services, you agree to be bound
              by these Terms of Service. If you do not agree, do not use the
              service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Your use of the service
            </h2>
            <p className="mt-3 text-muted-foreground">
              Contextly lets you ingest documents, build a knowledge base,
              and deploy AI chat widgets on your own websites and products.
              You are responsible for configuring your project and for the
              behavior of the widgets you deploy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Accounts &amp; billing
            </h2>
            <p className="mt-3 text-muted-foreground">
              You must provide accurate account information and keep your
              credentials secure. Paid plans are billed on a recurring basis
              as described at checkout. Fees are non-refundable except where
              required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Content you provide
            </h2>
            <p className="mt-3 text-muted-foreground">
              You retain ownership of the documents and content you upload.
              You grant us a limited license to process, store, and index
              that content solely to provide and improve the service on your
              behalf. You are responsible for having the rights necessary to
              upload and use that content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Acceptable use
            </h2>
            <p className="mt-3 text-muted-foreground">
              You may not use the service to upload unlawful content,
              infringe on third-party rights, attempt to disrupt or
              reverse-engineer the platform, or deploy widgets in a way that
              deceives or harms end users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Intellectual property
            </h2>
            <p className="mt-3 text-muted-foreground">
              Contextly and its underlying technology are owned by Contextly
              Inc. and protected by intellectual property laws. These Terms
              do not grant you any rights to our trademarks or branding
              beyond what is necessary to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Disclaimer &amp; liability
            </h2>
            <p className="mt-3 text-muted-foreground">
              The service is provided &quot;as is&quot; without warranties of
              any kind. AI-generated responses may be inaccurate or
              incomplete, and you are responsible for reviewing outputs
              before relying on them. To the maximum extent permitted by
              law, Contextly is not liable for indirect, incidental, or
              consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Termination
            </h2>
            <p className="mt-3 text-muted-foreground">
              You may cancel your account at any time. We may suspend or
              terminate access if you violate these Terms or misuse the
              service. Upon termination, your right to use the service ends,
              though certain provisions of these Terms will survive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Governing law
            </h2>
            <p className="mt-3 text-muted-foreground">
              These Terms are governed by the laws of the jurisdiction in
              which Contextly Inc. is incorporated, without regard to
              conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
            <p className="mt-3 text-muted-foreground">
              Questions about these Terms can be sent to{" "}
              <a
                href="mailto:legal@contextly.live"
                className="text-primary underline underline-offset-4"
              >
                legal@contextly.live
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
