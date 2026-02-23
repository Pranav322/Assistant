"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import useSWR from "swr";
import { useParams, useSearchParams } from "next/navigation";
import { apiRequest, API_BASE_URL, fetcher } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavbar } from "@/components/NavbarContext";
import { DeleteSourcesModals } from "./DeleteSourcesModals";
import { useIngestionStatusStream } from "./useIngestionStatusStream";
import { useProjectActions } from "./useProjectActions";
import { normalizeOrigin } from "./utils";
import { CustomizeTab } from "./tabs/CustomizeTab";
import { EmbedTab } from "./tabs/EmbedTab";
import { KnowledgeBaseTab } from "./tabs/KnowledgeBaseTab";
import { SettingsTab } from "./tabs/SettingsTab";
import type { ApiKey, IngestionStatusState, Project, Source } from "./types";

export default function ProjectDetailPage() {
  const { setTitle, setBackHref, setProjectName } = useNavbar();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.projectId as string;

  const { data: project } = useSWR<Project>(projectId ? `/projects/${projectId}` : null, fetcher);
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
  const [fileUploadStatus, setFileUploadStatus] = useState<IngestionStatusState | null>(null);
  const [fileUploadError, setFileUploadError] = useState("");

  // URL Ingestion State
  const [ingestUrl, setIngestUrl] = useState("");
  const [urlIngesting, setUrlIngesting] = useState(false);
  const [urlIngestStatus, setUrlIngestStatus] = useState<IngestionStatusState | null>(null);
  const [urlIngestError, setUrlIngestError] = useState("");

  // Bulk Operations
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

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

  const hasRedirectedToTryIt = useRef(false);
  const prevCompletedCount = useRef<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  const { stopStatusStream } = useIngestionStatusStream({
    projectId,
    sources,
    fileUploadStatus,
    urlIngestStatus,
    setFileUploadStatus,
    setUrlIngestStatus,
  });

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
    const titleFromUrl = searchParams.get("title");
    const tabFromUrl = searchParams.get("tab");
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
      setSystemPrompt(
        s.system_prompt || "You are a helpful assistant. Use the provided documents to answer."
      );
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
      const data = await apiRequest<{ token: string; expires_in: number }>("/tokens/widget/user", {
        method: "POST",
        token,
        body: JSON.stringify({
          origin: originValue,
          project_id: projectId,
        }),
      });
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
  }, [project, tokenLoading, tokenError, generateWidgetToken, widgetToken]);

  // Auto-redirect to "Embed" after first successful ingestion
  useEffect(() => {
    if (hasRedirectedToTryIt.current) return;
    const completedCount = sources?.filter((s) => s.status === "completed").length ?? 0;
    if (
      prevCompletedCount.current !== null &&
      completedCount > prevCompletedCount.current &&
      completedCount >= 1
    ) {
      hasRedirectedToTryIt.current = true;
      setActiveTab("embed");
    }
    prevCompletedCount.current = completedCount;
  }, [sources]);

  const {
    triggerAutoSave,
    createKey,
    revokeKey,
    uploadFile,
    ingestUrlSubmit,
    handleSelectSource,
    handleSelectAll,
    confirmBulkDelete,
    openDeleteModal,
    confirmDeleteSource,
    deleteProject,
    handleAddOrigin,
    handleRemoveOrigin,
  } = useProjectActions({
    projectId,
    project,
    sources,
    currentPage,
    selectedSources,
    sourceToDelete,
    newKeyName,
    selectedFile,
    ingestUrl,
    newOriginInput,
    botTitle,
    botColor,
    welcomeMessage,
    starterQuestions,
    systemPrompt,
    logoUrl,
    embedMode,
    embedWidth,
    embedHeight,
    stopStatusStream,
    setError,
    setCreatingKey,
    setFreshKey,
    setNewKeyName,
    setUploading,
    setUploadProgress,
    setFileUploadStatus,
    setFileUploadError,
    setSelectedFile,
    setFileInputKey,
    setCurrentPage,
    setUrlIngesting,
    setUrlIngestStatus,
    setUrlIngestError,
    setIngestUrl,
    setSelectedSources,
    setIsBulkDeleting,
    setIsBulkDeleteModalOpen,
    setIsDeleteModalOpen,
    setSourceToDelete,
    setDeleteConfirmation,
    setDeletingSourceId,
    setDeletingProject,
    setOriginError,
    setIsUpdatingOrigins,
    setNewOriginInput,
    setIsSavingBranding,
    setBrandingError,
    setHasUnsavedChanges,
  });

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-[1400px] space-y-6 px-6 py-10 sm:px-8 lg:px-12">
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
  const paginatedSources = (sources ?? []).slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const originToUse = originValue;
  const embedSnippet = `<script
  src="${widgetBaseUrl}/embed.js"
  data-token="<WIDGET_TOKEN>"
  data-origin="${originToUse}"
  data-project-id="${project.id}"
  data-api-base-url="${apiBaseUrl}"
  data-mode="${embedMode}"${
    embedWidth && /^\d+(px|%|vh|vw|rem|em)$/.test(embedWidth)
      ? `\n  data-width="${embedWidth}"`
      : ""
  }${
    embedHeight && /^\d+(px|%|vh|vw|rem|em)$/.test(embedHeight)
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
    <div className="bg-muted/30 min-h-screen w-full max-w-[100vw] overflow-x-hidden pb-20">
      <main className="relative mx-auto w-full max-w-[1400px] overflow-hidden px-4 py-8 sm:px-8 lg:px-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="relative -mx-4 w-full overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            <TabsList className="bg-muted/50 inline-flex h-auto w-auto justify-start rounded-lg p-1">
              <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
              <TabsTrigger value="customize">Customize</TabsTrigger>
              <TabsTrigger value="embed">Embed</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            {/* Mobile scroll indicator */}
            <div className="from-background pointer-events-none absolute top-0 right-0 bottom-2 w-8 bg-gradient-to-l to-transparent sm:hidden" />
          </div>

          <KnowledgeBaseTab
            uploading={uploading}
            fileInputKey={fileInputKey}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            uploadFile={() => void uploadFile()}
            uploadProgress={uploadProgress}
            fileUploadError={fileUploadError}
            urlIngesting={urlIngesting}
            ingestUrl={ingestUrl}
            setIngestUrl={setIngestUrl}
            ingestUrlSubmit={() => void ingestUrlSubmit()}
            urlIngestError={urlIngestError}
            isNewProject={isNewProject}
            sources={sources}
            tokenLoading={tokenLoading}
            tokenError={tokenError}
            widgetToken={widgetToken}
            previewSnippet={previewSnippet}
            selectedSources={selectedSources}
            openBulkDeleteModal={() => setIsBulkDeleteModalOpen(true)}
            handleSelectAll={handleSelectAll}
            paginatedSources={paginatedSources}
            handleSelectSource={handleSelectSource}
            openDeleteModal={openDeleteModal}
            deletingSourceId={deletingSourceId}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />

          <EmbedTab projectId={project.id} embedSnippet={embedSnippet} />

          <CustomizeTab
            hasUnsavedChanges={hasUnsavedChanges}
            isSavingBranding={isSavingBranding}
            embedMode={embedMode}
            setEmbedMode={setEmbedMode}
            triggerAutoSave={triggerAutoSave}
            botTitle={botTitle}
            setBotTitle={setBotTitle}
            botColor={botColor}
            setBotColor={setBotColor}
            welcomeMessage={welcomeMessage}
            setWelcomeMessage={setWelcomeMessage}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            starterQuestions={starterQuestions}
            setStarterQuestions={setStarterQuestions}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            brandingError={brandingError}
            tokenLoading={tokenLoading}
            tokenError={tokenError}
            widgetToken={widgetToken}
            previewSnippet={previewSnippet}
          />

          <SettingsTab
            usage={usage}
            tokenError={tokenError}
            widgetToken={widgetToken}
            tokenExpiresIn={tokenExpiresIn}
            tokenLoading={tokenLoading}
            generateWidgetToken={() => void generateWidgetToken()}
            newOriginInput={newOriginInput}
            setNewOriginInput={setNewOriginInput}
            handleAddOrigin={handleAddOrigin}
            isUpdatingOrigins={isUpdatingOrigins}
            originError={originError}
            project={project}
            handleRemoveOrigin={handleRemoveOrigin}
            createKey={createKey}
            newKeyName={newKeyName}
            setNewKeyName={setNewKeyName}
            creatingKey={creatingKey}
            error={error}
            freshKey={freshKey}
            apiBaseUrl={apiBaseUrl}
            keys={keys}
            revokeKey={revokeKey}
            deleteProject={() => void deleteProject()}
            deletingProject={deletingProject}
          />
        </Tabs>
        <DeleteSourcesModals
          isDeleteModalOpen={isDeleteModalOpen}
          onCloseDeleteModal={() => setIsDeleteModalOpen(false)}
          sourceToDelete={sourceToDelete}
          deleteConfirmation={deleteConfirmation}
          setDeleteConfirmation={setDeleteConfirmation}
          confirmDeleteSource={() => void confirmDeleteSource()}
          deletingSourceId={deletingSourceId}
          isBulkDeleteModalOpen={isBulkDeleteModalOpen}
          onCloseBulkDeleteModal={() => setIsBulkDeleteModalOpen(false)}
          selectedSourcesCount={selectedSources.length}
          isBulkDeleting={isBulkDeleting}
          confirmBulkDelete={() => void confirmBulkDelete()}
        />
      </main>
    </div>
  );
}
