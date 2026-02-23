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
          <p className="text-sm text-muted-foreground">Changes auto-save and sync to your live widget.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5 animate-in fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
            </span>
          )}
          {isSavingBranding && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
          {!hasUnsavedChanges && !isSavingBranding && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1fr,400px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Display Mode</Label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
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
                  <div className="flex gap-2 items-center">
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
                      className="w-16 h-10 p-1"
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
                    <p className="text-xs text-destructive">Please enter a valid hex color (e.g., #4f46e5)</p>
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
              <CardDescription>Control what the bot says and how it starts conversations.</CardDescription>
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
                    "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    starterQuestions.length > 500 && "border-destructive focus-visible:ring-destructive"
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
                  <p className="text-xs text-destructive">Maximum 500 characters allowed</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>System Prompt (Instructions)</Label>
                <textarea
                  className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono text-xs"
                  value={systemPrompt}
                  onChange={(e) => {
                    setSystemPrompt(e.target.value);
                    triggerAutoSave();
                  }}
                  placeholder="You are a helpful assistant..."
                />
                <p className="text-[10px] text-muted-foreground">This guides the AI&apos;s tone and behavior.</p>
              </div>
            </CardContent>
          </Card>

          {brandingError && <p className="text-sm text-destructive">{brandingError}</p>}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Live Preview</CardTitle>
                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">{embedMode}</Badge>
              </div>
              <CardDescription>See changes instantly as you customize</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div
                className={cn(
                  "relative w-full transition-all duration-500 ease-in-out",
                  embedMode === "popup" ? "p-3 bg-muted/30" : "p-0 bg-white"
                )}
              >
                <div
                  className={cn(
                    "flex flex-col bg-white transition-all duration-500 mx-auto",
                    embedMode === "popup"
                      ? "rounded-2xl shadow-2xl border h-[450px] max-w-[320px]"
                      : "rounded-lg border shadow-sm h-[450px]"
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
                      <img src={logoUrl} alt="logo" className="h-7 w-7 rounded-full object-cover bg-white/20" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                        {botTitle?.charAt(0) || "A"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{botTitle || "Assistant"}</p>
                      <p className="text-[10px] opacity-80">Online</p>
                    </div>
                  </div>

                  <div className="flex-1 p-3 bg-muted/10 space-y-3 overflow-y-auto">
                    <div className="flex flex-col gap-1.5 max-w-[85%]">
                      <div className="bg-white p-2.5 rounded-2xl rounded-tl-sm shadow-sm text-xs border">
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
                            className="text-[10px] px-2.5 py-1 rounded-full border bg-white shadow-sm cursor-default hover:border-primary/50 transition-colors font-medium text-foreground/80"
                          >
                            {q}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="p-3 border-t bg-white">
                    <div className="relative">
                      <div className="h-9 w-full rounded-full bg-muted/40 border-none px-3 flex items-center text-[11px] text-muted-foreground">
                        Enter message...
                      </div>
                      <div
                        className="absolute right-1 top-0.5 h-7 w-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: botColor }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-white opacity-40" />
                      </div>
                    </div>
                  </div>
                </div>

                {embedMode === "popup" && (
                  <div
                    className="absolute bottom-5 right-5 h-10 w-10 rounded-full shadow-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: botColor }}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </div>
                )}
              </div>
            </CardContent>
            <div className="p-4 border-t bg-muted/30">
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
                  <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                ) : (
                  <><Play className="h-4 w-4" /> Test Your Chatbot</>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </TabsContent>
  );
}
