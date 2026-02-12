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
    setToken(initialToken);
    setProjectId(initialProject);
    setAllowedOrigin(initialOrigin);

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

  if (!isOpen) return null;

  return (
    <div className="flex h-screen w-full flex-col bg-background p-4 sm:max-w-[400px] border shadow-xl rounded-xl">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-lg font-semibold">Assistant</h1>
          <p className="text-xs text-muted-foreground">Powered by Orizn</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-4">
            <p>Ask a question to get started.</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted"
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
                      <code className="rounded bg-background/60 px-1 py-0.5 text-[0.85em]">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="overflow-x-auto rounded bg-background/60 p-3 text-xs">
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
          ))
        )}
      </div>

      <form onSubmit={sendMessage} className="flex items-center gap-2 pt-4 border-t">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          className="flex-1"
        />
        {messages.some((msg) => msg.status === "pending") ? (
          <Button type="button" size="icon" variant="outline" onClick={stopAll}>
            <Square className="h-4 w-4" />
            <span className="sr-only">Stop</span>
          </Button>
        ) : null}
        <Button type="submit" size="icon" disabled={!input.trim()}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
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
