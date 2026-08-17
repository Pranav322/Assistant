"use client";

import Link from "next/link";
import { useNavbar } from "@/components/NavbarContext";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/UserNav";
import { ArrowLeft } from "lucide-react";

export function GlobalNavbar() {
  const { title, backHref, projectName } = useNavbar();

  return (
    <header className="bg-background sticky top-0 z-30 flex h-16 items-center border-b px-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <Link href="/" className="flex flex-shrink-0 items-center gap-2">
            <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold">
              C
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline-block">
              Contextly
            </span>
          </Link>

          {/* Divider and Page Title */}
          <div className="text-muted-foreground flex min-w-0 items-center gap-1 overflow-hidden text-sm whitespace-nowrap sm:gap-2">
            <span className="text-muted-foreground/30 flex-shrink-0">/</span>
            {projectName && (
              <>
                <span className="text-foreground truncate font-medium">{projectName}</span>
                <span className="text-muted-foreground/30 flex-shrink-0">/</span>
              </>
            )}
            {backHref ? (
              <Link
                href={backHref}
                className="hover:text-foreground flex flex-shrink-0 items-center transition-colors"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                <span className="sr-only">Back</span>
              </Link>
            ) : null}
            <span className="text-foreground truncate font-medium">{title}</span>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
