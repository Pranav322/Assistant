import type { FormEvent } from "react";

import { AlertCircle, CheckCircle2, Code, Globe, Key, Loader2, Plus, RefreshCw, Trash2, X } from "lucide-react";

import CopyBlock from "@/components/CopyBlock";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  tokenError: string;
  widgetToken: string | null;
  tokenExpiresIn: number | null;
  tokenLoading: boolean;
  generateWidgetToken: () => void;
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
  tokenError,
  widgetToken,
  tokenExpiresIn,
  tokenLoading,
  generateWidgetToken,
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
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Key className="h-5 w-5" /> Token Usage
          </CardTitle>
          <CardDescription>Monitor your project&apos;s API usage</CardDescription>
        </CardHeader>
        <CardContent>
          {usage ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-lg bg-background/50 border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Tokens Used</p>
                <p className="text-2xl font-bold mt-1">{usage.tokens?.toLocaleString() || 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Requests</p>
                <p className="text-2xl font-bold mt-1">{usage.requests?.toLocaleString() || 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Token Limit</p>
                <p className="text-2xl font-bold mt-1">{usage.limit?.toLocaleString() || "Unlimited"}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading usage data...</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Key className="h-5 w-5" /> Widget Token
            </CardTitle>
            <CardDescription>
              Use this token to embed the chatbot widget on your website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokenError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{tokenError}</AlertDescription>
              </Alert>
            )}

            {widgetToken ? (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/50 p-3 min-w-0">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Your Widget Token</Label>
                  <div className="min-w-0 overflow-hidden">
                    <CopyBlock value={widgetToken} className="text-xs" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      Token active
                    </span>
                    {tokenExpiresIn && <span>Expires in {Math.floor(tokenExpiresIn / 60)}m</span>}
                  </div>
                  <Button variant="outline" size="sm" onClick={generateWidgetToken} disabled={tokenLoading}>
                    {tokenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground bg-muted/30">
                  No widget token generated yet.
                </div>
                <Button onClick={generateWidgetToken} disabled={tokenLoading} size="sm">
                  {tokenLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
                  ) : (
                    <><Key className="h-4 w-4 mr-2" /> Generate Token</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
                className="flex-1 h-9 text-sm"
                disabled={isUpdatingOrigins}
              />
              <Button type="submit" disabled={isUpdatingOrigins} size="sm">
                {isUpdatingOrigins ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </form>
            {originError && <p className="text-xs text-destructive">{originError}</p>}

            <div className="rounded-md border bg-muted/20 divide-y max-h-[200px] overflow-y-auto">
              {project.allowed_origins && project.allowed_origins.length > 0 ? (
                project.allowed_origins.map((origin) => (
                  <div key={origin} className="flex items-center justify-between p-2.5 text-sm group">
                    <span className="font-mono text-xs truncate mr-2 block min-w-0 flex-1" title={origin}>{origin}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRemoveOrigin(origin)}
                      disabled={isUpdatingOrigins}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-muted-foreground text-xs">No origins configured.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="api-keys" className="border rounded-lg">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Code className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-semibold">Developer API Keys</p>
                <p className="text-xs text-muted-foreground">Manage API keys for server-side integrations</p>
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
                    className="flex-1 h-10 shadow-sm"
                    disabled={creatingKey}
                  />
                  <Button type="submit" disabled={creatingKey} className="shadow-sm">
                    {creatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">Create Key</span>
                  </Button>
                </form>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              {freshKey?.api_key && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20 animate-in fade-in zoom-in-95 duration-300">
                  <p className="text-xs font-bold uppercase text-green-700 dark:text-green-400 mb-2">New Key Created</p>
                  <div className="relative w-full max-w-full overflow-hidden">
                    <CopyBlock value={freshKey.api_key} className="break-all whitespace-pre-wrap" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground italic">Important: Copy this key now. It will not be shown again for security reasons.</p>
                </div>
              )}

              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Code className="h-4 w-4" /> How to use your API Key
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">Use the `x-api-key` header in your requests.</p>
                <div className="relative w-full max-w-full overflow-hidden">
                  <CopyBlock
                    className="whitespace-pre-wrap break-all text-xs"
                    value={`curl -X POST "${apiBaseUrl}/ingestion/url?project_id=${project.id}" \\
  -H "x-api-key: ${freshKey?.api_key || "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}
                  />
                </div>
              </div>

              {(keys?.length ?? 0) > 0 && (
                <div className="space-y-3 pt-4">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Keys</Label>
                  {(keys ?? [])
                    .filter((k) => !k.revoked_at)
                    .map((key) => (
                      <div key={key.id} className="flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-medium text-sm">{key.name || "API Key"}</p>
                          <p className="text-xs font-mono text-muted-foreground opacity-70">{key.prefix}...</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 border-none">Active</Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will immediately revoke &quot;{key.name || "API Key"}&quot;. Any applications using this key will stop working.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeKey(key.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
              <Button variant="destructive" className="shadow-sm">Delete Project</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  project and remove all associated data, including ingestion sources and API keys.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
