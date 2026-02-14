import React, { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Square } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useChat, generateUUID } from "../useChat";
import { Message } from "../types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatProps {
  projectId?: string;
  token?: string;
  apiBaseUrl?: string;
  className?: string;
  title?: string;
  onClose?: () => void;
  origin?: string;
}

export function Chat({
  projectId: initialProjectId,
  token: initialToken,
  apiBaseUrl,
  className,
  title = "Assistant",
  onClose,
  origin: initialOrigin,
}: ChatProps) {
  const [projectId, setProjectId] = React.useState(initialProjectId);
  const [token, setToken] = React.useState(initialToken);
  const [origin, setOrigin] = React.useState(initialOrigin);

  // Sync state when props change
  React.useEffect(() => {
    if (initialProjectId) setProjectId(initialProjectId);
  }, [initialProjectId]);

  React.useEffect(() => {
    if (initialToken) setToken(initialToken);
  }, [initialToken]);

  React.useEffect(() => {
    if (initialOrigin) setOrigin(initialOrigin);
  }, [initialOrigin]);

  // Initialize from URL params if props are missing
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (!projectId) setProjectId(params.get("project_id") || undefined);
      if (!token) setToken(params.get("token") || undefined);
      if (!origin) setOrigin(params.get("origin") || undefined);
    }
  }, []);

  // Protocol Implementation
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!origin) {
      console.warn(
        "[ChatWidget] Missing 'origin' parameter. Widget communication disabled."
      );
      return;
    }

    // 1. Origin Validation
    try {
      if (window.parent !== window) {
        // Soft check on referrer
        if (document.referrer && !document.referrer.startsWith(origin)) {
          console.warn(`[ChatWidget] Referrer mismatch: expected ${origin}, got ${document.referrer}`);
        }
      }
    } catch (e) {
      // Access to parent/referrer might be blocked
    }

    // 2. Message Listener
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;

      try {
        const { type, payload } = event.data;
        switch (type) {
          case "chatbot:init":
            if (payload.token) setToken(payload.token);
            if (payload.projectId) setProjectId(payload.projectId);
            break;
          case "chatbot:set_token":
            if (payload.token) setToken(payload.token);
            break;
        }
      } catch (err) {
        console.error("[ChatWidget] Error handling message:", err);
      }
    };

    window.addEventListener("message", handleMessage);

    // 3. Send Ready
    window.parent.postMessage(
      {
        type: "chatbot:ready",
        payload: {},
        requestId: generateUUID(),
        timestamp: new Date().toISOString(),
      },
      origin
    );

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [origin]);

  const { messages, input, setInput, sendMessage, isLoading, stop } = useChat({
    projectId: projectId || "",
    token: token || "",
    apiBaseUrl,
    onError: (err) => {
      // Handle token expiration specifically
      if (err.message === "Unauthorized" && origin) {
        window.parent.postMessage(
          {
            type: "chatbot:token_expired",
            payload: {},
            requestId: generateUUID(),
            timestamp: new Date().toISOString(),
          },
          origin
        );
      }
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resize observer to send height updates
  useEffect(() => {
    if (!origin || !containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        window.parent.postMessage(
          {
            type: "chatbot:resize",
            payload: { height },
            requestId: generateUUID(),
            timestamp: new Date().toISOString(),
          },
          origin
        );
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [origin, messages, input]); // Re-measure on content changes

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isLoading) return;
      sendMessage();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col w-full h-[600px] max-w-[400px] border shadow-xl rounded-xl bg-white text-gray-900 overflow-hidden font-sans",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-gray-50/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.636-1.636L13.5 18.75l.97-.243a2.25 2.25 0 001.636-1.636l.394-1.183.394 1.183a2.25 2.25 0 001.636 1.636l.97.243-.97.243a2.25 2.25 0 00-1.636 1.636z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">{title}</h1>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
              AI Powered
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6 bg-white"
        ref={scrollRef}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-400 p-6">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Send className="h-6 w-6 text-gray-400" />
            </div>
            <p className="font-medium text-gray-600">How can I help you?</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1 max-w-[85%]",
                msg.role === "user" ? "ml-auto items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200"
                )}
              >
                {msg.status === "pending" ? (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
                  </span>
                ) : msg.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm prose-indigo max-w-none dark:prose-invert break-words"
                    components={{
                       pre: ({ node, ...props }) => (
                        <div className="overflow-auto w-full my-2 bg-black/10 p-2 rounded-lg">
                          <pre {...props} />
                        </div>
                      ),
                      code: ({ node, ...props }) => (
                        <code className="bg-black/10 rounded px-1" {...props} />
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-200/50">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                      Sources
                    </p>
                    <ul className="space-y-1">
                      {msg.citations.map((citation, i) => {
                        const isUrl = /^https?:\/\//i.test(citation);
                        return (
                          <li key={i} className="text-xs text-gray-600 truncate flex items-start gap-1">
                            <span className="text-indigo-400 select-none">•</span>
                            {isUrl ? (
                              <a
                                href={citation}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate text-indigo-600 hover:text-indigo-800 hover:underline"
                                title={citation}
                              >
                                {citation}
                              </a>
                            ) : (
                              <span className="truncate" title={citation}>
                                {citation}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t sticky bottom-0 z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="relative flex items-end bg-white rounded-2xl border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all p-1.5"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 border-none shadow-none focus:outline-none focus:ring-0 px-4 bg-transparent py-3 text-sm resize-none max-h-[120px] min-h-[44px] text-gray-900 placeholder:text-gray-400"
          />
          <div className="flex items-center gap-1.5 pb-2 px-1.5">
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
              >
                <Square className="h-4 w-4 fill-current" />
                <span className="sr-only">Stop</span>
              </button>
            ) : null}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-sm"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </button>
          </div>
        </form>
        <div className="text-center mt-2">
           <a href="https://contextly.ai" target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
            Powered by Contextly AI
          </a>
        </div>
      </div>
    </div>
  );
}
