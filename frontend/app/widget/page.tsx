"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Square, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "pending" | "complete" | "error" | "stopped";
};

type ProjectConfig = {
  id: string;
  title: string;
  primary_color: string;
  welcome_message: string;
  starter_questions: string[];
  logo_url: string | null;
};

function LoadingDots() {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
    </span>
  );
}

function decodeJwt(token: string): { exp: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

function WidgetContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"popup" | "embedded">("popup");
  const [token, setToken] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [allowedOrigin, setAllowedOrigin] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const controllersRef = useRef(new Map<string, AbortController>());
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    const initialToken = searchParams.get("token");
    const initialProject = searchParams.get("projectId");
    const initialOrigin = searchParams.get("origin");
    const initialMode = searchParams.get("mode") as "popup" | "embedded";
    setToken(initialToken);
    setProjectId(initialProject);
    setAllowedOrigin(initialOrigin);
    if (initialMode) setMode(initialMode);

    if (initialOrigin) {
      window.parent?.postMessage({ type: "chatbot:ready" }, initialOrigin);
    }
  }, [searchParams]);

  useEffect(() => {
    const isClientMobile = window.innerWidth < 640;
    setIsMobile(isClientMobile);

    // Auto-fetch config when projectId is available
    async function fetchConfig() {
      if (!projectId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/projects/${projectId}/config`);
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
          setConfigError(null);
        } else {
          const errorData = await res.json().catch(() => ({}));
          setConfigError(errorData.detail || `Failed to load chatbot config (${res.status})`);
        }
      } catch (e) {
        console.error("Config fetch failed", e);
        setConfigError("Network error. Please check your connection.");
      }
    }
    fetchConfig();
  }, [projectId, allowedOrigin]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (allowedOrigin && event.origin !== allowedOrigin) {
        return;
      }
      const data = event.data || {};
      if (data.type === "chatbot:init") {
        if (data.token) setToken(data.token);
        if (data.projectId) setProjectId(data.projectId);
        if (data.origin) setAllowedOrigin(data.origin);
      }
      if (data.type === "chatbot:set_token") {
        setToken(data.token);
      }
      if (data.type === "chatbot:toggle") {
        setIsOpen((prev) => !prev);
      }
      if (data.type === "chatbot:close") {
        setIsOpen(false);
      }
      if (data.type === "chatbot:open") {
        setIsOpen(true);
      }
    }
    window.addEventListener("message", onMessage);

    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("resize", handleResize);
    };
  }, [allowedOrigin]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!token || isRefreshingRef.current) return null;
    isRefreshingRef.current = true;
    try {
      const response = await fetch(`${API_BASE_URL}/tokens/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          setToken(data.token);
          if (allowedOrigin) {
            window.parent?.postMessage(
              { type: "chatbot:set_token", token: data.token },
              allowedOrigin
            );
          }
          return data.token;
        }
      }
    } catch (error) {
      console.error("Token refresh failed", error);
    } finally {
      isRefreshingRef.current = false;
    }
    return null;
  }, [token, allowedOrigin]);

  useEffect(() => {
    if (!token || !allowedOrigin) return;
    const payload = decodeJwt(token);
    if (!payload?.exp) return;
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshBefore = 5 * 60 * 1000;
    const timeUntilRefresh = timeUntilExpiry - refreshBefore;
    if (timeUntilRefresh <= 0) {
      refreshToken();
      return;
    }
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => {
      refreshToken();
    }, timeUntilRefresh);
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [token, allowedOrigin, refreshToken]);

  function updateMessage(id: string, updates: Partial<Message>) {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)));
  }

  function stopAll() {
    controllersRef.current.forEach((controller, id) => {
      controller.abort();
      updateMessage(id, {
        status: "stopped",
        content: "Stopped.",
      });
    });
    controllersRef.current.clear();
  }

  async function sendMessage(e?: React.FormEvent, overrideQuestion?: string) {
    e?.preventDefault();
    const question = (overrideQuestion || input).trim();
    if (!token || !projectId || !question) return;
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      status: "complete",
    };
    const assistantId = crypto.randomUUID();
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
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: question,
          conversation_id: conversationId,
        }),
        signal: controller.signal,
      });

      if (response.status === 401) {
        updateMessage(assistantId, {
          status: "pending",
          content: "Session expired. Refreshing...",
        });
        const newToken = await refreshToken();
        if (newToken) {
          const retryResponse = await fetch(`${API_BASE_URL}/projects/${projectId}/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${newToken}`,
            },
            body: JSON.stringify({
              query: question,
              conversation_id: conversationId,
            }),
            signal: controller.signal,
          });
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            updateMessage(assistantId, {
              status: "complete",
              content: data.response || "",
            });
            if (allowedOrigin) {
              window.parent?.postMessage({ type: "chatbot:resize" }, allowedOrigin);
            }
            return;
          }
        }
        updateMessage(assistantId, {
          status: "error",
          content: "Session expired. Please refresh the page.",
        });
        if (allowedOrigin) {
          window.parent?.postMessage({ type: "chatbot:token_expired" }, allowedOrigin);
        }
        return;
      }
      if (response.status === 403) {
        updateMessage(assistantId, {
          status: "error",
          content: "Access denied. Please check your allowed origins in the project settings.",
        });
        return;
      }
      if (!response.ok) {
        updateMessage(assistantId, {
          status: "error",
          content: "Sorry, I couldn't respond. Please try again.",
        });
        return;
      }
      const data = await response.json();
      updateMessage(assistantId, {
        status: "complete",
        content: data.response || "",
      });
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
      if (allowedOrigin) {
        window.parent?.postMessage({ type: "chatbot:resize" }, allowedOrigin);
      }
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
    } finally {
      controllersRef.current.delete(assistantId);
    }
  }

  const showContent = isOpen || mode !== "popup";

  // Aesthetic Styles
  const primaryColor = config?.primary_color || "#4f46e5";
  const containerClasses = cn(
    "flex w-full flex-col bg-background text-foreground overflow-hidden font-sans",
    mode === "popup"
      ? cn(
          "fixed z-50 overflow-hidden flex flex-col bg-background border shadow-2xl transition-all duration-300",
          isMobile
            ? "inset-0 h-[100dvh] w-full rounded-none"
            : "bottom-4 right-4 h-[600px] w-full max-w-[400px] rounded-2xl"
        )
      : "h-[100dvh] w-full"
  );

  const headerClasses = cn(
    "flex items-center justify-between border-b px-4 py-3 backdrop-blur-md sticky top-0 z-10 shadow-sm transition-colors",
    mode === "embedded" ? "border-none bg-transparent text-foreground" : "text-white"
  );
  // Auto-resize textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div
      className={cn(containerClasses, !showContent && "hidden")}
      aria-hidden={!showContent}
      style={
        {
          "--primary": primaryColor,
          "--primary-foreground": "#ffffff",
        } as React.CSSProperties
      }
    >
      <div
        className={headerClasses}
        style={{ backgroundColor: mode === "popup" ? primaryColor : "transparent" }}
      >
        <div className="flex items-center gap-3">
          {config?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.logo_url}
              className="h-8 w-8 rounded-full border bg-white object-contain"
              alt="Bot Logo"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 font-bold text-white shadow-inner">
              {config?.title?.[0] || "A"}
            </div>
          )}
          <div>
            <h1 className="max-w-[150px] truncate text-sm leading-tight font-bold">
              {config?.title || "Assistant"}
            </h1>
            <p className="text-[10px] font-medium tracking-wider text-white/70 uppercase">
              AI Powered
            </p>
          </div>
        </div>
        {mode === "popup" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-white hover:bg-black/10"
            onClick={() => {
              console.log("[Widget] Close button clicked, allowedOrigin:", allowedOrigin);
              setIsOpen(false);
              if (allowedOrigin) {
                window.parent?.postMessage({ type: "chatbot:close" }, allowedOrigin);
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div
        className={cn(
          "flex-1 space-y-6 overflow-y-auto scroll-smooth px-4 py-6",
          mode === "embedded" ? "mx-auto w-full max-w-4xl pb-32" : ""
        )}
        ref={scrollRef}
      >
        {configError && (
          <div className="border-destructive/20 bg-destructive/5 animate-in fade-in slide-in-from-top-2 mb-4 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <div className="bg-destructive/10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                <span className="text-destructive text-xs font-bold">!</span>
              </div>
              <div>
                <p className="text-destructive text-sm font-medium">Failed to load chatbot</p>
                <p className="text-destructive/80 mt-1 text-xs">{configError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-destructive mt-2 text-xs underline hover:no-underline"
                >
                  Refresh page
                </button>
              </div>
            </div>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="text-muted-foreground animate-in fade-in fill-mode-forwards flex h-full flex-col items-center justify-center space-y-6 p-6 text-center duration-700">
            <div className="flex flex-col items-center">
              <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
                <Send className="text-primary h-6 w-6" />
              </div>
              <p className="text-foreground text-lg font-medium">
                {config?.welcome_message || "How can I help you today?"}
              </p>
              <p className="mt-1 text-sm">Ask me anything about your project.</p>
            </div>

            {(config?.starter_questions?.length ?? 0) > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-forwards flex flex-wrap justify-center gap-2 delay-300 duration-700">
                {config?.starter_questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                      sendMessage(undefined, q);
                    }}
                    className="bg-background hover:bg-primary/5 hover:border-primary/50 text-foreground/80 rounded-full border px-3 py-1.5 text-left text-[11px] font-medium shadow-sm transition-all active:scale-95"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "animate-in slide-in-from-bottom-2 fade-in flex max-w-[85%] flex-col gap-1 duration-300",
                msg.role === "user" ? "ml-auto items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted/80 dark:bg-muted/50 rounded-bl-none border backdrop-blur-sm"
                )}
              >
                {msg.status === "pending" ? (
                  <LoadingDots />
                ) : msg.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="leading-relaxed whitespace-pre-wrap">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc space-y-1 pl-5">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal space-y-1 pl-5">{children}</ol>
                      ),
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code className="bg-background/60 rounded border px-1 py-0.5 font-mono text-[0.85em]">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-background/50 mt-2 overflow-x-auto rounded-lg border p-3 text-xs">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div
        className={cn(
          "z-10 p-4 transition-all duration-300 ease-in-out",
          mode === "embedded"
            ? "bg-background/80 sticky bottom-0 mx-auto w-full max-w-3xl px-4 pb-4 backdrop-blur-md"
            : "bg-background/80 sticky bottom-0 backdrop-blur-md"
        )}
      >
        <form
          onSubmit={sendMessage}
          className={cn(
            "bg-background ring-offset-background focus-within:ring-ring relative flex items-end rounded-2xl border p-1.5 shadow-lg transition-all focus-within:ring-2 focus-within:ring-offset-2",
            mode === "embedded"
              ? "border-muted/40 bg-background/90 shadow-2xl backdrop-blur-xl"
              : ""
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="max-h-[120px] min-h-[44px] flex-1 resize-none border-none bg-transparent px-4 py-3 text-sm shadow-none focus:ring-0 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 px-1.5 pb-2">
            {messages.some((msg) => msg.status === "pending") ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="hover:bg-destructive/10 hover:text-destructive h-8 w-8 rounded-full"
                onClick={stopAll}
              >
                <Square className="h-4 w-4 fill-current" />
                <span className="sr-only">Stop</span>
              </Button>
            ) : null}
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="h-8 w-8 shrink-0 rounded-full transition-all active:scale-95"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </form>
        <div className="mt-2 text-center">
          <a
            href="https://contextly.ai"
            target="_blank"
            className="text-muted-foreground/60 hover:text-muted-foreground text-[10px] transition-colors"
          >
            Powered by Contextly AI
          </a>
        </div>
      </div>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WidgetContent />
    </Suspense>
  );
}
