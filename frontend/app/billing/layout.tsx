"use client";

import { NavbarProvider } from "@/components/NavbarContext";
import { GlobalNavbar } from "@/components/GlobalNavbar";

export default function BillingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <NavbarProvider>
            <div className="min-h-screen bg-background selection:bg-primary/10">
                <GlobalNavbar />
                {children}
            </div>
        </NavbarProvider>
    );
}
