"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type CopyBlockProps = {
  label?: string;
  value: string;
};

export default function CopyBlock({ label, value }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="relative rounded-lg border bg-muted font-mono text-sm">
        <pre className="overflow-x-auto p-4 pr-12">
          <code>{value}</code>
        </pre>
        <div className="absolute right-1 top-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onCopy}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">Copy</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
