"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Send, Square, AlertCircle, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    status?: "pending" | "complete" | "error" | "stopped";
};

type ChatConfig = {
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
        return JSON.parse(atob(parts[1]));
    } catch {
        return null;
    }
}

type PageState = "loading" | "ready" | "not-found" | "unavailable" | "error";

interface PublicChatProps {
    slug: string;
}

function PublicChat({ slug }: PublicChatProps) {
    const [pageState, setPageState] = useState<PageState>("loading");
    const [projectId, setProjectId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [config, setConfig] = useState<ChatConfig | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const controllersRef = useRef(new Map<string, AbortController>());
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isRefreshingRef = useRef(false);
    const tokenRef = useRef<string | null>(null);

    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    // --- Fetch public token on mount ---
    const fetchPublicToken = useCallback(async () => {
        setPageState("loading");
        try {
            const res = await fetch(`${API_BASE_URL}/public/chat-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug }),
            });

            if (res.status === 404) {
                setPageState("not-found");
                return;
            }
            if (res.status === 429) {
                setPageState("unavailable");
                setErrorMsg("This chatbot is temporarily unavailable due to high traffic. Please try again later.");
                return;
            }
            if (!res.ok) {
                setPageState("error");
                setErrorMsg("Unable to load chatbot. Please try again.");
                return;
            }

            const data = await res.json();
            setProjectId(data.project_id);
            setToken(data.token);
            setConfig(data.config);
            setPageState("ready");
        } catch {
            setPageState("error");
            setErrorMsg("Network error. Please check your connection.");
        }
    }, [slug]);

    useEffect(() => {
        void fetchPublicToken();
        setIsMobile(window.innerWidth < 640);
        const onResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [fetchPublicToken]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    // --- Auto token refresh ---
    const refreshToken = useCallback(async (): Promise<string | null> => {
        const currentToken = tokenRef.current;
        if (!currentToken || isRefreshingRef.current) return null;
        isRefreshingRef.current = true;
        try {
            const origin = window.location.origin;
            const res = await fetch(`${API_BASE_URL}/tokens/refresh`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                    Origin: origin,
                },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.token) {
                    setToken(data.token);
                    return data.token;
                }
            }
        } catch {
            // silent
        } finally {
            isRefreshingRef.current = false;
        }
        return null;
    }, []);

    useEffect(() => {
        if (!token) return;
        const payload = decodeJwt(token);
        if (!payload?.exp) return;
        const timeUntilRefresh = payload.exp * 1000 - Date.now() - 5 * 60 * 1000;
        if (timeUntilRefresh <= 0) {
            void refreshToken();
            return;
        }
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => void refreshToken(), timeUntilRefresh);
        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        };
    }, [token, refreshToken]);

    function updateMessage(id: string, updates: Partial<Message>) {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    }

    function stopAll() {
        controllersRef.current.forEach((c, id) => {
            c.abort();
            updateMessage(id, { status: "stopped", content: "Stopped." });
        });
        controllersRef.current.clear();
    }

    async function sendMessage(e?: React.FormEvent, override?: string) {
        e?.preventDefault();
        const question = (override || input).trim();
        if (!token || !projectId || !question) return;

        const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: question, status: "complete" };
        const assistantId = crypto.randomUUID();
        const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", status: "pending" };
        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setInput("");

        const controller = new AbortController();
        controllersRef.current.set(assistantId, controller);

        const doFetch = async (t: string) => {
            const origin = window.location.origin;
            return fetch(`${API_BASE_URL}/projects/${projectId}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${t}`,
                    Origin: origin,
                },
                body: JSON.stringify({ query: question, conversation_id: conversationId }),
                signal: controller.signal,
            });
        };

        try {
            let res = await doFetch(token);

            // Token expired mid-session — auto-refresh and retry once
            if (res.status === 401) {
                updateMessage(assistantId, { status: "pending", content: "Refreshing session…" });
                const newToken = await refreshToken();
                if (newToken) {
                    res = await doFetch(newToken);
                } else {
                    // Re-fetch public token entirely as fallback
                    await fetchPublicToken();
                    updateMessage(assistantId, { status: "error", content: "Session expired. Please send your message again." });
                    return;
                }
            }

            if (!res.ok) {
                updateMessage(assistantId, { status: "error", content: "Sorry, I couldn't respond. Please try again." });
                return;
            }

            const data = await res.json();
            updateMessage(assistantId, { status: "complete", content: data.response || "" });
            if (data.conversation_id) setConversationId(data.conversation_id);
        } catch (err) {
            if (controller.signal.aborted) {
                updateMessage(assistantId, { status: "stopped", content: "Stopped." });
                return;
            }
            updateMessage(assistantId, { status: "error", content: "Sorry, I encountered an error. Please try again." });
        } finally {
            controllersRef.current.delete(assistantId);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void sendMessage();
        }
    }

    const primaryColor = config?.primary_color || "#4f46e5";

    // --- Error / loading states ---
    if (pageState === "loading") {
        return (
            <div className="flex h-[100dvh] w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <LoadingDots />
                    <p className="text-sm text-muted-foreground">Loading chatbot…</p>
                </div>
            </div>
        );
    }

    if (pageState === "not-found") {
        return (
            <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <AlertCircle className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold">Chatbot not found</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        This chatbot doesn&apos;t exist or has been removed.
                    </p>
                </div>
            </div>
        );
    }

    if (pageState === "unavailable" || pageState === "error") {
        return (
            <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <AlertCircle className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold">Chatbot unavailable</h1>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">{errorMsg}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void fetchPublicToken()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Try again
                </Button>
            </div>
        );
    }

    // --- Chat UI (identical to embedded widget) ---
    return (
        <div
            className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground font-sans"
            style={{ "--primary": primaryColor, "--primary-foreground": "#ffffff" } as React.CSSProperties}
        >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-md shadow-sm">
                {config?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.logo_url} className="h-8 w-8 rounded-full border bg-white object-contain" alt="Logo" />
                ) : (
                    <div
                        className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-white shadow-inner"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {config?.title?.[0] || "A"}
                    </div>
                )}
                <div>
                    <h1 className="max-w-[200px] truncate text-sm font-bold leading-tight">{config?.title || "Assistant"}</h1>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">AI Powered</p>
                </div>
            </div>

            {/* Messages */}
            <div
                className="mx-auto flex-1 w-full max-w-4xl space-y-6 overflow-y-auto scroll-smooth px-4 py-6 pb-32"
                ref={scrollRef}
            >
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center space-y-6 p-6 text-center text-muted-foreground animate-in fade-in duration-700">
                        <div className="flex flex-col items-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                                <Send className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-lg font-medium text-foreground">
                                {config?.welcome_message || "How can I help you today?"}
                            </p>
                            <p className="mt-1 text-sm">Ask me anything.</p>
                        </div>
                        {(config?.starter_questions?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 delay-300 duration-700 fill-mode-forwards">
                                {config?.starter_questions.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setInput(q); void sendMessage(undefined, q); }}
                                        className="rounded-full border bg-background px-3 py-1.5 text-left text-[11px] font-medium text-foreground/80 shadow-sm transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-95"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex max-w-[85%] animate-in slide-in-from-bottom-2 fade-in flex-col gap-1 duration-300",
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
                                            p: ({ children }) => <p className="leading-relaxed whitespace-pre-wrap">{children}</p>,
                                            ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
                                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                            code: ({ children }) => (
                                                <code className="rounded border bg-background/60 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
                                            ),
                                            pre: ({ children }) => (
                                                <pre className="mt-2 overflow-x-auto rounded-lg border bg-background/50 p-3 text-xs">{children}</pre>
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

            {/* Input */}
            <div className="sticky bottom-0 z-10 bg-background/80 px-4 pb-4 backdrop-blur-md mx-auto w-full max-w-3xl">
                <form
                    onSubmit={(e) => void sendMessage(e)}
                    className="relative flex items-end rounded-2xl border bg-background/90 p-1.5 shadow-2xl ring-offset-background transition-all focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 border-muted/40 backdrop-blur-xl"
                >
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message…"
                        rows={1}
                        className="max-h-[120px] min-h-[44px] flex-1 resize-none border-none bg-transparent px-4 py-3 text-sm shadow-none focus:outline-none focus:ring-0"
                    />
                    <div className="flex items-center gap-1.5 px-1.5 pb-2">
                        {messages.some((m) => m.status === "pending") && (
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
                        )}
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
                        href="https://contextly.live"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                    >
                        Powered by Contextly
                    </a>
                </div>
            </div>
        </div>
    );
}

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function PublicChatPage({ params }: Props) {
    const { slug } = await params;
    return <PublicChat slug={slug} />;
}
