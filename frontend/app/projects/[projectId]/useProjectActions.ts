import { useCallback, useEffect, useRef } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { apiRequest, API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { ApiKey, IngestionStatusState, Project, Source } from "./types";

type Params = {
  projectId: string;
  project: Project | undefined;
  sources: Source[] | undefined;
  currentPage: number;
  selectedSources: string[];
  sourceToDelete: Source | null;
  newKeyName: string;
  selectedFile: File | null;
  ingestUrl: string;
  newOriginInput: string;
  botTitle: string;
  botColor: string;
  welcomeMessage: string;
  starterQuestions: string;
  systemPrompt: string;
  logoUrl: string;
  embedMode: "popup" | "embedded";
  embedWidth: string;
  embedHeight: string;
  stopStatusStream: (disableReconnect?: boolean) => void;
  setError: Dispatch<SetStateAction<string>>;
  setCreatingKey: Dispatch<SetStateAction<boolean>>;
  setFreshKey: Dispatch<SetStateAction<ApiKey | null>>;
  setNewKeyName: Dispatch<SetStateAction<string>>;
  setUploading: Dispatch<SetStateAction<boolean>>;
  setUploadProgress: Dispatch<SetStateAction<number>>;
  setFileUploadStatus: Dispatch<SetStateAction<IngestionStatusState | null>>;
  setFileUploadError: Dispatch<SetStateAction<string>>;
  setSelectedFile: Dispatch<SetStateAction<File | null>>;
  setFileInputKey: Dispatch<SetStateAction<number>>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setUrlIngesting: Dispatch<SetStateAction<boolean>>;
  setUrlIngestStatus: Dispatch<SetStateAction<IngestionStatusState | null>>;
  setUrlIngestError: Dispatch<SetStateAction<string>>;
  setIngestUrl: Dispatch<SetStateAction<string>>;
  setSelectedSources: Dispatch<SetStateAction<string[]>>;
  setIsBulkDeleting: Dispatch<SetStateAction<boolean>>;
  setIsBulkDeleteModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsDeleteModalOpen: Dispatch<SetStateAction<boolean>>;
  setSourceToDelete: Dispatch<SetStateAction<Source | null>>;
  setDeleteConfirmation: Dispatch<SetStateAction<string>>;
  setDeletingSourceId: Dispatch<SetStateAction<string | null>>;
  setDeletingProject: Dispatch<SetStateAction<boolean>>;
  setOriginError: Dispatch<SetStateAction<string>>;
  setIsUpdatingOrigins: Dispatch<SetStateAction<boolean>>;
  setNewOriginInput: Dispatch<SetStateAction<string>>;
  setIsSavingBranding: Dispatch<SetStateAction<boolean>>;
  setBrandingError: Dispatch<SetStateAction<string>>;
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
};

export function useProjectActions(params: Params) {
  const {
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
  } = params;

  const router = useRouter();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const saveBrandingQuiet = useCallback(async () => {
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
        starter_questions: starterQuestions
          .split("\n")
          .map((q) => q.trim())
          .filter(Boolean),
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
  }, [
    botColor,
    botTitle,
    embedHeight,
    embedMode,
    embedWidth,
    logoUrl,
    project,
    projectId,
    setBrandingError,
    setHasUnsavedChanges,
    setIsSavingBranding,
    starterQuestions,
    systemPrompt,
    welcomeMessage,
  ]);

  const triggerAutoSave = useCallback(() => {
    if (!project) return;
    setHasUnsavedChanges(true);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      void saveBrandingQuiet();
    }, 1500);
  }, [project, saveBrandingQuiet, setHasUnsavedChanges]);

  const createKey = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      setError("");
      const token = getToken();
      if (!token) return;
      try {
        setCreatingKey(true);
        const created = await apiRequest<ApiKey>(`/projects/${projectId}/api-keys`, {
          method: "POST",
          token,
          body: JSON.stringify({ name: newKeyName || "Primary" }),
        });
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
    },
    [newKeyName, projectId, setCreatingKey, setError, setFreshKey, setNewKeyName]
  );

  const revokeKey = useCallback(
    async (keyId: string) => {
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
    },
    [projectId]
  );

  const uploadFile = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
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
        const response = await fetch(`${API_BASE_URL}/ingestion/upload?project_id=${projectId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

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
    },
    [
      projectId,
      selectedFile,
      setCurrentPage,
      setFileInputKey,
      setFileUploadError,
      setFileUploadStatus,
      setSelectedFile,
      setUploading,
      setUploadProgress,
    ]
  );

  const ingestUrlSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
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
    },
    [ingestUrl, projectId, setIngestUrl, setUrlIngestError, setUrlIngestStatus, setUrlIngesting]
  );

  const handleSelectSource = useCallback(
    (sourceId: string) => {
      setSelectedSources((prev) =>
        prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
      );
    },
    [setSelectedSources]
  );

  const handleSelectAll = useCallback(() => {
    if (!sources) return;
    if (selectedSources.length === sources.length) {
      setSelectedSources([]);
    } else {
      setSelectedSources(sources.map((s) => s.id));
    }
  }, [selectedSources.length, setSelectedSources, sources]);

  const confirmBulkDelete = useCallback(async () => {
    if (selectedSources.length === 0) return;
    setIsBulkDeleting(true);
    const token = getToken();
    if (!token) {
      setIsBulkDeleting(false);
      return;
    }

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
  }, [
    projectId,
    selectedSources,
    setCurrentPage,
    setIsBulkDeleteModalOpen,
    setIsBulkDeleting,
    setSelectedSources,
  ]);

  const openDeleteModal = useCallback(
    (source: Source) => {
      setSourceToDelete(source);
      setDeleteConfirmation("");
      setIsDeleteModalOpen(true);
    },
    [setDeleteConfirmation, setIsDeleteModalOpen, setSourceToDelete]
  );

  const confirmDeleteSource = useCallback(async () => {
    if (!sourceToDelete) return;
    const token = getToken();
    if (!token) return;

    setDeletingSourceId(sourceToDelete.id);
    try {
      await apiRequest(`/ingestion/${sourceToDelete.id}?project_id=${projectId}`, {
        method: "DELETE",
        token,
      });
      toast.success("Source deleted successfully");
      setIsDeleteModalOpen(false);
      setSourceToDelete(null);
      const shouldGoToPrevPage =
        currentPage > 1 && (sources?.length ?? 0) - 1 <= (currentPage - 1) * 10;
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
  }, [
    currentPage,
    projectId,
    setCurrentPage,
    setDeletingSourceId,
    setError,
    setIsDeleteModalOpen,
    setSourceToDelete,
    sourceToDelete,
    sources,
  ]);

  const deleteProject = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    stopStatusStream(true);

    setDeletingProject(true);
    try {
      await apiRequest(`/projects/${projectId}`, {
        method: "DELETE",
        token,
      });
      router.push("/projects");
    } catch (err) {
      setError((err as Error).message);
      setDeletingProject(false);
    }
  }, [projectId, router, setDeletingProject, setError, stopStatusStream]);

  const handleAddOrigin = useCallback(
    async (e: FormEvent) => {
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
    },
    [newOriginInput, project, projectId, setIsUpdatingOrigins, setNewOriginInput, setOriginError]
  );

  const handleRemoveOrigin = useCallback(
    async (originToRemove: string) => {
      if (!project) return;
      const token = getToken();
      if (!token) return;

      const updatedList = project.allowed_origins.filter((o) => o !== originToRemove);
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
    },
    [project, projectId, setIsUpdatingOrigins, setOriginError]
  );

  return {
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
  };
}
