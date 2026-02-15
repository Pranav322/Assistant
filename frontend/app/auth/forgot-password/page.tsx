"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        
        try {
            await sendPasswordResetEmail(auth, email);
            setSubmitted(true);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found') {
                 // Even if user not found, for security we often say sent. 
                 // But for UX here let's be explicit or generic.
                 setError("If an account exists, an email has been sent.");
                 setSubmitted(true); // Treat as success to avoid enumeration
            } else {
                setError("Failed to send reset email. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="border bg-background/90 shadow-xl max-w-md mx-auto mt-20">
            <CardHeader className="space-y-2">
                <Link href="/auth/login" className="mb-2 flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                </Link>
                <CardTitle className="text-2xl">Reset Password</CardTitle>
                <CardDescription>
                    Enter your email address and we'll send you a link to reset your password.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {submitted ? (
                    <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        <p className="font-semibold">Check your email</p>
                        <p className="mt-1">
                            If an account exists for {email}, we have sent a password reset link.
                        </p>
                        <Button className="w-full mt-4" variant="outline" onClick={() => setSubmitted(false)}>
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
