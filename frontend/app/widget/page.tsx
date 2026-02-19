"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Square, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const dynamic = 'force-dynamic';

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
    <span className="inline-flex items-center gap-1 text-muted-foreground">
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

  async function refreshToken(): Promise<string | null> {
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
            window.parent?.postMessage({ type: "chatbot:set_token", token: data.token }, allowedOrigin);
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
  }

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
  }, [token, allowedOrigin]);

  function updateMessage(id: string, updates: Partial<Message>) {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
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
          conversation_id: conversationId
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
              conversation_id: conversationId
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
      style={{
        ["--primary" as any]: primaryColor,
        ["--primary-foreground" as any]: "#ffffff",
      }}
    >
      <div className={headerClasses} style={{ backgroundColor: mode === "popup" ? primaryColor : "transparent" }}>
        <div className="flex items-center gap-3">
          {config?.logo_url ? (
            <img src={config.logo_url} className="h-8 w-8 rounded-full bg-white object-contain border" alt="Bot Logo" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white shadow-inner">
              {config?.title?.[0] || "A"}
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold leading-tight truncate max-w-[150px]">
              {config?.title || "Assistant"}
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">AI Powered</p>
          </div>
        </div>
        {mode === "popup" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-black/10 text-white"
            onClick={() => {
              console.log('[Widget] Close button clicked, allowedOrigin:', allowedOrigin);
              setIsOpen(false);
              if (allowedOrigin) {
                console.log('[Widget] Sending chatbot:close to parent');
                window.parent?.postMessage({ type: "chatbot:close" }, allowedOrigin);
              } else {
                console.warn('[Widget] allowedOrigin is not set, message not sent');
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth",
          mode === "embedded" ? "max-w-4xl mx-auto w-full pb-32" : ""
        )}
        ref={scrollRef}
      >
        {configError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-destructive text-xs font-bold">!</span>
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">Failed to load chatbot</p>
                <p className="text-xs text-destructive/80 mt-1">{configError}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-xs text-destructive underline mt-2 hover:no-underline"
                >
                  Refresh page
                </button>
              </div>
            </div>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-6 animate-in fade-in duration-700 fill-mode-forwards space-y-6">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-foreground text-lg">{config?.welcome_message || "How can I help you today?"}</p>
              <p className="text-sm mt-1">Ask me anything about your project.</p>
            </div>

            {(config?.starter_questions?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2 justify-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300 fill-mode-forwards">
                {config?.starter_questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(q); sendMessage(undefined, q); }}
                    className="text-[11px] px-3 py-1.5 rounded-full border bg-background hover:bg-primary/5 hover:border-primary/50 transition-all shadow-sm text-foreground/80 font-medium active:scale-95 text-left"
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
                "flex flex-col gap-1 max-w-[85%] animate-in slide-in-from-bottom-2 fade-in duration-300",
                msg.role === "user" ? "ml-auto items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted/80 backdrop-blur-sm dark:bg-muted/50 rounded-bl-none border"
                )}
              >
                {msg.status === "pending" ? (
                  <LoadingDots />
                ) : msg.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="whitespace-pre-wrap leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 space-y-1">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 space-y-1">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code className="rounded bg-background/60 px-1 py-0.5 text-[0.85em] font-mono border">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="overflow-x-auto rounded-lg bg-background/50 p-3 text-xs border mt-2">
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

      <div className={cn(
        "p-4 z-10 transition-all duration-300 ease-in-out",
        mode === "embedded"
          ? "sticky bottom-0 bg-background/80 backdrop-blur-md w-full max-w-3xl px-4 mx-auto pb-4"
          : "sticky bottom-0 bg-background/80 backdrop-blur-md"
      )}>
        <form
          onSubmit={sendMessage}
          className={cn(
            "relative flex items-end bg-background rounded-2xl border shadow-lg ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all p-1.5",
            mode === "embedded" ? "shadow-2xl border-muted/40 bg-background/90 backdrop-blur-xl" : ""
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 border-none shadow-none focus:outline-none focus:ring-0 px-4 bg-transparent py-3 text-sm resize-none max-h-[120px] min-h-[44px]"
          />
          <div className="flex items-center gap-1.5 pb-2 px-1.5">
            {messages.some((msg) => msg.status === "pending") ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
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
              className="h-8 w-8 rounded-full shrink-0 transition-all active:scale-95"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </form>
        <div className="text-center mt-2">
          <a href="https://contextly.ai" target="_blank" className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
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
