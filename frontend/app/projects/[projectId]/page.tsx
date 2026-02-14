"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Link as LinkIcon, RefreshCw, Key, Code, AlertCircle, Trash2, FileText, Globe, Loader2 } from "lucide-react";
import { apiRequest, API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";
import CopyBlock from "@/components/CopyBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

type Project = {
  id: string;
  name: string;
  allowed_origins: string[];
  usage: Record<string, number>;
};

type ApiKey = {
  id: string;
  name: string | null;
  prefix?: string;
  api_key?: string;
  revoked_at?: string | null;
};

type Source = {
  id: string;
  project_id: string;
  type: string;
  content_hash: string;
  metadata: {
    filename?: string;
    source_url?: string;
    size_bytes?: number;
    page_count?: number;
    content_type?: string;
    error?: string;
  };
  status: string;
  created_at: string;
  updated_at: string;
};

export default function ProjectDetailPage() {
  const normalizeOrigin = (value: string) => {
    const trimmed = value.trim().replace(/\/+$/, "");
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1")) {
      return `http://${trimmed}`;
    }
    return `https://${trimmed}`;
  };
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [usage, setUsage] = useState<{ requests: number; tokens: number } | null>(
    null
  );
  const [newKeyName, setNewKeyName] = useState("");
  const [freshKey, setFreshKey] = useState<ApiKey | null>(null);
  const [error, setError] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [widgetToken, setWidgetToken] = useState<string | null>(null);
  const [tokenExpiresIn, setTokenExpiresIn] = useState<number | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingestionStatus, setIngestionStatus] = useState<{
    sourceId: string;
    status: string;
    message?: string;
  } | null>(null);
  const [ingestionError, setIngestionError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [urlIngesting, setUrlIngesting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  // Embed Configuration State
  const [embedMode, setEmbedMode] = useState<"popup" | "embedded">("popup");
  const [embedWidth, setEmbedWidth] = useState("360px");
  const [embedHeight, setEmbedHeight] = useState("600px");

  // Poll for status updates
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const results = await Promise.allSettled([
        apiRequest<Project>(`/projects/${projectId}`, { token }),
        apiRequest<ApiKey[]>(`/projects/${projectId}/api-keys`, { token }),
        apiRequest<{ requests: number; tokens: number }>(`/usage?project_id=${projectId}`, { token }),
        apiRequest<Source[]>(`/projects/${projectId}/sources`, { token })
      ]);

      const [projRes, keyRes, usageRes, srcRes] = results;

      if (projRes.status === "rejected") {
        throw new Error(projRes.reason.message || "Failed to load project");
      }
      setProject(projRes.value);

      if (keyRes.status === "fulfilled") setKeys(keyRes.value);
      if (usageRes.status === "fulfilled") setUsage(usageRes.value);
      if (srcRes.status === "fulfilled") setSources(srcRes.value);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [projectId]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    loadData();
  }, [projectId, loadData]);

  // Polling logic
  useEffect(() => {
    const hasPending = sources.some(s => ["pending", "processing"].includes(s.status)) ||
      (ingestionStatus && ["pending", "processing"].includes(ingestionStatus.status));

    if (hasPending) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          loadData();
          // Also update ingestionStatus from the sources list if it matches
          if (ingestionStatus) {
            // We can refresh the specific status too, or just rely on the list.
            // Let's rely on list for now to keep it simple, or re-fetch.
          }
        }, 5000);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [sources, ingestionStatus, loadData]);


  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const token = getToken();
    if (!token) return;
    try {
      setCreatingKey(true);
      const created = await apiRequest<ApiKey>(
        `/projects/${projectId}/api-keys`,
        {
          method: "POST",
          token,
          body: JSON.stringify({ name: newKeyName || "Primary" }),
        }
      );
      setFreshKey(created);
      setNewKeyName("");
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingKey(false);
    }
  }

  async function uploadFile(e: React.FormEvent) {
    e.preventDefault();
    setIngestionError("");
    const token = getToken();
    if (!token) return;
    if (!selectedFile) {
      setIngestionError("Select a file to upload.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch(
        `${API_BASE_URL}/ingestion/upload?project_id=${projectId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || "Upload failed");
      }
      setIngestionStatus({
        sourceId: data.source_id,
        status: data.status,
        message: data.message,
      });
      setSelectedFile(null);
      setFileInputKey((prev) => prev + 1);
      loadData(); // Refresh list immediately
    } catch (err) {
      setIngestionError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function ingestUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIngestionError("");
    const token = getToken();
    if (!token) return;
    const trimmed = ingestUrl.trim();
    if (!trimmed) {
      setIngestionError("Enter a URL to ingest.");
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setIngestionError("URL must start with http:// or https://");
      return;
    }

    setUrlIngesting(true);
    try {
      const data = await apiRequest<{ source_id: string; status: string }>(
        `/ingestion/url?project_id=${projectId}`,
        {
          method: "POST",
          token,
          body: JSON.stringify({ url: trimmed }),
        }
      );
      setIngestionStatus({ sourceId: data.source_id, status: data.status });
      setIngestUrl("");
      loadData(); // Refresh list immediately
    } catch (err) {
      setIngestionError((err as Error).message);
    } finally {
      setUrlIngesting(false);
    }
  }

  async function refreshIngestionStatus() {
    if (!ingestionStatus) return;
    const token = getToken();
    if (!token) return;
    setStatusLoading(true);
    try {
      const data = await apiRequest<{
        id: string;
        status: string;
        filename?: string;
        error?: string;
      }>(`/ingestion/${ingestionStatus.sourceId}?project_id=${projectId}`, {
        token,
      });
      setIngestionStatus((prev) =>
        prev
          ? {
            ...prev,
            status: data.status,
            message: data.error || prev.message,
          }
          : prev
      );
      loadData(); // Sync list
    } catch (err) {
      setIngestionError((err as Error).message);
    } finally {
      setStatusLoading(false);
    }
  }

  async function deleteSource(sourceId: string) {
    const token = getToken();
    if (!token) return;
    if (!confirm("Are you sure you want to delete this source? This action cannot be undone.")) return;

    setDeletingSourceId(sourceId);
    try {
      await apiRequest(`/ingestion/${sourceId}?project_id=${projectId}`, {
        method: "DELETE",
        token
      });
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingSourceId(null);
    }
  }

  async function deleteProject() {
    const token = getToken();
    if (!token) return;

    setDeletingProject(true);
    try {
      await apiRequest(`/projects/${projectId}`, {
        method: "DELETE",
        token
      });
      router.push("/projects");
    } catch (err) {
      setError((err as Error).message);
      setDeletingProject(false);
    }
  }

  async function generateWidgetToken() {
    setTokenError("");
    setWidgetToken(null);
    setTokenExpiresIn(null);
    const token = getToken();
    if (!token || !project) return;

    const apiBaseUrl = API_BASE_URL.replace(/\/$/, "");
    const isLocal = apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1");
    const defaultOrigin = isLocal ? "http://localhost:3000" : "https://customer.com";
    const originValue = normalizeOrigin(project.allowed_origins?.[0] || defaultOrigin);

    setTokenLoading(true);
    try {
      const data = await apiRequest<{ token: string; expires_in: number }>(
        "/tokens/widget/user",
        {
          method: "POST",
          token,
          body: JSON.stringify({
            origin: originValue,
            project_id: projectId,
          }),
        }
      );
      setWidgetToken(data.token);
      setTokenExpiresIn(data.expires_in);
    } catch (err) {
      setTokenError((err as Error).message);
    } finally {
      setTokenLoading(false);
    }
  }

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-6 py-10 space-y-6 sm:px-8 lg:px-12">
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  const apiBaseUrl = API_BASE_URL.replace(/\/$/, "");
  const isLocal = apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1");
  const defaultOrigin = isLocal ? "http://localhost:3000" : "https://customer.com";
  const originValue = normalizeOrigin(project.allowed_origins?.[0] || defaultOrigin);
  const widgetBaseUrl = (() => {
    const envWidget = process.env.NEXT_PUBLIC_WIDGET_BASE_URL;
    if (envWidget) {
      return envWidget.replace(/\/$/, "");
    }
    if (typeof window === "undefined") {
      return isLocal ? "http://localhost:3000" : "https://widget.pranavbuilds.tech";
    }
    try {
      const current = new URL(window.location.origin);
      const host = current.host;
      if (host.startsWith("app.")) {
        return `${current.protocol}//widget.${host.slice(4)}`;
      }
      return current.origin;
    } catch {
      return isLocal ? "http://localhost:3000" : "https://widget.pranavbuilds.tech";
    }
  })();
}
  }) ();

const embedSnippet = `<script src="${widgetBaseUrl}/embed.js" data-token="<WIDGET_TOKEN>" data-origin="${originValue}" data-project-id="${project.id}" data-api-base-url="${apiBaseUrl}" data-mode="${embedMode}"${embedMode === "popup" && embedWidth ? ` data-width="${embedWidth}"` : ""}${embedMode === "popup" && embedHeight ? ` data-height="${embedHeight}"` : ""} defer></script>`;

const previewOrigin = originValue;
const previewToken = widgetToken || "<WIDGET_TOKEN>";
const previewSnippet = `${widgetBaseUrl}/widget?projectId=${project.id}&origin=${encodeURIComponent(previewOrigin)}&token=${previewToken}&mode=${embedMode}`;

return (
  <div className="min-h-screen bg-muted/30 pb-20">
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-6">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-0 sm:px-2 lg:px-0">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <Badge variant="outline" className="font-mono">
            {project.id}
          </Badge>
        </div>
      </div>
    </header>

    <main className="mx-auto w-full max-w-[1400px] px-6 py-10 sm:px-8 lg:px-12">
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Processed Requests</CardDescription>
                <CardTitle className="text-3xl">{usage?.requests ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tokens Consumed</CardDescription>
                <CardTitle className="text-3xl">{usage?.tokens ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="sm:col-span-2">
              <CardHeader className="pb-2">
                <CardDescription>Allowed Origin</CardDescription>
                <CardTitle className="text-lg font-mono">{project.allowed_origins?.[0] || "Not set"}</CardTitle>
              </CardHeader>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="knowledge-base" className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" /> File Upload
                </CardTitle>
                <CardDescription>Upload documents (PDF, TXT, MD) to your knowledge base.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Select File</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      key={fileInputKey}
                      type="file"
                      accept=".pdf,.txt,.md,.markdown"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <Button onClick={uploadFile} disabled={uploading}>
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  {ingestionStatus?.sourceId && ingestionStatus.status && !ingestUrl && (
                    <div className="rounded-lg border bg-muted/50 p-4 text-sm mt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Status: {ingestionStatus.status}</span>
                        <Button variant="ghost" size="icon" onClick={refreshIngestionStatus} disabled={statusLoading}>
                          <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                      <p className="mt-1 text-muted-foreground text-xs font-mono">{ingestionStatus.sourceId}</p>
                      {ingestionStatus.message && (
                        <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-3 w-3" />
                          <span>{ingestionStatus.message}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {ingestionError && !ingestUrl && <p className="text-sm text-destructive">{ingestionError}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" /> URL Ingestion
                </CardTitle>
                <CardDescription>Crawl and index content from a website URL.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Target URL</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      value={ingestUrl}
                      onChange={(e) => setIngestUrl(e.target.value)}
                      placeholder="https://example.com/docs"
                    />
                    <Button onClick={ingestUrlSubmit} disabled={urlIngesting} variant="outline">
                      {urlIngesting ? "Submitting..." : "Ingest"}
                    </Button>
                  </div>
                  {ingestionStatus?.sourceId && ingestionStatus.status && ingestUrl && (
                    <div className="rounded-lg border bg-muted/50 p-4 text-sm mt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Status: {ingestionStatus.status}</span>
                        <Button variant="ghost" size="icon" onClick={refreshIngestionStatus} disabled={statusLoading}>
                          <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                      <p className="mt-1 text-muted-foreground text-xs font-mono">{ingestionStatus.sourceId}</p>
                      {ingestionStatus.message && (
                        <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-3 w-3" />
                          <span>{ingestionStatus.message}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {ingestionError && ingestUrl && <p className="text-sm text-destructive">{ingestionError}</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>Manage your ingested files and URLs.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name/URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No data sources found. Upload a file or ingest a URL to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sources.map((source) => (
                      <TableRow key={source.id}>
                        <TableCell>
                          {source.type === "url" ? (
                            <Globe className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-orange-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {source.metadata.filename || source.metadata.source_url || source.content_hash.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {["pending", "processing"].includes(source.status) && (
                              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                            <Badge variant={
                              source.status === "completed" ? "default" :
                                source.status === "failed" ? "destructive" : "secondary"
                            }>
                              {source.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSource(source.id)}
                            disabled={deletingSourceId === source.id}
                          >
                            {deletingSourceId === source.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-8">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> API Keys</CardTitle>
              <CardDescription>Manage keys access to your project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={createKey} className="flex gap-3">
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name"
                  className="flex-1"
                  disabled={creatingKey}
                />
                <Button type="submit" disabled={creatingKey}>
                  {creatingKey ? "Creating..." : "Create Key"}
                </Button>
              </form>
              {freshKey?.api_key && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
                  <p className="text-xs font-semibold uppercase text-green-700 dark:text-green-400">New Key Created</p>
                  <CopyBlock value={freshKey.api_key} />
                  <p className="mt-2 text-xs text-muted-foreground">Copy this now. You won&apos;t see it again.</p>
                </div>
              )}

              <div className="space-y-3">
                {keys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{key.name || "API Key"}</p>
                      <p className="text-xs font-mono text-muted-foreground">{key.prefix}...</p>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                ))}
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-8">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" /> Integration</CardTitle>
              <CardDescription>Connect your application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>1. Generate Widget Token</Label>
                <p className="text-sm text-muted-foreground">
                  Use your dashboard session to mint a short-lived token for preview.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={generateWidgetToken} disabled={tokenLoading}>
                    {tokenLoading ? "Generating..." : "Generate token"}
                  </Button>
                  {tokenExpiresIn ? (
                    <Badge variant="secondary">Expires in {tokenExpiresIn}s</Badge>
                  ) : null}
                </div>
                {widgetToken ? (
                  <CopyBlock value={widgetToken} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Generate a token to preview the widget.
                  </p>
                )}
                {tokenError ? <p className="text-sm text-destructive">{tokenError}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>2. Embed Widget</Label>
                <p className="text-sm text-muted-foreground">Add this to your frontend HTML.</p>
                <CopyBlock value={embedSnippet} />
                <p className="text-xs text-muted-foreground">
                  Auto-refresh uses <span className="font-mono">data-api-base-url</span>. Optional:
                  provide <span className="font-mono">data-refresh-url</span> to use your own
                  token broker endpoint.
                </p>
              </div>
              <div className="space-y-2">
                <Label>3. Preview URL</Label>
                <CopyBlock value={previewSnippet} />
                {widgetToken ? (
                  <Button asChild variant="link" className="px-0">
                    <a href={previewSnippet} target="_blank" rel="noreferrer">
                      Open preview <LinkIcon className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Generate a token to open the preview.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-8">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Destructive actions that cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete Project</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      project and remove all associated data, including ingestion sources and API keys.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deletingProject ? "Deleting..." : "Delete Project"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  </div>
);
}
