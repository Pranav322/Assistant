"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

export function PricingTiers() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    const auth = isAuthenticated();
    Promise.resolve().then(() => setIsAuth(auth));

    if (auth) {
      const token = localStorage.getItem("rag_user_token");
      if (token) {
        apiRequest<{ plan: string }>("/billing/plan", { token })
          .then((data) => setPlan(data.plan))
          .catch(() => {});
      }
    }
  }, []);

  const isPro = plan === "pro";

  return (
    <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
      {/* Free Tier */}
      <div className="bg-background hover:border-primary/50 rounded-xl border p-8 shadow-sm transition-colors">
        <h3 className="text-xl font-semibold tracking-tight">Free</h3>
        <p className="text-muted-foreground mt-1 text-sm">For getting started</p>
        <div className="mt-6 mb-8">
          <span className="text-4xl font-extrabold">₹0</span>
          <span className="text-muted-foreground ml-2">forever</span>
        </div>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />1 project
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
            200K token cap
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
            Community support
          </li>
        </ul>
        <div className="mt-8">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/auth/register">Get Started</Link>
          </Button>
        </div>
      </div>

      {/* Pro Tier */}
      <div
        className={`rounded-xl border-2 ${isPro ? "border-primary bg-primary/5" : "border-primary/30 bg-background"} relative p-8 shadow-md transition-colors`}
      >
        <Badge className="absolute -top-2.5 left-6 text-[10px]">
          {isPro ? "Current Plan" : "Most Popular"}
        </Badge>
        <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          Pro
          <Sparkles className="text-primary h-4 w-4" />
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">For serious projects</p>
        <div className="mt-6 mb-8">
          <span className="text-4xl font-extrabold">₹499</span>
          <span className="text-muted-foreground ml-2">/ 30 days</span>
        </div>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />5 projects
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
            2M token cap
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
            Higher token limits
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
            Priority support
          </li>
        </ul>
        <div className="mt-8">
          <Button className="w-full" variant={isPro ? "outline" : "default"} asChild>
            <Link href={isAuth ? "/billing" : "/auth/register"}>
              {isPro ? "Manage Subscription" : isAuth ? "Upgrade Now" : "Start Free, Upgrade Later"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
