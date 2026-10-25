import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ShaderBackground } from "@/components/ui/shader-background";
import { ThemeToggle } from "@/components/theme-toggle";
import { WaitlistForm } from "@/components/waitlist-form";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Join the Contextly waitlist",
  description:
    "Contextly is opening to a limited number of teams. Leave your email and we will let you know when your spot opens.",
  path: "/waitlist",
});

export default function WaitlistPage() {
  return (
    <div className="bg-background flex min-h-screen flex-col overflow-x-hidden">
      <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold">
              C
            </div>
            <span className="text-sm font-semibold tracking-tight">Contextly</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
        <div className="absolute inset-0 -z-10">
          <ShaderBackground />
          <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent" />
        </div>

        <div className="bg-background/75 mx-auto w-full max-w-xl rounded-2xl border p-8 text-center shadow-xl backdrop-blur-md sm:p-12">
          <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 font-normal">
            Early access
          </Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Get a working chatbot on your site, <span className="text-primary">first</span>.
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-md text-lg leading-relaxed text-balance">
            Contextly is opening to a limited number of teams. Leave your email and we will let you
            know the moment your spot opens.
          </p>

          <div className="mt-9">
            <WaitlistForm />
          </div>

          <p className="text-muted-foreground mt-6 text-xs">
            One email when your spot opens. No spam, and you can ignore it any time.
          </p>
          <div className="text-muted-foreground mt-10 flex items-center justify-center gap-6 text-sm">
            <Link href="/" className="hover:text-foreground transition-colors">
              Back to home
            </Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
