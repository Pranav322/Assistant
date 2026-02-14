"use client";

import Link from "next/link";
import { useNavbar } from "@/components/NavbarContext";
import { UserNav } from "@/components/UserNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function GlobalNavbar() {
    const { title, backHref } = useNavbar();

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-6">
            <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-0 sm:px-2 lg:px-0">
                {backHref && (
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={backHref}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                )}
                <div className="flex flex-1 items-center justify-between">
                    <h1 className="text-lg font-semibold">{title}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <UserNav />
                </div>
            </div>
        </header>
    );
}
