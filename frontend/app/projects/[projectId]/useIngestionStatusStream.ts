import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { mutate } from "swr";

import { API_BASE_URL } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

import type { IngestionStatusState, IngestionStreamEvent, Source } from "./types";

type UseIngestionStatusStreamParams = {
  projectId: string;
  sources: Source[] | undefined;
  fileUploadStatus: IngestionStatusState | null;
  urlIngestStatus: IngestionStatusState | null;
  setFileUploadStatus: Dispatch<SetStateAction<IngestionStatusState | null>>;
  setUrlIngestStatus: Dispatch<SetStateAction<IngestionStatusState | null>>;
};

export function useIngestionStatusStream({
  projectId,
  sources,
  fileUploadStatus,
  urlIngestStatus,
  setFileUploadStatus,
  setUrlIngestStatus,
}: UseIngestionStatusStreamParams) {
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamReconnectRef = useRef<NodeJS.Timeout | null>(null);
  const streamActiveRef = useRef(false);
  const hasPendingRef = useRef(false);
  const shouldReconnectRef = useRef(true);

  const stopStatusStream = useCallback((disableReconnect = false) => {
    if (disableReconnect) {
      shouldReconnectRef.current = false;
    }
    if (streamReconnectRef.current) {
      clearTimeout(streamReconnectRef.current);
      streamReconnectRef.current = null;
    }
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
    streamActiveRef.current = false;
  }, []);

  const handleStatusStreamEvent = useCallback(
    async (rawEvent: string) => {
      const lines = rawEvent.split("\n");
      let eventType = "message";
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }
      }

      if (eventType !== "ingestion_status") {
        return;
      }

      const data = dataLines.join("\n");
      if (!data) {
        return;
      }

      let payload: IngestionStreamEvent;
      try {
        payload = JSON.parse(data) as IngestionStreamEvent;
      } catch {
        return;
      }

      if (!payload.source_id || !payload.status) {
        return;
      }

      const sourceId = payload.source_id;
      const status = payload.status;
      const hasTerminalState = status === "completed" || status === "failed";
      let foundSource = false;

      await mutate(
        `/projects/${projectId}/sources`,
        (current?: Source[]) => {
          if (!current) {
            return current;
          }
          const next = current.map((source) => {
            if (source.id !== sourceId) {
              return source;
            }
            foundSource = true;
            const nextProgress = payload.progress
              ? {
                  stage: payload.progress.stage ?? source.progress?.stage ?? "processing",
                  percent: payload.progress.percent ?? source.progress?.percent ?? 0,
                  total_chunks:
                    payload.progress.total_chunks ?? source.progress?.total_chunks,
                  processed_chunks:
                    payload.progress.processed_chunks ?? source.progress?.processed_chunks,
                }
              : source.progress;
            return {
              ...source,
              status,
              type: payload.type ?? source.type,
              progress: nextProgress,
              metadata: {
                ...source.metadata,
                ...(payload.filename !== undefined ? { filename: payload.filename } : {}),
                ...(payload.error !== undefined ? { error: payload.error } : {}),
              },
            };
          });
          return next;
        },
        false
      );

      setFileUploadStatus((prev) =>
        prev && prev.sourceId === sourceId ? { ...prev, status } : prev
      );
      setUrlIngestStatus((prev) =>
        prev && prev.sourceId === sourceId ? { ...prev, status } : prev
      );

      if (!foundSource || hasTerminalState) {
        void mutate(`/projects/${projectId}/sources`);
      }
    },
    [projectId, setFileUploadStatus, setUrlIngestStatus]
  );

  const startStatusStream = useCallback(async () => {
    if (!projectId || streamActiveRef.current || streamAbortRef.current) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    if (streamReconnectRef.current) {
      clearTimeout(streamReconnectRef.current);
      streamReconnectRef.current = null;
    }

    shouldReconnectRef.current = true;

    const controller = new AbortController();
    streamAbortRef.current = controller;
    streamActiveRef.current = true;
    let allowReconnect = true;

    try {
      const response = await fetch(
        `${API_BASE_URL}/ingestion/stream?project_id=${projectId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          cache: "no-store",
          signal: controller.signal,
        }
      );

      if (response.status === 401 || response.status === 403) {
        allowReconnect = false;
        clearToken();
        window.location.href = "/auth/login";
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error(`Stream request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
        let splitIndex = buffer.indexOf("\n\n");
        while (splitIndex !== -1) {
          const rawEvent = buffer.slice(0, splitIndex).trim();
          buffer = buffer.slice(splitIndex + 2);
          if (rawEvent) {
            await handleStatusStreamEvent(rawEvent);
          }
          splitIndex = buffer.indexOf("\n\n");
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error("Ingestion status stream disconnected", err);
      }
    } finally {
      streamActiveRef.current = false;
      streamAbortRef.current = null;

      if (
        allowReconnect &&
        shouldReconnectRef.current &&
        hasPendingRef.current &&
        !streamReconnectRef.current
      ) {
        streamReconnectRef.current = setTimeout(() => {
          streamReconnectRef.current = null;
          void startStatusStream();
        }, 2000);
      }
    }
  }, [handleStatusStreamEvent, projectId]);

  useEffect(() => {
    const hasPending =
      sources?.some((s) => ["pending", "processing"].includes(s.status)) ||
      (fileUploadStatus && ["pending", "processing"].includes(fileUploadStatus.status)) ||
      (urlIngestStatus && ["pending", "processing"].includes(urlIngestStatus.status));

    hasPendingRef.current = Boolean(hasPending);

    if (hasPending) {
      void startStatusStream();
      return;
    }

    stopStatusStream();
  }, [sources, fileUploadStatus, urlIngestStatus, startStatusStream, stopStatusStream]);

  useEffect(() => {
    return () => {
      stopStatusStream(true);
    };
  }, [stopStatusStream]);

  return { stopStatusStream };
}
