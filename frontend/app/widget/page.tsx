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

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
    </span>
  );
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const controllersRef = useRef(new Map<string, AbortController>());

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
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [allowedOrigin]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!token || !projectId || !input.trim()) return;
    const question = input.trim();
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
        body: JSON.stringify({ query: question }),
        signal: controller.signal,
      });

      if (response.status === 401) {
        if (allowedOrigin) {
          window.parent?.postMessage({ type: "chatbot:token_expired" }, allowedOrigin);
        }
        updateMessage(assistantId, {
          status: "error",
          content: "Session expired. Refreshing token...",
        });
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

  if (!isOpen && mode === "popup") return null;

  // Aesthetic Styles
  const containerClasses = cn(
    "flex w-full flex-col bg-background text-foreground overflow-hidden font-sans",
    mode === "popup"
      ? "h-[100dvh] sm:h-[600px] sm:max-w-[400px] border shadow-2xl rounded-2xl "
      : "h-[100dvh] w-full"
  );

  const headerClasses = cn(
    "flex items-center justify-between border-b px-4 py-3 backdrop-blur-md bg-background/80 sticky top-0 z-10",
    mode === "embedded" ? "border-none bg-transparent" : ""
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
    <div className={containerClasses}>
      <div className={headerClasses}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.636-1.636L13.5 18.75l.97-.243a2.25 2.25 0 001.636-1.636l.394-1.183.394 1.183a2.25 2.25 0 001.636 1.636l.97.243-.97.243a2.25 2.25 0 00-1.636 1.636z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Assistant</h1>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">AI Powered</p>
          </div>
        </div>
        {mode === "popup" && (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => setIsOpen(false)}>
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
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-6 opacity-0 animate-in fade-in duration-500 fill-mode-forwards">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Send className="h-6 w-6 text-foreground/50" />
            </div>
            <p className="font-medium text-foreground">How can I help you today?</p>
            <p className="text-sm mt-1">Ask me anything about your project.</p>
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
