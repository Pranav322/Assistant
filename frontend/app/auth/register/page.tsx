"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { setToken, setUserEmail, isAuthenticated } from "@/lib/auth";
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

import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

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
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (verificationSent) {
      interval = setInterval(async () => {
        try {
          if (auth.currentUser) {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
              // User verified, proceed to backend sync and redirect
              const idToken = await auth.currentUser.getIdToken();
              const data = await apiRequest<AuthResponse>("/auth/firebase", {
                method: "POST",
                body: JSON.stringify({ id_token: idToken }),
              });
              setToken(data.access_token);
              setUserEmail(auth.currentUser.email || "");
              router.push("/projects");
            }
          }
        } catch (e) {
          console.error("Error checking verification status", e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [verificationSent, router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (auth.currentUser && resendCooldown === 0) {
      try {
        await sendEmailVerification(auth.currentUser);
        setResendCooldown(60);
      } catch (err: unknown) {
        const firebaseError = err as { message?: string };
        setError(firebaseError.message || "Failed to resend email");
      }
    }
  };

  async function handleSocialLogin(providerName: "google" | "github") {
    setError("");
    setLoading(true);
    try {
      const provider =
        providerName === "google" ? new GoogleAuthProvider() : new GithubAuthProvider();

      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();

      // Exchange token with backend
      const data = await apiRequest<AuthResponse>("/auth/firebase", {
        method: "POST",
        body: JSON.stringify({ id_token: idToken }),
      });

      setToken(data.access_token);
      setUserEmail(userCredential.user.email || "");
      router.push("/projects");
    } catch (err: unknown) {
      console.error(err);
      const firebaseError = err as { code?: string; message?: string };
      let msg = "Social registration failed";
      if (firebaseError.code === "auth/account-exists-with-different-credential") {
        msg = "Account exists with different provider";
      } else if (firebaseError.code === "auth/popup-closed-by-user") {
        msg = "Registration cancelled";
      } else if (firebaseError.message) {
        msg = firebaseError.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // 1. Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Send verification email
      await sendEmailVerification(userCredential.user);
      setVerificationSent(true);

      // Note: We do NOT exchange token yet. We wait for verification.
    } catch (err: unknown) {
      console.error(err);
      const firebaseError = err as { code?: string; message?: string };
      let msg = "Registration failed";
      if (firebaseError.code === "auth/email-already-in-use") {
        msg = "Email already in use";
      } else if (firebaseError.code === "auth/weak-password") {
        msg = "Password is too weak";
      } else if (firebaseError.message) {
        msg = firebaseError.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return null; // or a loading spinner
  }

  if (verificationSent) {
    return (
      <Card className="bg-background/90 border shadow-xl">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We sent a verification link to <strong>{email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Please click the link in the email to verify your account. If you don&apos;t see it,
            check your spam folder. This page will automatically refresh once you&apos;re verified.
          </p>
          {error && (
            <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
              {error}
            </p>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResendEmail}
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0
              ? `Resend email in ${resendCooldown}s`
              : "Resend Verification Email"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setVerificationSent(false)}>
            Back to registration
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/90 border shadow-xl">
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
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin("github")}
            disabled={loading}
          >
            <svg
              className="mr-2 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="github"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 496 512"
            >
              <path
                fill="currentColor"
                d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"
              ></path>
            </svg>
            Github
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin("google")}
            disabled={loading}
          >
            <svg
              className="mr-2 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              ></path>
            </svg>
            Google
          </Button>
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">Or continue with</span>
          </div>
        </div>
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
              <div className="mt-1 flex h-1 gap-1">
                <div
                  className={`flex-1 rounded-full ${password.length > 0 ? (password.length < 8 ? "bg-red-500" : "bg-green-500") : "bg-muted"}`}
                />
                <div
                  className={`flex-1 rounded-full ${
                    password.length >= 8 &&
                    /[A-Z]/.test(password) &&
                    /[0-9]/.test(password) &&
                    /[^A-Za-z0-9]/.test(password)
                      ? "bg-green-500"
                      : password.length >= 8
                        ? "bg-yellow-500"
                        : "bg-muted"
                  }`}
                />
                <div
                  className={`flex-1 rounded-full ${password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? "bg-green-500" : "bg-muted"}`}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {password.length === 0
                  ? "Enter a strong password"
                  : password.length < 8
                    ? "Weak (min 8 chars)"
                    : password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)
                      ? "Medium"
                      : "Strong"}
              </p>
            </div>
            {error && (
              <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
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
        <p className="text-muted-foreground w-full text-center text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
