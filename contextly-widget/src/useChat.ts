import { useState, useRef, useEffect, useCallback } from "react";
import { Message, ChatConfig, ChatState } from "./types";

export function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useChat({
  projectId,
  token,
  apiBaseUrl = "https://api.pranavbuilds.tech/api/v1", // Default production URL per spec
  onReady,
  onError,
}: ChatConfig): ChatState {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(() => generateUUID());

  useEffect(() => {
    setConversationId(generateUUID());
  }, [projectId]);
  const controllersRef = useRef(new Map<string, AbortController>());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllersRef.current.forEach((controller) => controller.abort());
      controllersRef.current.clear();
    };
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  const stop = useCallback(() => {
    controllersRef.current.forEach((controller, id) => {
      controller.abort();
      updateMessage(id, {
        status: "stopped",
        content: "Stopped.",
      });
    });
    controllersRef.current.clear();
  }, [updateMessage]);

  const sendMessage = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!token || !projectId || !input.trim()) return;

      const question = input.trim();
      const userMessage: Message = {
        id: generateUUID(),
        role: "user",
        content: question,
        status: "complete",
      };

      const assistantId = generateUUID();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        status: "pending",
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput("");

      const controller = new AbortController();
      controllersRef.current.set(assistantId, controller);

      try {
        const response = await fetch(`${apiBaseUrl}/projects/${projectId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: question,
            conversation_id: conversationId,
            stream: false,
          }),
          signal: controller.signal,
        });

        if (response.status === 401) {
          updateMessage(assistantId, {
            status: "error",
            content: "Session expired. Please refresh the page.",
          });
          onError?.(new Error("Unauthorized"));
          return;
        }

        if (response.status === 403) {
          updateMessage(assistantId, {
            status: "error",
            content: "Access denied. Please check your allowed origins in the project settings.",
          });
          onError?.(new Error("Forbidden"));
          return;
        }

        if (!response.ok) {
          updateMessage(assistantId, {
            status: "error",
            content: "Sorry, I couldn't respond. Please try again.",
          });
          onError?.(new Error(`API Error: ${response.statusText}`));
          return;
        }

        const data = await response.json();
        updateMessage(assistantId, {
          status: "complete",
          content: data.response || "",
          citations: data.citations || [],
        });
      } catch (error) {
        if (controller.signal.aborted) {
          updateMessage(assistantId, {
            status: "stopped",
            content: "Stopped.",
          });
          return;
        }
        console.error("Failed to send message", error);
        updateMessage(assistantId, {
          status: "error",
          content: "Sorry, I encountered an error. Please try again.",
        });
        onError?.(error instanceof Error ? error : new Error("Unknown error"));
      } finally {
        controllersRef.current.delete(assistantId);
      }
    },
    [input, projectId, token, apiBaseUrl, updateMessage, onError, conversationId]
  );
  
  // Expose loading state derived from messages
  const isLoading = messages.some((m) => m.status === "pending");

  return {
    messages,
    isLoading,
    input,
    setInput,
    sendMessage,
    stop,
    updateMessage,
  };
}
