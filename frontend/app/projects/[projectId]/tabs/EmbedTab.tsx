"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ExternalLink, Globe, Key, Loader2, Plus, Rocket, Trash2, X } from "lucide-react";

import CopyBlock from "@/components/CopyBlock";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

import type { ApiKey } from "../types";

type Props = {
  projectId: string;
  widgetBaseUrl: string;
  embedMode: "popup" | "embedded";
  newOriginInput: string;
  setNewOriginInput: (value: string) => void;
  handleAddOrigin: (e: FormEvent) => void;
  isUpdatingOrigins: boolean;
  originError: string;
  allowedOrigins: string[];
  handleRemoveOrigin: (origin: string) => void;
  createKey: (e: FormEvent) => void;
  newKeyName: string;
  setNewKeyName: (value: string) => void;
  creatingKey: boolean;
  error: string;
  freshKey: ApiKey | null;
  apiBaseUrl: string;
  keys: ApiKey[] | undefined;
  revokeKey: (id: string) => void;
};

type SlugData = {
  slug: string | null;
  public_chat_enabled: boolean;
  public_url: string | null;
};

export function EmbedTab({
  projectId,
  widgetBaseUrl,
  embedMode,
  newOriginInput,
  setNewOriginInput,
  handleAddOrigin,
  isUpdatingOrigins,
  originError,
  allowedOrigins,
  handleRemoveOrigin,
  createKey,
  newKeyName,
  setNewKeyName,
  creatingKey,
  error,
  freshKey,
  apiBaseUrl,
  keys,
  revokeKey,
}: Props) {
  const [slugData, setSlugData] = useState<SlugData | null>(null);
  const [slugInput, setSlugInput] = useState("");
  const [slugError, setSlugError] = useState("");
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);

  useEffect(() => {
    async function load() {
      const token = getToken();
      if (!token) return;
      try {
        const data = await apiRequest<SlugData>(`/projects/${projectId}/slug`, {
          method: "GET",
          token,
        });
        setSlugData(data);
        setSlugInput(data.slug ?? "");
      } catch {
        // non-critical
      }
    }
    void load();
  }, [projectId]);

  async function saveSlug() {
    setSlugError("");
    const token = getToken();
    if (!token) return;
    const trimmed = slugInput.trim().toLowerCase();
    if (!trimmed) {
      setSlugError("Slug cannot be empty.");
      return;
    }
    setIsSavingSlug(true);
    try {
      const data = await apiRequest<SlugData>(`/projects/${projectId}/slug`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ slug: trimmed }),
      });
      setSlugData(data);
      setSlugInput(data.slug ?? "");
      setSlugError("");
    } catch (err) {
      setSlugError((err as Error).message.replace(/^Error:\s*/i, ""));
    } finally {
      setIsSavingSlug(false);
    }
  }

  async function toggleEnabled(enabled: boolean) {
    const token = getToken();
    if (!token) return;
    setIsTogglingEnabled(true);
    try {
      const data = await apiRequest<SlugData>(`/projects/${projectId}/slug`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ public_chat_enabled: enabled }),
      });
      setSlugData(data);
    } catch {
      // noop
    } finally {
      setIsTogglingEnabled(false);
    }
  }

  const publicUrl = slugData?.public_url ?? null;
  const activeKeys = (keys ?? []).filter((k) => !k.revoked_at);
  const snippetKey = freshKey?.api_key || "YOUR_API_KEY";

  const embedSnippet = `<script
  src="${widgetBaseUrl}/embed.js"
  data-project-id="${projectId}"
  data-api-key="${snippetKey}"${embedMode !== "popup" ? `\n  data-mode="${embedMode}"` : ""}
  defer
></script>`;

  return (
    <TabsContent value="embed" className="space-y-8">
      {/* Step 1 — API Keys: needed before the snippet below means anything */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> API Keys
          </CardTitle>
          <CardDescription>
            Create a key to authenticate your widget, ingestion, and chat API calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={createKey} className="flex gap-3">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g., Production Server)"
              className="h-10 flex-1"
              disabled={creatingKey}
            />
            <Button type="submit" disabled={creatingKey}>
              {creatingKey ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Create Key</span>
            </Button>
          </form>
          {error && <p className="text-destructive text-sm">{error}</p>}

          {freshKey?.api_key && (
            <div className="animate-in fade-in zoom-in-95 rounded-lg border border-green-200 bg-green-50 p-4 duration-300 dark:border-green-900 dark:bg-green-950/20">
              <p className="mb-2 text-xs font-bold text-green-700 uppercase dark:text-green-400">
                New Key Created
              </p>
              <div className="relative w-full max-w-full overflow-hidden">
                <CopyBlock value={freshKey.api_key} className="break-all whitespace-pre-wrap" />
              </div>
              <p className="text-muted-foreground mt-2 text-xs italic">
                Important: Copy this key now. It will not be shown again — the snippet below
                already uses it.
              </p>
            </div>
          )}

          {activeKeys.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Active Keys
              </Label>
              {activeKeys.map((key) => (
                <div
                  key={key.id}
                  className="bg-background flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{key.name || "API Key"}</p>
                    <p className="text-muted-foreground font-mono text-xs opacity-70">
                      {key.prefix}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="border-none bg-green-100 text-[10px] text-green-700"
                    >
                      Active
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will immediately revoke &quot;{key.name || "API Key"}&quot;. Any
                            applications using this key will stop working.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => revokeKey(key.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke Key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Allowed Origins: which domains may use the key above */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" /> Allowed Origins
          </CardTitle>
          <CardDescription>Whitelist domains where your widget can load.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddOrigin} className="flex gap-2">
            <Input
              value={newOriginInput}
              onChange={(e) => setNewOriginInput(e.target.value)}
              placeholder="https://myapp.com"
              className="h-9 flex-1 text-sm"
              disabled={isUpdatingOrigins}
            />
            <Button type="submit" disabled={isUpdatingOrigins} size="sm">
              {isUpdatingOrigins ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </form>
          {originError && <p className="text-destructive text-xs">{originError}</p>}

          <div className="bg-muted/20 max-h-[200px] divide-y overflow-y-auto rounded-md border">
            {allowedOrigins.length > 0 ? (
              allowedOrigins.map((origin) => (
                <div key={origin} className="group flex items-center justify-between p-2.5 text-sm">
                  <span className="mr-2 block min-w-0 flex-1 truncate font-mono text-xs" title={origin}>
                    {origin}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0"
                    onClick={() => handleRemoveOrigin(origin)}
                    disabled={isUpdatingOrigins}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground p-3 text-center text-xs">
                No origins configured.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 3 — the snippet itself, using the real key from above */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-4 w-4" /> Add to your website
          </CardTitle>
          <CardDescription>
            Paste this before the closing <code>&lt;/body&gt;</code> tag.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyBlock value={embedSnippet} className="text-xs" />

          <Accordion type="single" collapsible>
            <AccordionItem value="full-example" className="border-b-0">
              <AccordionTrigger className="text-muted-foreground py-2 text-xs hover:no-underline">
                Show a full HTML example with a custom trigger button
              </AccordionTrigger>
              <AccordionContent>
                <CopyBlock
                  value={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Site with Contextly Chatbot</title>
  <style>
    .chat-trigger-btn {
      position: fixed; bottom: 20px; right: 20px;
      background: #4f46e5; color: white; border: none;
      padding: 14px 24px; border-radius: 50px; cursor: pointer;
      font-weight: 600; box-shadow: 0 4px 20px rgba(79,70,229,.4);
    }
  </style>
</head>
<body>
  <h1>Welcome</h1>
  <button class="chat-trigger-btn" onclick="ChatbotWidget?.toggle()">💬 Chat with us</button>

${embedSnippet}
</body>
</html>`}
                  className="text-xs"
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <p className="text-muted-foreground text-xs">
            Need to ingest documents or query chat directly from a server? Use the same key with{" "}
            <code className="bg-muted rounded px-1 py-0.5 font-mono">
              curl -H &quot;x-api-key: {snippetKey}&quot; {apiBaseUrl}/ingestion/url?project_id=
              {projectId}
            </code>
            .
          </p>
        </CardContent>
      </Card>

      {/* No-code alternative */}
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <CardTitle className="text-sm font-medium leading-tight">
                  Or, share a direct link — no code needed
                </CardTitle>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  Optional
                </Badge>
              </div>
            </div>
            <Switch
              id="public-enabled"
              disabled={isTogglingEnabled || !slugData}
              checked={slugData?.public_chat_enabled ?? true}
              onCheckedChange={(v) => void toggleEnabled(v)}
            />
          </div>
          <CardDescription className="mt-1 text-xs">
            A standalone page for sharing — not for embedding into your site.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {publicUrl && slugData?.public_chat_enabled ? (
            <div className="space-y-1.5">
              <div className="truncate rounded-md border bg-muted/30 px-2.5 py-2 font-mono text-[11px]">
                {publicUrl}
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-xs"
                  onClick={() => void navigator.clipboard.writeText(publicUrl)}
                >
                  Copy link
                </Button>
                <Button asChild size="sm" variant="outline" className="h-7 w-7 shrink-0 p-0">
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-md border bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground",
                slugData?.public_chat_enabled === false && "opacity-50"
              )}
            >
              {slugData?.public_chat_enabled === false
                ? "Public link is disabled"
                : "Save a slug to generate your link"}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">Slug</Label>
            <div className="flex gap-1.5">
              <Input
                value={slugInput}
                onChange={(e) => {
                  setSlugInput(e.target.value);
                  setSlugError("");
                }}
                className={cn("h-8 font-mono text-xs", slugError && "border-destructive")}
                placeholder="my-project"
              />
              <Button
                size="sm"
                className="h-8 shrink-0"
                onClick={() => void saveSlug()}
                disabled={isSavingSlug || slugInput === (slugData?.slug ?? "")}
              >
                Save
              </Button>
            </div>
            {slugError && <p className="text-[11px] text-destructive">{slugError}</p>}
            <p className="text-[10px] text-muted-foreground">
              contextly.live/chat/<span className="text-foreground">{slugInput || "…"}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
