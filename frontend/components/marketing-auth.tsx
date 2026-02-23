"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth";

export function HomeAuthNav() {
    const [isAuth, setIsAuth] = useState<boolean | null>(null);

    useEffect(() => {
        const auth = isAuthenticated();
        Promise.resolve().then(() => setIsAuth(auth));
    }, []);

    if (isAuth === null) {
        return <div className="w-20 h-9 bg-muted/20 animate-pulse rounded-md" />;
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
                className="hidden sm:inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
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
            <div className="flex gap-4 w-full sm:w-auto">
                <div className="h-12 w-full sm:w-40 bg-muted/20 animate-pulse rounded-md" />
                <div className="h-12 w-full sm:w-32 bg-muted/20 animate-pulse rounded-md hidden sm:block" />
            </div>
        );
    }

    if (isAuth) {
        return (
            <Button size="lg" className="h-12 w-full sm:w-auto px-8 text-base shadow-sm" asChild>
                <Link href="/projects">Go to Dashboard</Link>
            </Button>
        );
    }

    return (
        <>
            <Button size="lg" className="h-12 w-full sm:w-auto px-8 text-base shadow-sm" asChild>
                <Link href="/auth/register">Create Workspace</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 w-full sm:w-auto px-8 text-base" asChild>
                <Link href="/auth/login">View Demo</Link>
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full mt-10">
                <div className="h-12 w-full sm:w-48 bg-muted/20 animate-pulse rounded-md" />
                <div className="h-12 w-full sm:w-40 bg-muted/20 animate-pulse rounded-md" />
            </div>
        );
    }

    return (
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 w-full sm:w-auto px-8 text-base shadow-sm" asChild>
                <Link href={isAuth ? "/projects" : "/auth/register"}>
                    {isAuth ? "Go to Dashboard" : "Start Building for Free"}
                </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 w-full sm:w-auto px-8 text-base" asChild>
                <Link href="/auth/login">Watch Demo</Link>
            </Button>
        </div>
    );
}
