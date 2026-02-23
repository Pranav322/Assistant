"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSubmitted(true);
    } catch (err: unknown) {
      console.error(err);
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/user-not-found") {
        // Even if user not found, for security we often say sent.
        // But for UX here let's be explicit or generic.
        setSubmitted(true); // Treat as success to avoid enumeration
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-background/90 mx-auto mt-20 max-w-md border shadow-xl">
      <CardHeader className="space-y-2">
        <Link
          href="/auth/login"
          className="text-muted-foreground hover:text-foreground mb-2 flex items-center text-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to login
        </Link>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <p className="font-semibold">Check your email</p>
            <p className="mt-1">
              If an account exists for {email}, we have sent a password reset link. Please check
              your spam folder if you don&apos;t see it.
            </p>
            <Button className="mt-4 w-full" variant="outline" onClick={() => setSubmitted(false)}>
              Try another email
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Sending link..." : "Send Reset Link"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
