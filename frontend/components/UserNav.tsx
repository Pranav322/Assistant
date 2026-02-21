"use client";

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, LogOut, Settings } from "lucide-react";
import { clearToken, getUserEmail } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

function getInitials(email: string): string {
    const atIndex = email.indexOf("@");
    const username = atIndex > 0 ? email.substring(0, atIndex) : email;
    const parts = username.split(".");
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
}

export function UserNav() {
    const [email, setEmail] = useState("");
    const [plan, setPlan] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const userEmail = getUserEmail();
        if (userEmail) {
            setEmail(userEmail);
        }
    }, []);

    useEffect(() => {
        async function fetchPlan() {
            try {
                const token = localStorage.getItem("rag_user_token");
                if (!token) return;
                const data = await apiRequest<{ plan: string }>("/billing/plan", { token });
                setPlan(data.plan);
            } catch {
                // Silently fail — badge just won't show
            }
        }
        fetchPlan();
    }, []);

    function logout() {
        clearToken();
        window.location.href = "/";
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>{email ? getInitials(email) : "U"}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1.5">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium leading-none">{email || "My Account"}</p>
                            {plan && (
                                <Badge
                                    variant={plan === "pro" ? "default" : "secondary"}
                                    className="text-[10px] px-1.5 py-0"
                                >
                                    {plan === "pro" ? "Pro" : "Free"}
                                </Badge>
                            )}
                        </div>
                        {email && (
                            <p className="text-xs leading-none text-muted-foreground">
                                Manage your account
                            </p>
                        )}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push("/billing")}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Billing</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
