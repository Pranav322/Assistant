"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Globe, Rocket } from "lucide-react";

import CopyBlock from "@/components/CopyBlock";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  embedSnippet: string;
};

type SlugData = {
  slug: string | null;
  public_chat_enabled: boolean;
  public_url: string | null;
};

export function EmbedTab({ projectId, embedSnippet }: Props) {
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
    if (!trimmed) { setSlugError("Slug cannot be empty."); return; }
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

  return (
    <TabsContent value="embed">
      {/*
       * Side-by-side layout:
       *   Left  (flex-1) — primary embed code tabs
       *   Right (w-64)   — secondary "share a link" card
       *
       * On small screens they stack vertically.
       */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

        {/* ══════════════════════════════════════
            LEFT — Primary: embed your chatbot
            ══════════════════════════════════════ */}
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Add to your website
            </p>
            <p className="text-sm text-muted-foreground">
              Paste a snippet into your site — the main way to use Contextly.
            </p>
          </div>

          <Tabs defaultValue="script" className="w-full space-y-4">
            <TabsList className="bg-muted/30 grid h-auto w-full grid-cols-1 rounded-lg p-1">
              <TabsTrigger value="script"
                className="data-[state=active]:bg-background py-2 text-sm data-[state=active]:rounded-md data-[state=active]:shadow-sm">
                Script
              </TabsTrigger>
            </TabsList>

            <TabsContent value="script" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Rocket className="h-4 w-4" /> Quick Install
                  </CardTitle>
                  <CardDescription>
                    Paste this before the closing <code>&lt;/body&gt;</code> tag.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CopyBlock value={embedSnippet} className="text-xs" />
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Full HTML Example</CardTitle>
                      <CardDescription>Complete example with a custom trigger button</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter">
                      For Beginners
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>

        {/* ══════════════════════════════════════
            RIGHT — Secondary: share a direct link
            ══════════════════════════════════════ */}
        <div className="w-full lg:w-64 lg:shrink-0">
          {/* "or" label — horizontal rule on mobile, label only on desktop */}
          <div className="mb-4 flex items-center gap-3 lg:mb-3">
            <div className="h-px flex-1 border-t border-dashed lg:hidden" />
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              or, no code needed
            </span>
            <div className="h-px flex-1 border-t border-dashed lg:hidden" />
          </div>

          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-sm font-medium leading-tight">
                      Share a direct link
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
              {/* URL display */}
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
                <div className={cn(
                  "rounded-md border bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground",
                  slugData?.public_chat_enabled === false && "opacity-50"
                )}>
                  {slugData?.public_chat_enabled === false
                    ? "Public link is disabled"
                    : "Save a slug to generate your link"}
                </div>
              )}

              {/* Slug editor */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground">Slug</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={slugInput}
                    onChange={(e) => { setSlugInput(e.target.value); setSlugError(""); }}
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
        </div>

      </div>
    </TabsContent>
  );
}
