"use client";

import Link from "next/link";
import { useNavbar } from "@/components/NavbarContext";
import { UserNav } from "@/components/UserNav";
import { ArrowLeft } from "lucide-react";

export function GlobalNavbar() {
    const { title, backHref, projectName } = useNavbar();


    return (
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-4 sm:px-6">
            <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <Link href="/" className="flex-shrink-0 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                            C
                        </div>
                        <span className="text-sm font-semibold tracking-tight hidden sm:inline-block">
                            Contextly
                        </span>
                    </Link>

                    {/* Divider and Page Title */}
                    <div className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground min-w-0 overflow-hidden whitespace-nowrap">
                        <span className="text-muted-foreground/30 flex-shrink-0">/</span>
                        {projectName && (
                            <>
                                <span className="font-medium text-foreground truncate">{projectName}</span>
                                <span className="text-muted-foreground/30 flex-shrink-0">/</span>
                            </>
                        )}
                        {backHref ? (
                            <Link href={backHref} className="flex items-center hover:text-foreground transition-colors flex-shrink-0">
                                <ArrowLeft className="mr-1 h-3 w-3" />
                                <span className="sr-only">Back</span>
                            </Link>
                        ) : null}
                        <span className="font-medium text-foreground truncate">{title}</span>
                    </div>
                </div>

                <div className="flex-shrink-0">
                    <UserNav />
                </div>
            </div>
        </header>
    );
}
