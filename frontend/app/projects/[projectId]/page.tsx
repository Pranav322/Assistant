"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import useSWR, { mutate } from "swr";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Upload, Link as LinkIcon, RefreshCw, Key, Code, AlertCircle, Trash2, FileText, Globe, Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, MessageSquare, Play, Terminal, ChevronDown, Plus, X, ExternalLink, Box, Puzzle, Settings2, Rocket, Info } from "lucide-react";
import { apiRequest, API_BASE_URL, fetcher } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import CopyBlock from "@/components/CopyBlock";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  settings: Record<string, any>;
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
  progress?: {
    stage: string;
    percent: number;
    total_chunks?: number;
    processed_chunks?: number;
  };
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

  const { data: project, isLoading: projectLoading } = useSWR<Project>(
    projectId ? `/projects/${projectId}` : null,
    fetcher
  );
  const { data: keys } = useSWR<ApiKey[]>(
    projectId ? `/projects/${projectId}/api-keys` : null,
    fetcher
  );
  const { data: sources } = useSWR<Source[]>(
    projectId ? `/projects/${projectId}/sources` : null,
    fetcher
  );
  const { data: usage } = useSWR<{ requests: number; tokens: number; limit?: number }>(
    projectId ? `/usage?project_id=${projectId}` : null,
    fetcher
  );

  const [newKeyName, setNewKeyName] = useState("");
  const [freshKey, setFreshKey] = useState<ApiKey | null>(null);
  const [error, setError] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [widgetToken, setWidgetToken] = useState<string | null>(null);
  const [tokenExpiresIn, setTokenExpiresIn] = useState<number | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState("");
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [fileUploadStatus, setFileUploadStatus] = useState<{
    sourceId: string;
    status: string;
    message?: string;
  } | null>(null);
  const [fileUploadError, setFileUploadError] = useState("");

  // URL Ingestion State
  const [ingestUrl, setIngestUrl] = useState("");
  const [urlIngesting, setUrlIngesting] = useState(false);
  const [urlIngestStatus, setUrlIngestStatus] = useState<{
    sourceId: string;
    status: string;
    message?: string;
  } | null>(null);
  const [urlIngestError, setUrlIngestError] = useState("");

  // Bulk Operations
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [statusLoading, setStatusLoading] = useState(false);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Allowed Origins Management State
  const [newOriginInput, setNewOriginInput] = useState("");
  const [isUpdatingOrigins, setIsUpdatingOrigins] = useState(false);
  const [originError, setOriginError] = useState("");

  // Embed Configuration State
  const [embedMode, setEmbedMode] = useState<"popup" | "embedded">("popup");
  const [embedWidth, setEmbedWidth] = useState("");
  const [embedHeight, setEmbedHeight] = useState("");
  const [customOrigin, setCustomOrigin] = useState("");

  // Poll for status updates - now using SWR refreshInterval for pending sources
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRedirectedToTryIt = useRef(false);
  const prevCompletedCount = useRef<number | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showReadyBanner, setShowReadyBanner] = useState(false);

  const [activeTab, setActiveTab] = useState("knowledge-base");

  // Branding & UX State
  const [botTitle, setBotTitle] = useState("");
  const [botColor, setBotColor] = useState("#4f46e5");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [starterQuestions, setStarterQuestions] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingError, setBrandingError] = useState("");

  // Set/reset navbar frame on mount/unmount.
  useEffect(() => {
    return () => {
      setTitle("Dashboard");
      setBackHref(null);
      setProjectName(null);
    };
  }, [setBackHref, setProjectName, setTitle]);

  // Sync title/tab from URL params.
  useEffect(() => {
    const titleFromUrl = searchParams.get('title');
    const tabFromUrl = searchParams.get('tab');
    if (titleFromUrl) {
      setTitle(titleFromUrl);
      setProjectName("Projects");
      setBackHref("/projects");
    }
    if (tabFromUrl && ["knowledge-base", "embed", "customize", "settings"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, setBackHref, setProjectName, setTitle]);

  // Sync Navbar
  useEffect(() => {
    if (project) {
      setTitle(project.name);
      setProjectName("Projects");
      setBackHref("/projects");

      // Sync Branding State
      const s = project.settings || {};
      setBotTitle(s.title || "Assistant");
      setBotColor(s.primary_color || "#4f46e5");
      setWelcomeMessage(s.welcome_message || "How can I help you today?");
      setStarterQuestions((s.starter_questions || []).join("\n"));
      setSystemPrompt(s.system_prompt || "You are a helpful assistant. Use the provided documents to answer.");
      setLogoUrl(s.logo_url || "");
      setEmbedMode(s.embed_mode || "popup");
      setEmbedWidth(s.width || "");
      setEmbedHeight(s.height || "");
    }
    return () => {
      setTitle("Dashboard");
      setBackHref(null);
      setProjectName(null);
    };
  }, [project, setTitle, setBackHref, setProjectName]);

  // Clear freshKey when tab changes or after 30 seconds
  useEffect(() => {
    setFreshKey(null);
  }, [activeTab]);

  useEffect(() => {
    if (freshKey?.api_key) {
      const timer = setTimeout(() => {
        setFreshKey(null);
      }, 30000); // Clear after 30 seconds
      return () => clearTimeout(timer);
    }
  }, [freshKey]);

  const generateWidgetToken = useCallback(async () => {
    setTokenError("");
    setWidgetToken(null);
    setTokenExpiresIn(null);
    const token = getToken();
    if (!token || !project) return;

    const apiBaseUrl = API_BASE_URL.replace(/\/$/, "");
    const isLocal = apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1");
    const defaultOrigin = isLocal ? "http://localhost:3000" : "https://contextly.live";
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

  // Polling logic - SWR handles background revalidation
  useEffect(() => {
    const hasPending = sources?.some(s => ["pending", "processing"].includes(s.status)) ||
      (fileUploadStatus && ["pending", "processing"].includes(fileUploadStatus.status)) ||
      (urlIngestStatus && ["pending", "processing"].includes(urlIngestStatus.status));

    if (hasPending) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          mutate(`/projects/${projectId}/sources`);
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
  }, [sources, fileUploadStatus, urlIngestStatus, projectId]);

  // Auto-redirect to "Embed" after first successful ingestion
  useEffect(() => {
    if (hasRedirectedToTryIt.current) return;
    const completedCount = sources?.filter(s => s.status === "completed").length ?? 0;
    if (prevCompletedCount.current !== null && completedCount > prevCompletedCount.current && completedCount >= 1) {
      hasRedirectedToTryIt.current = true;
      setActiveTab("embed");
      setShowReadyBanner(true);
      // Auto-hide banner after 5 seconds
      setTimeout(() => setShowReadyBanner(false), 5000);
    }
    prevCompletedCount.current = completedCount;
  }, [sources]);

  // Debounced auto-save for Customize tab
  const triggerAutoSave = useCallback(() => {
    if (!project) return;
    setHasUnsavedChanges(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveBrandingQuiet();
    }, 1500);
  }, [project]);

  // Cleanup auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  async function saveBrandingQuiet() {
    const token = getToken();
    if (!token) return;
    
    setIsSavingBranding(true);
    setBrandingError("");
    
    try {
      const updatedSettings = {
        ...(project?.settings || {}),
        title: botTitle,
        primary_color: botColor,
        welcome_message: welcomeMessage,
        starter_questions: starterQuestions.split("\n").map(q => q.trim()).filter(Boolean),
        system_prompt: systemPrompt,
        logo_url: logoUrl,
        embed_mode: embedMode,
        width: embedWidth,
        height: embedHeight,
      };

      await apiRequest(`/projects/${projectId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ settings: updatedSettings }),
      });
      await mutate(`/projects/${projectId}`);
      setHasUnsavedChanges(false);
    } catch (err) {
      setBrandingError((err as Error).message);
    } finally {
      setIsSavingBranding(false);
    }
  }

  async function saveBranding() {
    setIsSavingBranding(true);
    setBrandingError("");
    const token = getToken();
    if (!token) return;

    try {
      const updatedSettings = {
        ...(project?.settings || {}),
        title: botTitle,
        primary_color: botColor,
        welcome_message: welcomeMessage,
        starter_questions: starterQuestions.split("\n").map(q => q.trim()).filter(Boolean),
        system_prompt: systemPrompt,
        logo_url: logoUrl,
        embed_mode: embedMode,
        width: embedWidth,
        height: embedHeight,
      };

      await apiRequest(`/projects/${projectId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ settings: updatedSettings }),
      });
      mutate(`/projects/${projectId}`);
      toast.success("Settings saved successfully");
    } catch (err) {
      setBrandingError((err as Error).message);
      toast.error("Failed to save settings", { description: (err as Error).message });
    } finally {
      setIsSavingBranding(false);
    }
  }

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
      mutate(`/projects/${projectId}/api-keys`);
      toast.success("API key created successfully", {
        description: "Copy your key now - it won't be shown again",
      });
    } catch (err) {
      setError((err as Error).message);
      toast.error("Failed to create API key", { description: (err as Error).message });
    } finally {
      setCreatingKey(false);
    }
  }

  async function revokeKey(keyId: string) {
    const token = getToken();
    if (!token) return;
    
    try {
      await apiRequest(`/projects/${projectId}/api-keys/${keyId}`, {
        method: "DELETE",
        token,
      });
      mutate(`/projects/${projectId}/api-keys`);
      toast.success("API key revoked successfully");
    } catch (err) {
      toast.error("Failed to revoke API key", { description: (err as Error).message });
    }
  }

  async function uploadFile(e: React.FormEvent) {
    e.preventDefault();
    setFileUploadError("");
    const token = getToken();
    if (!token) return;
    if (!selectedFile) {
      setFileUploadError("Select a file to upload.");
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
      setFileUploadStatus({
        sourceId: data.source_id,
        status: data.status,
        message: data.message,
      });
      toast.success("File uploaded successfully", {
        description: "Processing will begin shortly",
      });
      setSelectedFile(null);
      setFileInputKey((prev) => prev + 1);
      setTimeout(() => setUploadProgress(0), 1000);
      setCurrentPage(1);
      mutate(`/projects/${projectId}/sources`);
    } catch (err) {
      cleanup();
      setFileUploadError((err as Error).message);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  }

  async function ingestUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUrlIngestError("");
    const token = getToken();
    if (!token) return;
    const trimmed = ingestUrl.trim();
    if (!trimmed) {
      setUrlIngestError("Enter a URL to ingest.");
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setUrlIngestError("URL must start with http:// or https://");
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
      setUrlIngestStatus({ sourceId: data.source_id, status: data.status });
      toast.success("URL added for ingestion");
      setIngestUrl("");
      mutate(`/projects/${projectId}/sources`);
    } catch (err) {
      setUrlIngestError((err as Error).message);
    } finally {
      setUrlIngesting(false);
    }
  }



  function handleSelectSource(sourceId: string) {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  }

  function handleSelectAll() {
    if (!sources) return;
    if (selectedSources.length === sources.length) {
      setSelectedSources([]);
    } else {
      setSelectedSources(sources.map((s) => s.id));
    }
  }

  async function confirmBulkDelete() {
    if (selectedSources.length === 0) return;
    setIsBulkDeleting(true);
    const token = getToken();
    if (!token) return;

    try {
      await Promise.all(
        selectedSources.map((id) =>
          apiRequest(`/ingestion/${id}?project_id=${projectId}`, {
            method: "DELETE",
            token,
          })
        )
      );

      toast.success(`Deleted ${selectedSources.length} sources`);
      setIsBulkDeleteModalOpen(false);
      setSelectedSources([]);
      setCurrentPage(1);
      await mutate(`/projects/${projectId}/sources`);
    } catch (err) {
      toast.error("Failed to delete some sources", {
        description: (err as Error).message,
      });
    } finally {
      setIsBulkDeleting(false);
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
      toast.success("Source deleted successfully");
      setIsDeleteModalOpen(false);
      setSourceToDelete(null);
      const shouldGoToPrevPage = currentPage > 1 && ((sources?.length ?? 0) - 1) <= (currentPage - 1) * 10;
      await mutate(`/projects/${projectId}/sources`);
      if (shouldGoToPrevPage) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      setError((err as Error).message);
      toast.error("Failed to delete source", { description: (err as Error).message });
    } finally {
      setDeletingSourceId(null);
    }
  }

  async function deleteProject() {
    const token = getToken();
    if (!token) return;

    // Stop polling before deletion
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

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

  async function handleAddOrigin(e: React.FormEvent) {
    e.preventDefault();
    setOriginError("");
    if (!newOriginInput.trim()) return;
    if (!project) return;
    const token = getToken();
    if (!token) return;

    const toAdd = newOriginInput.trim();
    if (project.allowed_origins.includes(toAdd)) {
      setOriginError("Origin already exists.");
      return;
    }

    const updatedList = [...project.allowed_origins, toAdd];

    setIsUpdatingOrigins(true);
    try {
      await apiRequest(`/projects/${projectId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ allowed_origins: updatedList }),
      });
      toast.success("Origin added successfully");
      await mutate(`/projects/${projectId}`);
      setNewOriginInput("");
    } catch (err) {
      setOriginError((err as Error).message);
      toast.error("Failed to add origin", { description: (err as Error).message });
    } finally {
      setIsUpdatingOrigins(false);
    }
  }

  async function handleRemoveOrigin(originToRemove: string) {
    if (!project) return;
    const token = getToken();
    if (!token) return;

    const updatedList = project.allowed_origins.filter(o => o !== originToRemove);
    if (updatedList.length === 0) {
      setOriginError("You must have at least one allowed origin.");
      return;
    }

    setIsUpdatingOrigins(true);
    try {
      await apiRequest(`/projects/${projectId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ allowed_origins: updatedList }),
      });
      toast.success("Origin removed successfully");
      await mutate(`/projects/${projectId}`);
    } catch (err) {
      setOriginError((err as Error).message);
      toast.error("Failed to remove origin", { description: (err as Error).message });
    } finally {
      setIsUpdatingOrigins(false);
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
  const defaultOrigin = isLocal ? "http://localhost:3000" : "https://contextly.live";
  const originValue = normalizeOrigin(project.allowed_origins?.[0] || defaultOrigin);
  const widgetBaseUrl = (() => {
    const envWidget = process.env.NEXT_PUBLIC_WIDGET_BASE_URL;
    if (envWidget) {
      return envWidget.replace(/\/$/, "");
    }
    if (typeof window === "undefined") {
      return isLocal ? "http://localhost:3000" : "https://widget.contextly.live";
    }
    try {
      const current = new URL(window.location.origin);
      const host = current.host;
      if (host.startsWith("app.")) {
        return `${current.protocol}//widget.${host.slice(4)}`;
      }
      return current.origin;
    } catch {
      return isLocal ? "http://localhost:3000" : "https://widget.contextly.live";
    }
  })();

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil((sources?.length ?? 0) / ITEMS_PER_PAGE);
  const paginatedSources = (sources ?? []).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const originToUse = customOrigin ? normalizeOrigin(customOrigin) : originValue;
  const embedSnippet = `<script
  src="${widgetBaseUrl}/embed.js"
  data-token="<WIDGET_TOKEN>"
  data-origin="${originToUse}"
  data-project-id="${project.id}"
  data-api-base-url="${apiBaseUrl}"
  data-mode="${embedMode}"${embedWidth && /^\d+(px|%|vh|vw|rem|em)$/.test(embedWidth)
      ? `\n  data-width="${embedWidth}"`
      : ""
    }${embedHeight && /^\d+(px|%|vh|vw|rem|em)$/.test(embedHeight)
      ? `\n  data-height="${embedHeight}"`
      : ""
    }
  defer
></script>`;

  const previewOrigin = originToUse;
  const previewToken = widgetToken || "<WIDGET_TOKEN>";
  const previewSnippet = `${widgetBaseUrl}/widget?projectId=${project.id}&origin=${encodeURIComponent(previewOrigin)}&token=${previewToken}&mode=${embedMode}`;

  const isNewProject = (sources?.length ?? 0) === 0;

  return (
    <div className="min-h-screen bg-muted/30 pb-20 w-full max-w-[100vw] overflow-x-hidden">
      <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8 lg:px-12 relative overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 relative">
            <TabsList className="w-auto inline-flex justify-start h-auto p-1 bg-muted/50 rounded-lg">
              <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
              <TabsTrigger value="customize">Customize</TabsTrigger>
              <TabsTrigger value="embed">Embed</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            {/* Mobile scroll indicator */}
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
          </div>

          <TabsContent value="knowledge-base" className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <Card className={cn("transition-colors", uploading ? "border-primary/50 bg-primary/5" : "")}>
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
                      <div className="relative flex-1 group">
                        <Input
                          key={fileInputKey}
                          type="file"
                          accept=".pdf,.txt,.md,.markdown"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10 h-11 w-full"
                        />
                        <div className="flex items-center h-11 w-full rounded-md border border-input bg-background px-4 py-2 text-sm ring-offset-background group-hover:border-primary/50 transition-colors shadow-sm">
                          <div className="bg-primary text-primary-foreground text-xs font-bold uppercase px-3 py-1.5 rounded-full mr-3 shrink-0">
                            Browse
                          </div>
                          <span className="text-muted-foreground truncate font-medium">
                            {selectedFile?.name || "Choose a file..."}
                          </span>
                        </div>
                      </div>
                      <Button onClick={uploadFile} disabled={uploading} className="h-11 px-6 font-semibold">
                        {uploading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Uploading
                          </span>
                        ) : "Upload"}
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
                    {fileUploadError && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{fileUploadError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={cn("transition-colors", urlIngesting ? "border-primary/50 bg-primary/5" : "")}>
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
                        {urlIngesting ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Ingesting
                          </span>
                        ) : "Ingest"}
                      </Button>
                    </div>
                    {urlIngestError && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{urlIngestError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test Chatbot CTA - appears when data is available */}
            {!isNewProject && (
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Play className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Ready to test your chatbot?</h3>
                    <p className="text-sm text-muted-foreground">Chat with your bot using {sources?.filter(s => s.status === "completed").length ?? 0} documents</p>
                  </div>
                </div>
                <Button 
                  size="lg"
                  className="gap-2 shrink-0"
                  disabled={tokenLoading || !!tokenError || !widgetToken}
                  onClick={() => {
                    if (!widgetToken) return;
                    const width = 480;
                    const height = 700;
                    const left = window.screenX + (window.outerWidth - width) / 2;
                    const top = window.screenY + (window.outerHeight - height) / 2;
                    window.open(
                      previewSnippet,
                      'LivePreview',
                      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
                    );
                  }}
                >
                  {tokenLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                  ) : (
                    <><ExternalLink className="h-4 w-4" /> Test Chatbot</>
                  )}
                </Button>
              </div>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Data Sources</CardTitle>
                  <CardDescription>Manage your ingested files and URLs.</CardDescription>
                </div>
                {selectedSources.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedSources.length} selected
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={(sources?.length ?? 0) > 0 && selectedSources.length === (sources?.length ?? 0)}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Name/URL</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sources?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                              <p className="text-lg font-medium">No data sources yet</p>
                              <p className="text-sm text-muted-foreground max-w-sm">
                                Upload documents or add URLs to build your knowledge base. Your chatbot will use these to answer questions.
                              </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const element = document.querySelector('[value="knowledge-base"]');
                                  if (element) {
                                    const fileInput = document.querySelector('input[type="file"]');
                                    fileInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }
                                }}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload File
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedSources.map((source) => (
                        <TableRow key={source.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedSources.includes(source.id)}
                              onCheckedChange={() => handleSelectSource(source.id)}
                            />
                          </TableCell>
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
                          <TableCell className="text-muted-foreground text-xs">
                            {source.metadata.size_bytes
                              ? new Intl.NumberFormat('en-US', { style: 'unit', unit: 'byte', unitDisplay: 'narrow' }).format(source.metadata.size_bytes)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {source.metadata.page_count ?? '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              source.status === "completed" ? "default" :
                                source.status === "failed" ? "destructive" : "secondary"
                            } className="gap-1.5 px-2.5 py-0.5 min-w-[90px] justify-center">
                              {source.status === "completed" && (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              {source.status === "failed" && (
                                <XCircle className="h-3 w-3" />
                              )}
                              {["pending", "processing"].includes(source.status) && (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              )}
                              <span className="capitalize">
                                {["pending", "processing"].includes(source.status) && source.progress?.percent !== undefined
                                  ? `${source.progress.percent}%`
                                  : source.status}
                              </span>
                            </Badge>
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
                {(sources?.length ?? 0) > ITEMS_PER_PAGE && (
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

          {/* ═══ EMBED — Pure Code, Zero Config ═══ */}
          <TabsContent value="embed" className="space-y-6">
            {/* Primary Embed Snippet */}
            <Tabs defaultValue="script" className="w-full space-y-6">
              <TabsList className="w-full grid grid-cols-3 h-auto p-1 bg-muted/30 rounded-lg mb-2">
                <TabsTrigger value="script" className="text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:rounded-md transition-all">
                  Script
                </TabsTrigger>
                <TabsTrigger value="react-sdk" className="text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:rounded-md transition-all">
                  React SDK
                </TabsTrigger>
                <TabsTrigger value="headless" className="text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:rounded-md transition-all">
                  Headless
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="script" className="space-y-4">
                {/* Quick Install */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Rocket className="h-4 w-4" /> Quick Install
                    </CardTitle>
                    <CardDescription>Paste this before the closing <code>&lt;/body&gt;</code> tag.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CopyBlock value={embedSnippet} className="text-xs" />
                  </CardContent>
                </Card>

                {/* Full HTML Example */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">Full HTML Example</CardTitle>
                        <CardDescription>Complete example with custom button - copy & paste to test</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">For Beginners</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CopyBlock value={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Site with Contextly Chatbot</title>
  
  <!-- OPTIONAL: Add your own styles -->
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }
    
    /* Custom button to open chat */
    .chat-trigger-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4f46e5; /* Change to your brand color */
      color: white;
      border: none;
      padding: 14px 24px;
      border-radius: 50px;
      cursor: pointer;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);
      transition: transform 0.2s;
    }
    
    .chat-trigger-btn:hover {
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <h1>Welcome to My Website</h1>
  <p>This is my site with an AI chatbot assistant.</p>
  
  <!-- Custom button to open/close the chatbot -->
  <button class="chat-trigger-btn" onclick="toggleChat()">
    💬 Chat with us
  </button>

  <!-- 
    ========================================
    COPY THE SCRIPT BELOW AND REPLACE:
    - <WIDGET_TOKEN> with your actual token from Settings tab
    ========================================
  -->
${embedSnippet.replace('<WIDGET_TOKEN>', '<YOUR_WIDGET_TOKEN>')}

  <!-- Control the chatbot -->
  <script>
    // Toggle chat open/close when button is clicked
    function toggleChat() {
      if (window.ChatbotWidget) {
        window.ChatbotWidget.toggle();
      } else {
        console.log('Chatbot is loading...');
      }
    }
    
    // Or use these specific functions:
    // window.ChatbotWidget.open();   // Open the chat
    // window.ChatbotWidget.close();  // Close the chat
  </script>
</body>
</html>`} className="text-xs" />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="react-sdk" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Box className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">React SDK</CardTitle>
                        <CardDescription>High-level component for React & Next.js</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">1. Install</Label>
                      <CopyBlock value="npm install contextly" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">2. Usage</Label>
                      <CopyBlock value={`import { Chat } from "contextly";

function App() {
  return (
    <Chat
      projectId="${project.id}" 
      token="YOUR_WIDGET_TOKEN"
    />
  );
}`} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="headless" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Puzzle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">Headless Hooks</CardTitle>
                        <CardDescription>Your UI, our logic</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">1. Install</Label>
                      <CopyBlock value="npm install contextly" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">2. Usage</Label>
                      <CopyBlock value={`import { useChat } from "contextly";

function CustomUI() {
  const { messages, input, setInput, sendMessage, isLoading } = useChat({
    projectId: "${project.id}",
    token: "YOUR_WIDGET_TOKEN",
  });

  return (
    <div>
      {messages.map(m => <div key={m.id}>{m.content}</div>)}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={() => sendMessage()} disabled={isLoading}>Send</button>
    </div>
  );
}`} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ═══ CUSTOMIZE — Side-by-Side with Live Preview ═══ */}
          <TabsContent value="customize" className="space-y-6">
            {/* Header with Save Status */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Customize</h2>
                <p className="text-sm text-muted-foreground">Changes auto-save and sync to your live widget.</p>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5 animate-in fade-in">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
                  </span>
                )}
                {isSavingBranding && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                  </span>
                )}
                {!hasUnsavedChanges && !isSavingBranding && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" /> Saved
                  </span>
                )}
              </div>
            </div>

            {/* Side-by-Side Layout: Settings | Preview */}
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1fr,400px]">
              {/* Left Column: All Settings */}
              <div className="space-y-6">
                {/* Layout & Display */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings2 className="h-4 w-4" /> Layout
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Display Mode</Label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                        <Button
                          variant={embedMode === "popup" ? "default" : "ghost"}
                          onClick={() => { setEmbedMode("popup"); triggerAutoSave(); }}
                          className="h-8 text-xs"
                        >
                          Popup Bubble
                        </Button>
                        <Button
                          variant={embedMode === "embedded" ? "default" : "ghost"}
                          onClick={() => { setEmbedMode("embedded"); triggerAutoSave(); }}
                          className="h-8 text-xs"
                        >
                          Embedded Flat
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Appearance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Appearance</CardTitle>
                    <CardDescription>How your bot looks to visitors.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bot Title</Label>
                        <Input value={botTitle} onChange={e => { setBotTitle(e.target.value); triggerAutoSave(); }} placeholder="e.g. Sales Assistant" />
                      </div>
                      <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <div className="flex gap-2 items-center">
                          <Input 
                            type="color" 
                            value={botColor} 
                            onChange={e => { 
                              const value = e.target.value;
                              if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                                setBotColor(value); 
                                triggerAutoSave(); 
                              }
                            }} 
                            className="w-16 h-10 p-1" 
                          />
                          <Input 
                            value={botColor} 
                            onChange={e => { 
                              const value = e.target.value;
                              setBotColor(value);
                              if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                                triggerAutoSave(); 
                              }
                            }} 
                            placeholder="#4f46e5"
                            className={cn(
                              !/^#[0-9A-Fa-f]{6}$/.test(botColor) && botColor !== "" && "border-destructive focus-visible:ring-destructive"
                            )}
                          />
                        </div>
                        {!/^#[0-9A-Fa-f]{6}$/.test(botColor) && botColor !== "" && (
                          <p className="text-xs text-destructive">Please enter a valid hex color (e.g., #4f46e5)</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Welcome Message</Label>
                      <Input value={welcomeMessage} onChange={e => { setWelcomeMessage(e.target.value); triggerAutoSave(); }} placeholder="How can I help you today?" />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo URL (Optional)</Label>
                      <Input value={logoUrl} onChange={e => { setLogoUrl(e.target.value); triggerAutoSave(); }} placeholder="https://..." />
                    </div>
                  </CardContent>
                </Card>

                {/* AI Behavior */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI Behavior</CardTitle>
                    <CardDescription>Control what the bot says and how it starts conversations.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Starter Questions (One per line)</Label>
                        <span className={cn(
                          "text-xs",
                          starterQuestions.length > 400 ? "text-amber-600" : "text-muted-foreground",
                          starterQuestions.length > 500 && "text-destructive"
                        )}>
                          {starterQuestions.length}/500
                        </span>
                      </div>
                      <textarea
                        className={cn(
                          "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          starterQuestions.length > 500 && "border-destructive focus-visible:ring-destructive"
                        )}
                        value={starterQuestions}
                        onChange={e => { 
                          const value = e.target.value;
                          if (value.length <= 500) {
                            setStarterQuestions(value); 
                            triggerAutoSave(); 
                          }
                        }}
                        placeholder={"What is your product?\nHow much does it cost?"}
                        maxLength={500}
                      />
                      {starterQuestions.length > 500 && (
                        <p className="text-xs text-destructive">Maximum 500 characters allowed</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>System Prompt (Instructions)</Label>
                      <textarea
                        className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono text-xs"
                        value={systemPrompt}
                        onChange={e => { setSystemPrompt(e.target.value); triggerAutoSave(); }}
                        placeholder="You are a helpful assistant..."
                      />
                      <p className="text-[10px] text-muted-foreground">This guides the AI&apos;s tone and behavior.</p>
                    </div>
                  </CardContent>
                </Card>

                {brandingError && <p className="text-sm text-destructive">{brandingError}</p>}
              </div>

              {/* Right Column: Sticky Live Preview */}
              <div className="lg:sticky lg:top-6 lg:self-start">
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Live Preview</CardTitle>
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">{embedMode}</Badge>
                    </div>
                    <CardDescription>See changes instantly as you customize</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div
                      className={cn(
                        "relative w-full transition-all duration-500 ease-in-out",
                        embedMode === "popup" ? "p-3 bg-muted/30" : "p-0 bg-white"
                      )}
                    >
                      <div
                        className={cn(
                          "flex flex-col bg-white transition-all duration-500 mx-auto",
                          embedMode === "popup"
                            ? "rounded-2xl shadow-2xl border h-[450px] max-w-[320px]"
                            : "rounded-lg border shadow-sm h-[450px]"
                        )}
                      >
                        {/* Header */}
                        <div
                          className={cn(
                            "flex items-center gap-3 p-3 text-white",
                            embedMode === "popup" ? "rounded-t-2xl" : "rounded-t-lg"
                          )}
                          style={{ backgroundColor: botColor }}
                        >
                          {logoUrl ? (
                            <img src={logoUrl} alt="logo" className="h-7 w-7 rounded-full object-cover bg-white/20" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                              {botTitle?.charAt(0) || "A"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{botTitle || "Assistant"}</p>
                            <p className="text-[10px] opacity-80">Online</p>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-3 bg-muted/10 space-y-3 overflow-y-auto">
                          <div className="flex flex-col gap-1.5 max-w-[85%]">
                            <div className="bg-white p-2.5 rounded-2xl rounded-tl-sm shadow-sm text-xs border">
                              {welcomeMessage || "How can I help you today?"}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {starterQuestions.split("\n").filter(Boolean).slice(0, 3).map((q, i) => (
                              <div
                                key={i}
                                className="text-[10px] px-2.5 py-1 rounded-full border bg-white shadow-sm cursor-default hover:border-primary/50 transition-colors font-medium text-foreground/80"
                              >
                                {q}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t bg-white">
                          <div className="relative">
                            <div className="h-9 w-full rounded-full bg-muted/40 border-none px-3 flex items-center text-[11px] text-muted-foreground">
                              Enter message...
                            </div>
                            <div className="absolute right-1 top-0.5 h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: botColor }}>
                              <CheckCircle2 className="h-3.5 w-3.5 text-white opacity-40" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {embedMode === "popup" && (
                        <div className="absolute bottom-5 right-5 h-10 w-10 rounded-full shadow-lg flex items-center justify-center text-white" style={{ backgroundColor: botColor }}>
                          <MessageSquare className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                  {/* Test Button Footer */}
                  <div className="p-4 border-t bg-muted/30">
                    <Button 
                      className="w-full gap-2"
                      variant="default"
                      disabled={tokenLoading || !!tokenError || !widgetToken}
                      onClick={() => {
                        if (!widgetToken) return;
                        const width = 480;
                        const height = 700;
                        const left = window.screenX + (window.outerWidth - width) / 2;
                        const top = window.screenY + (window.outerHeight - height) / 2;
                        window.open(
                          previewSnippet,
                          'LivePreview',
                          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
                        );
                      }}
                    >
                      {tokenLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                      ) : (
                        <><Play className="h-4 w-4" /> Test Your Chatbot</>
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-8">
            {/* Token Usage Card */}
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Key className="h-5 w-5" /> Token Usage
                </CardTitle>
                <CardDescription>
                  Monitor your project&apos;s API usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usage ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 rounded-lg bg-background/50 border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Tokens Used</p>
                      <p className="text-2xl font-bold mt-1">{usage.tokens?.toLocaleString() || 0}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Requests</p>
                      <p className="text-2xl font-bold mt-1">{usage.requests?.toLocaleString() || 0}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Token Limit</p>
                      <p className="text-2xl font-bold mt-1">{usage.limit?.toLocaleString() || "Unlimited"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading usage data...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Row: Widget Token & Allowed Origins side by side */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Widget Token Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Key className="h-5 w-5" /> Widget Token
                  </CardTitle>
                  <CardDescription>
                    Use this token to embed the chatbot widget on your website.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tokenError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{tokenError}</AlertDescription>
                    </Alert>
                  )}
                  
                  {widgetToken ? (
                    <div className="space-y-3">
                      <div className="rounded-lg border bg-muted/50 p-3 min-w-0">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Your Widget Token</Label>
                        <div className="min-w-0 overflow-hidden">
                          <CopyBlock value={widgetToken} className="text-xs" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            Token active
                          </span>
                          {tokenExpiresIn && (
                            <span>Expires in {Math.floor(tokenExpiresIn / 60)}m</span>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={generateWidgetToken}
                          disabled={tokenLoading}
                        >
                          {tokenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground bg-muted/30">
                        No widget token generated yet.
                      </div>
                      <Button 
                        onClick={generateWidgetToken}
                        disabled={tokenLoading}
                        size="sm"
                      >
                        {tokenLoading ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
                        ) : (
                          <><Key className="h-4 w-4 mr-2" /> Generate Token</>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Allowed Origins Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" /> Allowed Origins
                  </CardTitle>
                  <CardDescription>
                    Whitelist domains where your widget can load.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleAddOrigin} className="flex gap-2">
                    <Input
                      value={newOriginInput}
                      onChange={(e) => setNewOriginInput(e.target.value)}
                      placeholder="https://myapp.com"
                      className="flex-1 h-9 text-sm"
                      disabled={isUpdatingOrigins}
                    />
                    <Button type="submit" disabled={isUpdatingOrigins} size="sm">
                      {isUpdatingOrigins ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </form>
                  {originError && <p className="text-xs text-destructive">{originError}</p>}

                  <div className="rounded-md border bg-muted/20 divide-y max-h-[200px] overflow-y-auto">
                    {project.allowed_origins && project.allowed_origins.length > 0 ? (
                      project.allowed_origins.map((origin) => (
                        <div key={origin} className="flex items-center justify-between p-2.5 text-sm group">
                          <span className="font-mono text-xs truncate mr-2 block min-w-0 flex-1" title={origin}>{origin}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => handleRemoveOrigin(origin)}
                            disabled={isUpdatingOrigins}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-muted-foreground text-xs">
                        No origins configured.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Collapsible API Keys Section */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="api-keys" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Code className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="text-sm font-semibold">Developer API Keys</p>
                      <p className="text-xs text-muted-foreground">Manage API keys for server-side integrations</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6">
                    {/* Create Key Form */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Create New API Key</Label>
                      <form onSubmit={createKey} className="flex gap-3">
                        <Input
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="Key name (e.g., Production Server)"
                          className="flex-1 h-10 shadow-sm"
                          disabled={creatingKey}
                        />
                        <Button type="submit" disabled={creatingKey} className="shadow-sm">
                          {creatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                          <span className="ml-2 hidden sm:inline">Create Key</span>
                        </Button>
                      </form>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>

                    {/* New Key Display */}
                    {freshKey?.api_key && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20 animate-in fade-in zoom-in-95 duration-300">
                        <p className="text-xs font-bold uppercase text-green-700 dark:text-green-400 mb-2">New Key Created</p>
                        <div className="relative w-full max-w-full overflow-hidden">
                          <CopyBlock value={freshKey.api_key} className="break-all whitespace-pre-wrap" />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground italic">Important: Copy this key now. It will not be shown again for security reasons.</p>
                      </div>
                    )}

                    {/* Code Sample */}
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Code className="h-4 w-4" /> How to use your API Key
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Use the \`x-api-key\` header in your requests.
                      </p>
                      <div className="relative w-full max-w-full overflow-hidden">
                        <CopyBlock
                          className="whitespace-pre-wrap break-all text-xs"
                          value={`curl -X POST "${apiBaseUrl}/ingestion/url?project_id=${project.id}" \\
  -H "x-api-key: ${freshKey?.api_key || "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}
                        />
                      </div>
                    </div>

                    {/* Active Keys List */}
                    {(keys?.length ?? 0) > 0 && (
                      <div className="space-y-3 pt-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Keys</Label>
                        {(keys ?? []).filter(k => !k.revoked_at).map((key) => (
                          <div key={key.id} className="flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div>
                              <p className="font-medium text-sm">{key.name || "API Key"}</p>
                              <p className="text-xs font-mono text-muted-foreground opacity-70">{key.prefix}...</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 border-none">Active</Badge>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will immediately revoke "{key.name || "API Key"}". Any applications using this key will stop working.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => revokeKey(key.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Revoke Key
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

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
          </TabsContent>
        </Tabs >
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

    <Modal
      isOpen={isBulkDeleteModalOpen}
      onClose={() => setIsBulkDeleteModalOpen(false)}
      title="Delete Selected Sources"
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
                  You are about to delete {selectedSources.length} data sources. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => setIsBulkDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirmBulkDelete}
            disabled={isBulkDeleting}
          >
            {isBulkDeleting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
              </span>
            ) : (
              `Delete ${selectedSources.length} Sources`
            )}
          </Button>
        </div>
      </div>
    </Modal>
      </main >
    </div >
  );
}
