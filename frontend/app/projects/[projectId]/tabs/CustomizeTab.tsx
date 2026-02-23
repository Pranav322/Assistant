import { CheckCircle2, Loader2, MessageSquare, Play, Settings2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";

type Props = {
  hasUnsavedChanges: boolean;
  isSavingBranding: boolean;
  embedMode: "popup" | "embedded";
  setEmbedMode: (mode: "popup" | "embedded") => void;
  triggerAutoSave: () => void;
  botTitle: string;
  setBotTitle: (value: string) => void;
  botColor: string;
  setBotColor: (value: string) => void;
  welcomeMessage: string;
  setWelcomeMessage: (value: string) => void;
  logoUrl: string;
  setLogoUrl: (value: string) => void;
  starterQuestions: string;
  setStarterQuestions: (value: string) => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  brandingError: string;
  tokenLoading: boolean;
  tokenError: string;
  widgetToken: string | null;
  previewSnippet: string;
};

export function CustomizeTab({
  hasUnsavedChanges,
  isSavingBranding,
  embedMode,
  setEmbedMode,
  triggerAutoSave,
  botTitle,
  setBotTitle,
  botColor,
  setBotColor,
  welcomeMessage,
  setWelcomeMessage,
  logoUrl,
  setLogoUrl,
  starterQuestions,
  setStarterQuestions,
  systemPrompt,
  setSystemPrompt,
  brandingError,
  tokenLoading,
  tokenError,
  widgetToken,
  previewSnippet,
}: Props) {
  return (
    <TabsContent value="customize" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Customize</h2>
          <p className="text-muted-foreground text-sm">
            Changes auto-save and sync to your live widget.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="animate-in fade-in flex items-center gap-1.5 text-xs font-medium text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
            </span>
          )}
          {isSavingBranding && (
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
          {!hasUnsavedChanges && !isSavingBranding && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1fr,400px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4" /> Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Display Mode</Label>
                <div className="bg-muted grid grid-cols-2 gap-2 rounded-lg p-1">
                  <Button
                    variant={embedMode === "popup" ? "default" : "ghost"}
                    onClick={() => {
                      setEmbedMode("popup");
                      triggerAutoSave();
                    }}
                    className="h-8 text-xs"
                  >
                    Popup Bubble
                  </Button>
                  <Button
                    variant={embedMode === "embedded" ? "default" : "ghost"}
                    onClick={() => {
                      setEmbedMode("embedded");
                      triggerAutoSave();
                    }}
                    className="h-8 text-xs"
                  >
                    Embedded Flat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>How your bot looks to visitors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bot Title</Label>
                  <Input
                    value={botTitle}
                    onChange={(e) => {
                      setBotTitle(e.target.value);
                      triggerAutoSave();
                    }}
                    placeholder="e.g. Sales Assistant"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={botColor}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                          setBotColor(value);
                          triggerAutoSave();
                        }
                      }}
                      className="h-10 w-16 p-1"
                    />
                    <Input
                      value={botColor}
                      onChange={(e) => {
                        const value = e.target.value;
                        setBotColor(value);
                        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                          triggerAutoSave();
                        }
                      }}
                      placeholder="#4f46e5"
                      className={cn(
                        !/^#[0-9A-Fa-f]{6}$/.test(botColor) &&
                          botColor !== "" &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                  </div>
                  {!/^#[0-9A-Fa-f]{6}$/.test(botColor) && botColor !== "" && (
                    <p className="text-destructive text-xs">
                      Please enter a valid hex color (e.g., #4f46e5)
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <Input
                  value={welcomeMessage}
                  onChange={(e) => {
                    setWelcomeMessage(e.target.value);
                    triggerAutoSave();
                  }}
                  placeholder="How can I help you today?"
                />
              </div>
              <div className="space-y-2">
                <Label>Logo URL (Optional)</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    triggerAutoSave();
                  }}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Behavior</CardTitle>
              <CardDescription>
                Control what the bot says and how it starts conversations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Starter Questions (One per line)</Label>
                  <span
                    className={cn(
                      "text-xs",
                      starterQuestions.length > 400 ? "text-amber-600" : "text-muted-foreground",
                      starterQuestions.length > 500 && "text-destructive"
                    )}
                  >
                    {starterQuestions.length}/500
                  </span>
                </div>
                <textarea
                  className={cn(
                    "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    starterQuestions.length > 500 &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                  value={starterQuestions}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 500) {
                      setStarterQuestions(value);
                      triggerAutoSave();
                    }
                  }}
                  placeholder={"What is your product?\nHow much does it cost?"}
                  maxLength={500}
                />
                {starterQuestions.length > 500 && (
                  <p className="text-destructive text-xs">Maximum 500 characters allowed</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>System Prompt (Instructions)</Label>
                <textarea
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[140px] w-full rounded-md border px-3 py-2 font-mono text-sm text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={systemPrompt}
                  onChange={(e) => {
                    setSystemPrompt(e.target.value);
                    triggerAutoSave();
                  }}
                  placeholder="You are a helpful assistant..."
                />
                <p className="text-muted-foreground text-[10px]">
                  This guides the AI&apos;s tone and behavior.
                </p>
              </div>
            </CardContent>
          </Card>

          {brandingError && <p className="text-destructive text-sm">{brandingError}</p>}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Live Preview</CardTitle>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold tracking-wider uppercase"
                >
                  {embedMode}
                </Badge>
              </div>
              <CardDescription>See changes instantly as you customize</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div
                className={cn(
                  "relative w-full transition-all duration-500 ease-in-out",
                  embedMode === "popup" ? "bg-muted/30 p-3" : "bg-white p-0"
                )}
              >
                <div
                  className={cn(
                    "mx-auto flex flex-col bg-white transition-all duration-500",
                    embedMode === "popup"
                      ? "h-[450px] max-w-[320px] rounded-2xl border shadow-2xl"
                      : "h-[450px] rounded-lg border shadow-sm"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 text-white",
                      embedMode === "popup" ? "rounded-t-2xl" : "rounded-t-lg"
                    )}
                    style={{ backgroundColor: botColor }}
                  >
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt="logo"
                        className="h-7 w-7 rounded-full bg-white/20 object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                        {botTitle?.charAt(0) || "A"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{botTitle || "Assistant"}</p>
                      <p className="text-[10px] opacity-80">Online</p>
                    </div>
                  </div>

                  <div className="bg-muted/10 flex-1 space-y-3 overflow-y-auto p-3">
                    <div className="flex max-w-[85%] flex-col gap-1.5">
                      <div className="rounded-2xl rounded-tl-sm border bg-white p-2.5 text-xs shadow-sm">
                        {welcomeMessage || "How can I help you today?"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {starterQuestions
                        .split("\n")
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((q, i) => (
                          <div
                            key={i}
                            className="hover:border-primary/50 text-foreground/80 cursor-default rounded-full border bg-white px-2.5 py-1 text-[10px] font-medium shadow-sm transition-colors"
                          >
                            {q}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="border-t bg-white p-3">
                    <div className="relative">
                      <div className="bg-muted/40 text-muted-foreground flex h-9 w-full items-center rounded-full border-none px-3 text-[11px]">
                        Enter message...
                      </div>
                      <div
                        className="absolute top-0.5 right-1 flex h-7 w-7 items-center justify-center rounded-full"
                        style={{ backgroundColor: botColor }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-white opacity-40" />
                      </div>
                    </div>
                  </div>
                </div>

                {embedMode === "popup" && (
                  <div
                    className="absolute right-5 bottom-5 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg"
                    style={{ backgroundColor: botColor }}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </div>
                )}
              </div>
            </CardContent>
            <div className="bg-muted/30 border-t p-4">
              <Button
                className="w-full gap-2"
                variant="default"
                disabled={tokenLoading || !!tokenError || !widgetToken}
                onClick={() => {
                  if (!widgetToken) return;
                  const width = 480;
                  const height = 700;
                  const left = window.screenX + (window.outerWidth - width) / 2;
                  const top = window.screenY + (window.outerHeight - height) / 2;
                  window.open(
                    previewSnippet,
                    "LivePreview",
                    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
                  );
                }}
              >
                {tokenLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Test Your Chatbot
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </TabsContent>
  );
}
