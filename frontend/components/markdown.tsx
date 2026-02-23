"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-10 mb-4 border-b border-zinc-200 pb-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-base leading-7 text-zinc-600 dark:text-zinc-400">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-zinc-900 underline decoration-zinc-400 underline-offset-4 transition-colors hover:decoration-zinc-900 dark:text-zinc-100 dark:hover:decoration-zinc-100"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 list-inside list-disc space-y-2 text-zinc-600 dark:text-zinc-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 list-inside list-decimal space-y-2 text-zinc-600 dark:text-zinc-400">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-7 text-zinc-600 dark:text-zinc-400">{children}</li>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                  {children}
                </code>
              );
            }
            return (
              <code
                className={cn(
                  "overflow-x block rounded-lg bg-zinc-900 p-4 font-mono text-sm text-zinc-100 dark:bg-zinc-950 dark:text-zinc-300",
                  className
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="overflow-x mb-6 rounded-lg bg-zinc-900 p-4 font-mono text-sm text-zinc-100 dark:bg-zinc-950 dark:text-zinc-300">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="mb-6 overflow-x-auto">
              <table className="w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-50 dark:bg-zinc-900">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-zinc-200 px-4 py-2 text-left font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-zinc-200 px-4 py-2 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-zinc-300 py-1 pl-4 text-zinc-600 italic dark:border-zinc-700 dark:text-zinc-400">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-zinc-200 dark:border-zinc-800" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{children}</strong>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
