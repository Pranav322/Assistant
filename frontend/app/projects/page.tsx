"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Plus, Terminal, Settings2, Sparkles, X } from "lucide-react";
import { fetcher, apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { useNavbar } from "@/components/NavbarContext";

type Project = {
  id: string;
  name: string;
  allowed_origins: string[];
  usage: Record<string, number>;
};

export default function ProjectsPage() {
  const { setTitle, setBackHref, setProjectName } = useNavbar();
  const normalizeOrigin = (value: string) => {
    const trimmed = value.trim().replace(/\/+$/, "");
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1")) {
      return `http://${trimmed}`;
    }
    return `https://${trimmed}`;
  };

  const { data: projects, error, isLoading, mutate } = useSWR<Project[]>("/projects", fetcher);

  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("https://contextly.live");
  const [createError, setCreateError] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    setTitle("Projects");
    setBackHref(null);
    setProjectName(null);
  }, [setTitle, setBackHref, setProjectName]);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const token = localStorage.getItem("rag_user_token");
        if (!token) return;
        const data = await apiRequest<{ plan: string }>("/billing/plan", { token });
        setPlan(data.plan);
      } catch {
        // silently fail
      }
    }
    fetchPlan();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    const token = localStorage.getItem("rag_user_token");
    if (!token) return;
    try {
      setCreatingProject(true);
      const normalizedOrigin = normalizeOrigin(origin);
      await fetcher("/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          allowed_origins: [normalizedOrigin],
        }),
      });
      setName("");
      setIsModalOpen(false);
      mutate();
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreatingProject(false);
    }
  }

  return (
    <div className="bg-background selection:bg-primary/10 min-h-screen">
      <main className="animate-fade-in mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8 lg:px-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">Manage your assistants and integrations.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        {plan === "free" && !bannerDismissed && (
          <div className="border-primary/20 bg-primary/5 mb-6 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <Sparkles className="text-primary h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Unlock more with Pro</p>
                <p className="text-muted-foreground text-xs text-pretty">
                  Get 5 projects, 2M tokens, and priority support — ₹499/month
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button size="sm" asChild>
                <Link href="/billing">Upgrade</Link>
              </Button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive flex flex-col gap-3 rounded-lg p-4">
            <p>Failed to load projects: {error.message}</p>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.map((project) => (
              <div
                key={project.id}
                className="group bg-card hover:border-primary/20 relative flex flex-col justify-between overflow-hidden rounded-xl border p-5 shadow-sm transition-all hover:shadow-md"
              >
                <Link
                  href={`/projects/${project.id}?title=${encodeURIComponent(project.name)}`}
                  className="space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="bg-primary/5 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] tracking-wider uppercase opacity-70"
                    >
                      {project.id.slice(0, 8)}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold tracking-tight">{project.name}</h3>
                    <p className="text-muted-foreground truncate text-sm">
                      {project.allowed_origins?.[0] || "No origin set"}
                    </p>
                  </div>
                </Link>
                <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs">
                  <Link
                    href={`/projects/${project.id}/?tab=settings&title=${encodeURIComponent(project.name)}`}
                    className="text-muted-foreground group-hover:text-primary flex items-center transition-colors"
                  >
                    Configure <Settings2 className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
            {projects?.length === 0 && (
              <div className="bg-muted/10 animate-fade-in col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed text-center">
                <div className="bg-muted/30 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                  <Plus className="text-muted-foreground h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold">No projects yet</h3>
                <p className="text-muted-foreground mt-2 mb-6 max-w-sm">
                  Create your first RAG assistant to get started.
                </p>
                <Button onClick={() => setIsModalOpen(true)}>Create Project</Button>
              </div>
            )}
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create New Project"
        >
          <form onSubmit={createProject} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Documentation Assistant"
                required
                disabled={creatingProject}
                className="col-span-3"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="origin">Allowed Origin</Label>
              <Input
                id="origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                onBlur={() => setOrigin(normalizeOrigin(origin))}
                placeholder="https://example.com"
                disabled={creatingProject}
                className="col-span-3"
              />
              <p className="text-muted-foreground text-[0.8rem]">
                The domain where you&apos;ll embed the chat widget. You can change this or add more
                domains later in Project Settings.
              </p>
            </div>
            {createError && (
              <p className="text-destructive bg-destructive/10 rounded-md p-2 text-sm">
                {createError}
              </p>
            )}
            <div className="mt-2 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={creatingProject}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingProject}>
                {creatingProject ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
