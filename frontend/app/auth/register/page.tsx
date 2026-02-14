"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { setToken, isAuthenticated } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthResponse = { access_token: string };

export default function RegisterPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/projects");
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const login = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(login.access_token);
      router.push("/projects");
    } catch (err) {
      setError((err as Error).message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return null; // or a loading spinner
  }

  return (
    <Card className="border bg-background/90 shadow-xl">
      <CardHeader className="space-y-2">
        <Badge variant="secondary" className="w-fit">
          Start in minutes
        </Badge>
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Use your email to create a workspace and invite your team.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form onSubmit={onSubmit}>
          <div className="grid gap-4">
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
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex gap-1 h-1 mt-1">
                <div className={`flex-1 rounded-full ${password.length > 0 ? (password.length < 8 ? "bg-red-500" : "bg-green-500") : "bg-muted"}`} />
                <div className={`flex-1 rounded-full ${
                  password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)
                    ? "bg-green-500"
                    : password.length >= 8
                      ? "bg-yellow-500"
                      : "bg-muted"
                }`} />
                <div className={`flex-1 rounded-full ${password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? "bg-green-500" : "bg-muted"}`} />
              </div>
              <p className="text-xs text-muted-foreground">
                {password.length === 0 ? "Enter a strong password" :
                  password.length < 8 ? "Weak (min 8 chars)" :
                    password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) ? "Medium" : "Strong"}
              </p>
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground w-full text-center">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
