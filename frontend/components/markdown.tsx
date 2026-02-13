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
            <h1 className="text-4xl font-bold tracking-tight mb-6 text-zinc-900 dark:text-zinc-100">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold tracking-tight mt-10 mb-4 text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mt-8 mb-3 text-zinc-900 dark:text-zinc-100">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400 mb-4">{children}</p>
          ),
          a: ({ href, children }) => (
            <a href={href} className="text-zinc-900 dark:text-zinc-100 underline underline-offset-4 decoration-zinc-400 hover:decoration-zinc-900 dark:hover:decoration-zinc-100 transition-colors">{children}</a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 text-zinc-600 dark:text-zinc-400">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-zinc-600 dark:text-zinc-400">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-zinc-600 dark:text-zinc-400 leading-7">{children}</li>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono text-zinc-900 dark:text-zinc-100">{children}</code>
              );
            }
            return (
              <code className={cn("block bg-zinc-900 dark:bg-zinc-950 text-zinc-100 dark:text-zinc-300 p-4 rounded-lg overflow-x text-sm font-mono", className)} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-zinc-100 dark:text-zinc-300 p-4 rounded-lg overflow-x mb-6 text-sm font-mono">{children}</pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-50 dark:bg-zinc-900">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-left font-semibold text-zinc-900 dark:text-zinc-100">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-zinc-600 dark:text-zinc-400">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-4 py-1 italic text-zinc-600 dark:text-zinc-400 my-4">{children}</blockquote>
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
