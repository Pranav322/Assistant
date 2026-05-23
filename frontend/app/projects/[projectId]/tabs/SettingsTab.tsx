import type { FormEvent } from "react";

import {
  Code,
  Globe,
  Key,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";

import type { ApiKey, Project } from "../types";

type Props = {
  usage: { requests: number; tokens: number; limit?: number } | undefined;
  newOriginInput: string;
  setNewOriginInput: (value: string) => void;
  handleAddOrigin: (e: FormEvent) => void;
  isUpdatingOrigins: boolean;
  originError: string;
  project: Project;
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
  deleteProject: () => void;
  deletingProject: boolean;
};

export function SettingsTab({
  usage,
  newOriginInput,
  setNewOriginInput,
  handleAddOrigin,
  isUpdatingOrigins,
  originError,
  project,
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
  deleteProject,
  deletingProject,
}: Props) {
  return (
    <TabsContent value="settings" className="space-y-8">
      <Card className="from-primary/5 to-primary/10 border-primary/20 bg-gradient-to-r">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Key className="h-5 w-5" /> Token Usage
          </CardTitle>
          <CardDescription>Monitor your project&apos;s API usage</CardDescription>
        </CardHeader>
        <CardContent>
          {usage ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="bg-background/50 rounded-lg border p-4">
                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                  Tokens Used
                </p>
                <p className="mt-1 text-2xl font-bold">{usage.tokens?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-background/50 rounded-lg border p-4">
                <p className="text-muted-foreground text-xs tracking-wider uppercase">Requests</p>
                <p className="mt-1 text-2xl font-bold">{usage.requests?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-background/50 rounded-lg border p-4">
                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                  Token Limit
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {usage.limit?.toLocaleString() || "Unlimited"}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading usage data...</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-1">
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
              {project.allowed_origins && project.allowed_origins.length > 0 ? (
                project.allowed_origins.map((origin) => (
                  <div
                    key={origin}
                    className="group flex items-center justify-between p-2.5 text-sm"
                  >
                    <span
                      className="mr-2 block min-w-0 flex-1 truncate font-mono text-xs"
                      title={origin}
                    >
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
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="api-keys" className="rounded-lg border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Code className="text-muted-foreground h-5 w-5" />
              <div className="text-left">
                <p className="text-sm font-semibold">Developer API Keys</p>
                <p className="text-muted-foreground text-xs">
                  Manage API keys for server-side integrations
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Create New API Key</Label>
                <form onSubmit={createKey} className="flex gap-3">
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key name (e.g., Production Server)"
                    className="h-10 flex-1 shadow-sm"
                    disabled={creatingKey}
                  />
                  <Button type="submit" disabled={creatingKey} className="shadow-sm">
                    {creatingKey ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Key className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Create Key</span>
                  </Button>
                </form>
                {error && <p className="text-destructive text-sm">{error}</p>}
              </div>

              {freshKey?.api_key && (
                <div className="animate-in fade-in zoom-in-95 rounded-lg border border-green-200 bg-green-50 p-4 duration-300 dark:border-green-900 dark:bg-green-950/20">
                  <p className="mb-2 text-xs font-bold text-green-700 uppercase dark:text-green-400">
                    New Key Created
                  </p>
                  <div className="relative w-full max-w-full overflow-hidden">
                    <CopyBlock value={freshKey.api_key} className="break-all whitespace-pre-wrap" />
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs italic">
                    Important: Copy this key now. It will not be shown again for security reasons.
                  </p>
                </div>
              )}

              <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <Code className="h-4 w-4" /> How to use your API Key
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Pass your API key via the <code className="bg-muted rounded px-1 py-0.5 font-mono">x-api-key</code> header.
                  Use it to embed the widget on your site, ingest documents, or query the chat API directly.
                </p>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">Embed snippet</p>
                  <div className="relative w-full max-w-full overflow-hidden">
                    <CopyBlock
                      className="text-xs break-all whitespace-pre-wrap"
                      value={`<script
  src="https://contextly.live/embed.js"
  data-project-id="${project.id}"
  data-api-key="${freshKey?.api_key || "YOUR_API_KEY"}"
  defer
></script>`}
                    />
                  </div>
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider pt-1">Ingest a URL</p>
                  <div className="relative w-full max-w-full overflow-hidden">
                    <CopyBlock
                      className="text-xs break-all whitespace-pre-wrap"
                      value={`curl -X POST "${apiBaseUrl}/ingestion/url?project_id=${project.id}" \\
  -H "x-api-key: ${freshKey?.api_key || "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}
                    />
                  </div>
                </div>
              </div>

              {(keys?.length ?? 0) > 0 && (
                <div className="space-y-3 pt-4">
                  <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Active Keys
                  </Label>
                  {(keys ?? [])
                    .filter((k) => !k.revoked_at)
                    .map((key) => (
                      <div
                        key={key.id}
                        className="bg-background flex items-center justify-between rounded-lg border p-3 shadow-sm transition-shadow hover:shadow-md"
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
                                  This will immediately revoke &quot;{key.name || "API Key"}&quot;.
                                  Any applications using this key will stop working.
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
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription>Destructive actions that cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="shadow-sm">
                Delete Project
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your project and remove
                  all associated data, including ingestion sources and API keys.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteProject}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deletingProject ? "Deleting..." : "Delete Project"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
