"use client";

import Link from "next/link";
import { useNavbar } from "@/components/NavbarContext";
import { UserNav } from "@/components/UserNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function GlobalNavbar() {
    const { title, backHref, projectName } = useNavbar();

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-6">
            <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 sm:px-8 lg:px-12">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                            C
                        </div>
                        <span className="text-sm font-semibold tracking-tight">
                            Contextly
                        </span>
                    </Link>

                    {/* Divider and Page Title */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="text-muted-foreground/30">/</span>
                        {projectName && (
                            <>
                                <span className="font-medium text-foreground">{projectName}</span>
                                <span className="text-muted-foreground/30">/</span>
                            </>
                        )}
                        {backHref ? (
                            <>
                                <Link href={backHref} className="flex items-center hover:text-foreground transition-colors">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                </Link>
                                <span className="font-medium text-foreground">{title}</span>
                            </>
                        ) : (
                            <span className="font-medium text-foreground">{title}</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <UserNav />
                </div>
            </div>
        </header>
    );
}
