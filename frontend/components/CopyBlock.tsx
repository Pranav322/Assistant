"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type CopyBlockProps = {
  label?: string;
  value: string;
  className?: string;
};

export default function CopyBlock({ label, value, className }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="bg-muted relative overflow-hidden rounded-lg border font-mono text-sm">
        <pre
          className={`overflow-x-auto p-4 pr-12 break-all whitespace-pre-wrap ${className || ""}`}
        >
          <code className="break-all">{value}</code>
        </pre>
        <div className="bg-muted/80 absolute top-1 right-1 rounded backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-8 w-8"
            onClick={onCopy}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">Copy</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
