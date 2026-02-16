"use client";

import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useNavbar } from "@/components/NavbarContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Sparkles, Zap } from "lucide-react";

declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
    }
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    prefill: { email: string };
    theme: { color: string };
    modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
    open: () => void;
}

interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

interface PlanData {
    plan: string;
    plan_expires_at: string | null;
    max_projects: number;
    token_cap: number;
    tokens_used: number;
    requests_used: number;
}

interface OrderData {
    order_id: string;
    amount: number;
    currency: string;
    razorpay_key_id: string;
}

function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
}

function daysUntil(dateStr: string): number {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const FREE_FEATURES = [
    "1 project",
    "200K token cap",
    "Community support",
];

const PRO_FEATURES = [
    "5 projects",
    "2M token cap",
    "Higher token limits",
    "Priority support",
];

export default function BillingPage() {
    const [plan, setPlan] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const { setTitle, setBackHref, setProjectName } = useNavbar();

    useEffect(() => {
        setTitle("Billing");
        setBackHref("/projects");
        setProjectName(null);
    }, [setTitle, setBackHref, setProjectName]);

    const fetchPlan = useCallback(async () => {
        try {
            const token = localStorage.getItem("rag_user_token");
            if (!token) {
                router.push("/auth/login");
                return;
            }
            const data = await apiRequest<PlanData>("/billing/plan", { token });
            setPlan(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load plan");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchPlan();
    }, [fetchPlan]);

    useEffect(() => {
        if (document.getElementById("razorpay-script")) return;
        const script = document.createElement("script");
        script.id = "razorpay-script";
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
    }, []);

    async function handleUpgrade() {
        setPaying(true);
        setError(null);
        try {
            const token = localStorage.getItem("rag_user_token");
            if (!token) {
                router.push("/auth/login");
                return;
            }

            const order = await apiRequest<OrderData>("/billing/create-order", {
                method: "POST",
                token,
            });

            const email = localStorage.getItem("rag_user_email") || "";

            const options: RazorpayOptions = {
                key: order.razorpay_key_id,
                amount: order.amount,
                currency: order.currency,
                name: "Contextly",
                description: "Pro Plan — 30 Days",
                order_id: order.order_id,
                handler: async (response: RazorpayResponse) => {
                    try {
                        await apiRequest("/billing/verify-payment", {
                            method: "POST",
                            token: token!,
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });
                        setSuccess(true);
                        await fetchPlan();
                        // Redirect to projects after short delay
                        setTimeout(() => router.push("/projects"), 2000);
                    } catch (err) {
                        setError(
                            err instanceof Error ? err.message : "Payment verification failed"
                        );
                    } finally {
                        setPaying(false);
                    }
                },
                prefill: { email },
                theme: { color: "#6366f1" },
                modal: {
                    ondismiss: () => setPaying(false),
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create order");
            setPaying(false);
        }
    }

    if (loading) {
        return (
            <main className="mx-auto w-full max-w-[1400px] px-6 py-12 sm:px-8 lg:px-12">
                <div className="mb-8">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <Skeleton className="h-[350px] rounded-xl" />
                    <Skeleton className="h-[350px] rounded-xl" />
                </div>
            </main>
        );
    }

    const isPro = plan?.plan === "pro";
    const daysLeft = plan?.plan_expires_at ? daysUntil(plan.plan_expires_at) : 0;
    const tokenPercent = plan ? Math.min(100, (plan.tokens_used / plan.token_cap) * 100) : 0;

    return (
        <main className="mx-auto w-full max-w-[1400px] px-6 py-12 animate-fade-in sm:px-8 lg:px-12">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
                <p className="text-muted-foreground">
                    Manage your plan and usage.
                </p>
            </div>

            {/* Success Banner */}
            {success && (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                            Welcome to Pro!
                        </p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">
                            Your plan is now active. Redirecting to projects…
                        </p>
                    </div>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-destructive">
                    {error}
                </div>
            )}

            {/* Plan Cards */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Free Plan */}
                <Card className={`relative transition-all duration-200 ${!isPro ? "border-primary/30 shadow-md" : ""}`}>
                    {!isPro && (
                        <Badge className="absolute -top-2.5 left-5 text-[10px]">
                            Current Plan
                        </Badge>
                    )}
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Free</CardTitle>
                        <CardDescription>Get started with the basics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-6">
                            <span className="text-3xl font-extrabold">₹0</span>
                            <span className="text-muted-foreground ml-2">forever</span>
                        </div>
                        <ul className="space-y-3">
                            {FREE_FEATURES.map((f) => (
                                <li key={f} className="flex items-center gap-3 text-sm">
                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
                                        <Check className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card className={`relative transition-all duration-200 ${isPro ? "border-primary/30 shadow-md" : "hover:border-primary/20 hover:shadow-md"}`}>
                    {isPro && (
                        <Badge className="absolute -top-2.5 left-5 text-[10px]">
                            Current Plan
                        </Badge>
                    )}
                    {!isPro && (
                        <Badge variant="secondary" className="absolute -top-2.5 right-5 text-[10px] gap-1">
                            <Zap className="h-3 w-3" />
                            Recommended
                        </Badge>
                    )}
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            Pro
                            <Sparkles className="h-4 w-4 text-primary" />
                        </CardTitle>
                        <CardDescription>For serious projects</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-6">
                            <span className="text-3xl font-extrabold">₹499</span>
                            <span className="text-muted-foreground ml-2">/ 30 days</span>
                        </div>
                        <ul className="space-y-3 mb-6">
                            {PRO_FEATURES.map((f) => (
                                <li key={f} className="flex items-center gap-3 text-sm">
                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                        <Check className="h-3 w-3 text-primary" />
                                    </div>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        {isPro ? (
                            <div className="w-full text-center">
                                <p className="text-sm font-semibold text-primary">
                                    {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
                                </p>
                                {plan?.plan_expires_at && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Expires {new Date(plan.plan_expires_at).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleUpgrade}
                                disabled={paying}
                            >
                                {paying ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Processing…
                                    </span>
                                ) : (
                                    "Upgrade to Pro"
                                )}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>

            {/* Usage Stats */}
            {plan && (
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle className="text-lg">Current Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Plan</p>
                                <p className="text-lg font-semibold capitalize">{plan.plan}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Projects</p>
                                <p className="text-lg font-semibold">{plan.max_projects} max</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tokens Used</p>
                                <p className="text-lg font-semibold">
                                    {formatTokens(plan.tokens_used)}
                                    <span className="text-muted-foreground font-normal"> / {formatTokens(plan.token_cap)}</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Requests</p>
                                <p className="text-lg font-semibold">{plan.requests_used.toLocaleString()}</p>
                            </div>
                        </div>
                        {/* Token usage bar */}
                        <div className="mt-6">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-500"
                                    style={{ width: `${tokenPercent}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {tokenPercent.toFixed(1)}% of token limit used
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </main>
    );
}
