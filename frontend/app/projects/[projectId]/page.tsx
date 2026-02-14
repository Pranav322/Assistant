"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Upload, Link as LinkIcon, RefreshCw, Key, Code, AlertCircle, Trash2, FileText, Globe, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest, API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";
import CopyBlock from "@/components/CopyBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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
import { useNavbar } from "@/components/NavbarContext";

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
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Embed Configuration State
  const [embedMode, setEmbedMode] = useState<"popup" | "embedded">("popup");
  const [embedWidth, setEmbedWidth] = useState("");
  const [embedHeight, setEmbedHeight] = useState("");
  const [customOrigin, setCustomOrigin] = useState("");

  // Poll for status updates
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync navbar instantly from URL params (no API wait)
  useEffect(() => {
    const titleFromUrl = searchParams.get('title');
    if (titleFromUrl) {
      setTitle(titleFromUrl);
      setProjectName("Projects");
      setBackHref("/projects");
    }
    return () => {
      setTitle("Dashboard");
      setBackHref(null);
      setProjectName(null);
    };
  }, []); // empty deps = runs once on mount

  // Sync Navbar
  useEffect(() => {
    if (project) {
      setTitle(project.name);
      setProjectName("Projects");
      setBackHref("/projects");
    }
    return () => {
      setTitle("Dashboard");
      setBackHref(null);
      setProjectName(null);
    };
  }, [project, setTitle, setBackHref, setProjectName]);

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

  const generateWidgetToken = useCallback(async () => {
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
      const message = (err as Error).message;
      setTokenError(message.replace(/^Error:\s*/i, ""));
    } finally {
      setTokenLoading(false);
    }
  }, [project, projectId]);

  useEffect(() => {
    if (project && !widgetToken && !tokenLoading && !tokenError) {
      generateWidgetToken();
    }
  }, [project, tokenLoading, tokenError, generateWidgetToken]);

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
        }, 2000);
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
    setUploadProgress(0);

    const progressIntervalRef = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressIntervalRef);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    const cleanup = () => {
      clearInterval(progressIntervalRef);
    };

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

      cleanup();
      setUploadProgress(100);

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        cleanup();
        throw new Error(data?.detail || "Upload failed");
      }
      setIngestionStatus({
        sourceId: data.source_id,
        status: data.status,
        message: data.message,
      });
      setSelectedFile(null);
      setFileInputKey((prev) => prev + 1);
      setTimeout(() => setUploadProgress(0), 1000);
      setCurrentPage(1);
      loadData();
    } catch (err) {
      cleanup();
      setIngestionError((err as Error).message);
      setUploadProgress(0);
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

  function openDeleteModal(source: Source) {
    setSourceToDelete(source);
    setDeleteConfirmation("");
    setIsDeleteModalOpen(true);
  }

  async function confirmDeleteSource() {
    if (!sourceToDelete) return;
    const token = getToken();
    if (!token) return;

    setDeletingSourceId(sourceToDelete.id);
    try {
      await apiRequest(`/ingestion/${sourceToDelete.id}?project_id=${projectId}`, {
        method: "DELETE",
        token
      });
      setIsDeleteModalOpen(false);
      setSourceToDelete(null);
      const shouldGoToPrevPage = currentPage > 1 && (sources.length - 1) <= (currentPage - 1) * 10;
      await loadData();
      if (shouldGoToPrevPage) {
        setCurrentPage(currentPage - 1);
      }
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

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(sources.length / ITEMS_PER_PAGE);
  const paginatedSources = sources.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const originToUse = customOrigin ? normalizeOrigin(customOrigin) : originValue;
  const embedSnippet = `<script src="${widgetBaseUrl}/embed.js" data-token="<WIDGET_TOKEN>" data-origin="${originToUse}" data-project-id="${project.id}" data-api-base-url="${apiBaseUrl}" data-mode="${embedMode}"${embedWidth && /^\d+(px|%|vh|vw|rem|em)$/.test(embedWidth) ? ` data-width="${embedWidth}"` : ""}${embedHeight && /^\d+(px|%|vh|vw|rem|em)$/.test(embedHeight) ? ` data-height="${embedHeight}"` : ""} defer></script>`;

  const previewOrigin = originToUse;
  const previewToken = widgetToken || "<WIDGET_TOKEN>";
  const previewSnippet = `${widgetBaseUrl}/widget?projectId=${project.id}&origin=${encodeURIComponent(previewOrigin)}&token=${previewToken}&mode=${embedMode}`;

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <main className="mx-auto w-full max-w-[1400px] px-6 py-10 sm:px-8 lg:px-12 relative">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
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
                    {uploading && (
                      <div className="w-full bg-secondary rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
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
                              onClick={() => openDeleteModal(source)}
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
                {sources.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-end px-4 py-4 border-t gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          <TabsContent value="integration" className="space-y-8">
            <Card className="max-w-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" /> Integration</CardTitle>
                <CardDescription>Configure how you embed the chatbot in your own site.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* 1. Token Generation */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">1. Generate Widget Token</Label>
                    {widgetToken && <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Active Token</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Generate a short-lived token to preview and authorize the widget.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={generateWidgetToken} disabled={tokenLoading} size="sm">
                      {tokenLoading ? "Generating..." : widgetToken ? "Regenerate token" : "Generate token"}
                    </Button>
                    {tokenExpiresIn ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" /> Expires in {tokenExpiresIn}s
                      </span>
                    ) : null}
                  </div>
                  {widgetToken && <CopyBlock value={widgetToken} />}
                  {tokenError && <p className="text-sm text-destructive">{tokenError}</p>}
                </div>

                <div className="h-px bg-border w-full" />

                {/* 2. Configuration */}
                <div className="space-y-6">
                  <Label className="text-base font-semibold">2. Configuration</Label>
                  <p className="text-sm text-muted-foreground">Fine-tune the appearance and security.</p>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Display Mode</Label>
                      <div className="flex gap-2 p-1 bg-muted rounded-lg">
                        <Button
                          variant={embedMode === "popup" ? "default" : "ghost"}
                          onClick={() => setEmbedMode("popup")}
                          className="flex-1 rounded-md"
                          size="sm"
                        >
                          Popup
                        </Button>
                        <Button
                          variant={embedMode === "embedded" ? "default" : "ghost"}
                          onClick={() => setEmbedMode("embedded")}
                          className="flex-1 rounded-md"
                          size="sm"
                        >
                          Embedded
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic">
                        {embedMode === "popup"
                          ? "Floating bubble. Best for general assistance."
                          : "Fixed in place. Best for sidebars or full pages."}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dimensions</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground opacity-50">W</span>
                          <Input
                            placeholder={embedMode === "popup" ? "360px" : "100%"}
                            value={embedWidth}
                            onChange={(e) => setEmbedWidth(e.target.value)}
                            className="pl-7 h-9 text-sm"
                          />
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground opacity-50">H</span>
                          <Input
                            placeholder={embedMode === "popup" ? "600px" : "100%"}
                            value={embedHeight}
                            onChange={(e) => setEmbedHeight(e.target.value)}
                            className="pl-7 h-9 text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic">
                        Pixels (px), percent (%), or view units (vh).
                      </p>
                    </div>

                    <div className="sm:col-span-2 space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Allowed Origin</Label>
                      <Input
                        placeholder={`e.g., ${originValue}`}
                        value={customOrigin}
                        onChange={(e) => setCustomOrigin(e.target.value)}
                        className="font-mono text-sm h-9"
                      />
                      <p className="text-xs text-muted-foreground">
                        Restricts embedding to this domain for security.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border w-full" />

                {/* 3. Snippet */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">3. Embed Snippet</Label>
                  <p className="text-sm text-muted-foreground">
                    Copy and paste this code snippet into your HTML.
                  </p>
                  <CopyBlock value={embedSnippet} />
                </div>

                {/* 4. Preview */}
                {widgetToken && (
                  <div className="mt-8 space-y-4 rounded-xl border-2 border-primary/20 bg-primary/5 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        4. Interactive Preview
                      </div>
                      <Badge variant="outline" className="bg-background text-[10px] uppercase font-bold tracking-tighter">Authorized</Badge>
                    </div>
                    <div className="space-y-3">
                      <CopyBlock value={previewSnippet} />
                      <Button asChild className="w-full h-11 shadow-md hover:shadow-lg transition-all font-semibold" size="default">
                        <a href={previewSnippet} target="_blank" rel="noreferrer">
                          Launch Preview Simulator <LinkIcon className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-12">
            <div className="grid gap-8">
              {/* Advanced Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Key className="h-5 w-5" /> Developer Settings (Advanced)
                  </CardTitle>
                  <CardDescription>
                    API Keys allow you to manage your project via code (e.g., syncing files automatically from your server).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-6">
                    {(keys.length > 0 || freshKey) ? (
                      <div className="rounded-lg border bg-muted/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Code className="h-4 w-4" /> How to use your API Key
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Use the \`x-api-key\` header in your requests. This key provides full access to your project - keep it safe!
                        </p>
                        <CopyBlock
                          value={`curl -X POST "${apiBaseUrl}/ingestion/url?project_id=${project.id}" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-8 text-center space-y-3">
                        <div className="mx-auto w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center">
                          <Key className="h-5 w-5 text-primary/40" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">No API Keys Generated</p>
                          <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
                            Generate an API key to enable programmatic access for automated ingestion or server-side integrations.
                          </p>
                        </div>
                      </div>
                    )}

                    <form onSubmit={createKey} className="flex gap-3">
                      <Input
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. Server Automation Key"
                        className="flex-1 h-10 shadow-sm"
                        disabled={creatingKey}
                      />
                      <Button type="submit" disabled={creatingKey} className="shadow-sm">
                        {creatingKey ? "Creating..." : (keys.length > 0 || freshKey) ? "Generate Another Key" : "Generate First API Key"}
                      </Button>
                    </form>

                    {freshKey?.api_key && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20 animate-in fade-in zoom-in-95 duration-300">
                        <p className="text-xs font-bold uppercase text-green-700 dark:text-green-400 mb-2">New Key Created</p>
                        <CopyBlock value={freshKey.api_key} />
                        <p className="mt-2 text-xs text-muted-foreground italic">Important: Copy this key now. It will not be shown again for security reasons.</p>
                      </div>
                    )}

                    {keys.length > 0 && (
                      <div className="space-y-3 pt-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Keys</Label>
                        {keys.map((key) => (
                          <div key={key.id} className="flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div>
                              <p className="font-medium text-sm">{key.name || "API Key"}</p>
                              <p className="text-xs font-mono text-muted-foreground opacity-70">{key.prefix}...</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 border-none">Active</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <Trash2 className="h-5 w-5" /> Danger Zone
                  </CardTitle>
                  <CardDescription>Destructive actions that cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="shadow-sm">Delete Project</Button>
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
            </div>
          </TabsContent>
        </Tabs>
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Source"
        >
          <div className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-destructive">Warning: Permanent Deletion</h3>
                  <div className="mt-2 text-sm text-destructive/90">
                    <p>
                      This action guarantees data loss. If you are sure, type <strong>{sourceToDelete?.metadata.filename || sourceToDelete?.metadata.source_url || sourceToDelete?.content_hash}</strong> below.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-delete">Type the name/URL to confirm</Label>
              <Input
                id="confirm-delete"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={sourceToDelete?.metadata.filename || sourceToDelete?.metadata.source_url || sourceToDelete?.content_hash}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteSource}
                disabled={deleteConfirmation !== (sourceToDelete?.metadata.filename || sourceToDelete?.metadata.source_url || sourceToDelete?.content_hash)}
              >
                {deletingSourceId === sourceToDelete?.id ? "Deleting..." : "Delete Source"}
              </Button>
            </div>
          </div>
        </Modal>
      </main >
    </div >
  );
}
