"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth";

export function HomeAuthNav() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = isAuthenticated();
    Promise.resolve().then(() => setIsAuth(auth));
  }, []);

  if (isAuth === null) {
    return <div className="bg-muted/20 h-9 w-20 animate-pulse rounded-md" />;
  }

  if (isAuth) {
    return (
      <Button asChild size="sm">
        <Link href="/projects">Go to Dashboard</Link>
      </Button>
    );
  }

  return (
    <>
      <Link
        href="/auth/login"
        className="text-muted-foreground hover:text-primary hidden text-sm font-medium transition-colors sm:inline-block"
      >
        Sign in
      </Link>
      <Button asChild size="sm">
        <Link href="/auth/register">Get Started</Link>
      </Button>
    </>
  );
}

export function HomeHeroAuthCTA() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = isAuthenticated();
    Promise.resolve().then(() => setIsAuth(auth));
  }, []);

  if (isAuth === null) {
    return (
      <div className="flex w-full gap-4 sm:w-auto">
        <div className="bg-muted/20 h-12 w-full animate-pulse rounded-md sm:w-40" />
        <div className="bg-muted/20 hidden h-12 w-full animate-pulse rounded-md sm:block sm:w-32" />
      </div>
    );
  }

  if (isAuth) {
    return (
      <>
        <Button size="lg" className="h-12 w-full px-8 text-base shadow-sm sm:w-auto" asChild>
          <Link href="/projects">Go to Dashboard</Link>
        </Button>
        <Button size="lg" variant="outline" className="h-12 w-full px-8 text-base sm:w-auto" asChild>
          <Link href="/rag-chatbot-from-documents">
            <Sparkles className="h-4 w-4" />
            Learn How
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Button size="lg" className="h-12 w-full px-8 text-base shadow-sm sm:w-auto" asChild>
        <Link href="/auth/register">Create Workspace</Link>
      </Button>
      <Button size="lg" variant="outline" className="h-12 w-full px-8 text-base sm:w-auto" asChild>
        <Link href="/rag-chatbot-from-documents">
          <Sparkles className="h-4 w-4" />
          Learn How
        </Link>
      </Button>
    </>
  );
}

export function RagHeroAuthCTA() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = isAuthenticated();
    Promise.resolve().then(() => setIsAuth(auth));
  }, []);

  if (isAuth === null) {
    return (
      <div className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
        <div className="bg-muted/20 h-12 w-full animate-pulse rounded-md sm:w-48" />
        <div className="bg-muted/20 h-12 w-full animate-pulse rounded-md sm:w-40" />
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <Button size="lg" className="h-12 w-full px-8 text-base shadow-sm sm:w-auto" asChild>
        <Link href={isAuth ? "/projects" : "/auth/register"}>
          {isAuth ? "Go to Dashboard" : "Start Building for Free"}
        </Link>
      </Button>
      <Button size="lg" variant="outline" className="h-12 w-full px-8 text-base sm:w-auto" asChild>
        <Link href="/auth/login">Watch Demo</Link>
      </Button>
    </div>
  );
}
