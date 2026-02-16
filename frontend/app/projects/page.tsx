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
  const [origin, setOrigin] = useState("http://localhost:3000");
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
    <div className="min-h-screen bg-background selection:bg-primary/10">
      <main className="mx-auto w-full max-w-[1400px] px-4 py-8 animate-fade-in sm:px-8 lg:px-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your assistants and integrations.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        {plan === "free" && !bannerDismissed && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Unlock more with Pro</p>
                <p className="text-xs text-muted-foreground text-pretty">
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
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
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
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            Failed to load projects: {error.message}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}?title=${encodeURIComponent(project.name)}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="font-mono text-[10px] tracking-wider uppercase opacity-70">
                      {project.id.slice(0, 8)}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold tracking-tight truncate">
                      {project.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {project.allowed_origins?.[0] || "No origin set"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center group-hover:text-primary transition-colors">
                    Configure <Settings2 className="ml-1 h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
            {projects?.length === 0 && (
              <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 text-center animate-fade-in">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No projects yet</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
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
              <p className="text-[0.8rem] text-muted-foreground">
                The domain where you&apos;ll embed the chat widget. You can change this or add more domains later in Project Settings.
              </p>
            </div>
            {createError && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{createError}</p>}
            <div className="flex justify-end gap-3 mt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={creatingProject}>
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
