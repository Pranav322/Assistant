"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Terminal, Settings2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
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
  const { setTitle, setBackHref } = useNavbar();
  const normalizeOrigin = (value: string) => {
    const trimmed = value.trim().replace(/\/+$/, "");
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1")) {
      return `http://${trimmed}`;
    }
    return `https://${trimmed}`;
  };
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("http://localhost:3000");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadProjects() {
    const token = getToken();
    if (!token) return;
    const data = await apiRequest<Project[]>("/projects", {
      token,
    });
    setProjects(data);
  }

  useEffect(() => {
    setTitle("Projects");
    setBackHref(null);
    const token = getToken();
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    setLoading(true);
    loadProjects()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setTitle, setBackHref]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const token = getToken();
    if (!token) return;
    try {
      setCreatingProject(true);
      const normalizedOrigin = normalizeOrigin(origin);
      await apiRequest<Project>("/projects", {
        method: "POST",
        token,
        body: JSON.stringify({
          name,
          allowed_origins: [normalizedOrigin],
        }),
      });
      setName("");
      setIsModalOpen(false);
      await loadProjects();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingProject(false);
    }
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/10">
      <main className="mx-auto w-full max-w-[1400px] px-6 py-12 animate-fade-in sm:px-8 lg:px-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your assistants and integrations.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
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
                  <div>
                    <h3 className="font-semibold tracking-tight">
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
            {projects.length === 0 && (
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
                The domain where you&apos;ll embed the chat widget (e.g., https://your-website.com).
              </p>
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
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

