import { Upload, Link as LinkIcon, Loader2, AlertCircle, Play, ExternalLink, Trash2, FileText, Globe, CheckCircle2, XCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";

import type { Source } from "../types";

type Props = {
  uploading: boolean;
  fileInputKey: number;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  uploadFile: () => void;
  uploadProgress: number;
  fileUploadError: string;
  urlIngesting: boolean;
  ingestUrl: string;
  setIngestUrl: (value: string) => void;
  ingestUrlSubmit: () => void;
  urlIngestError: string;
  isNewProject: boolean;
  sources: Source[] | undefined;
  tokenLoading: boolean;
  tokenError: string;
  widgetToken: string | null;
  previewSnippet: string;
  selectedSources: string[];
  openBulkDeleteModal: () => void;
  handleSelectAll: () => void;
  paginatedSources: Source[];
  handleSelectSource: (sourceId: string) => void;
  openDeleteModal: (source: Source) => void;
  deletingSourceId: string | null;
  itemsPerPage: number;
  currentPage: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
};

export function KnowledgeBaseTab({
  uploading,
  fileInputKey,
  selectedFile,
  setSelectedFile,
  uploadFile,
  uploadProgress,
  fileUploadError,
  urlIngesting,
  ingestUrl,
  setIngestUrl,
  ingestUrlSubmit,
  urlIngestError,
  isNewProject,
  sources,
  tokenLoading,
  tokenError,
  widgetToken,
  previewSnippet,
  selectedSources,
  openBulkDeleteModal,
  handleSelectAll,
  paginatedSources,
  handleSelectSource,
  openDeleteModal,
  deletingSourceId,
  itemsPerPage,
  currentPage,
  totalPages,
  handlePageChange,
}: Props) {
  return (
    <TabsContent value="knowledge-base" className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className={cn("transition-colors", uploading ? "border-primary/50 bg-primary/5" : "")}> 
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> File Upload
            </CardTitle>
            <CardDescription>Upload documents (PDF, TXT, MD) to your knowledge base.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Select File</Label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 group min-w-0">
                  <Input
                    key={fileInputKey}
                    type="file"
                    accept=".pdf,.txt,.md,.markdown"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 h-11 w-full"
                  />
                  <div className="flex items-center h-11 w-full rounded-md border border-input bg-background px-4 py-2 text-sm ring-offset-background group-hover:border-primary/50 transition-colors shadow-sm min-w-0">
                    <div className="bg-primary text-primary-foreground text-xs font-bold uppercase px-3 py-1.5 rounded-full mr-3 shrink-0">
                      Browse
                    </div>
                    <span className="text-muted-foreground truncate font-medium">
                      {selectedFile?.name || "Choose a file..."}
                    </span>
                  </div>
                </div>
                <Button onClick={uploadFile} disabled={uploading} className="h-11 px-6 font-semibold">
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading
                    </span>
                  ) : "Upload"}
                </Button>
              </div>
              {uploading && (
                <div className="w-full bg-secondary rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              {fileUploadError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{fileUploadError}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-colors", urlIngesting ? "border-primary/50 bg-primary/5" : "")}> 
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" /> URL Ingestion
            </CardTitle>
            <CardDescription>Crawl and index content from a website URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Target URL</Label>
              <div className="flex items-center gap-3">
                <Input
                  value={ingestUrl}
                  onChange={(e) => setIngestUrl(e.target.value)}
                  placeholder="https://example.com/docs"
                />
                <Button onClick={ingestUrlSubmit} disabled={urlIngesting} variant="outline">
                  {urlIngesting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Ingesting
                    </span>
                  ) : "Ingest"}
                </Button>
              </div>
              {urlIngestError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{urlIngestError}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {!isNewProject && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Play className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Ready to test your chatbot?</h3>
              <p className="text-sm text-muted-foreground">Chat with your bot using {sources?.filter((s) => s.status === "completed").length ?? 0} documents</p>
            </div>
          </div>
          <Button
            size="lg"
            className="gap-2 shrink-0"
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
              <><ExternalLink className="h-4 w-4" /> Test Chatbot</>
            )}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Data Sources</CardTitle>
            <CardDescription>Manage your ingested files and URLs.</CardDescription>
          </div>
          {selectedSources.length > 0 && (
            <Button variant="destructive" size="sm" onClick={openBulkDeleteModal}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selectedSources.length} selected
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={(sources?.length ?? 0) > 0 && selectedSources.length === (sources?.length ?? 0)}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Name/URL</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sources?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium">No data sources yet</p>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Upload documents or add URLs to build your knowledge base. Your chatbot will use these to answer questions.
                        </p>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const element = document.querySelector('[value="knowledge-base"]');
                            if (element) {
                              const fileInput = document.querySelector("input[type=\"file\"]");
                              fileInput?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload File
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSources.includes(source.id)}
                        onCheckedChange={() => handleSelectSource(source.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {source.type === "url" ? (
                        <Globe className="h-4 w-4 text-blue-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-orange-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {source.metadata.filename || source.metadata.source_url || source.content_hash.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {source.metadata.size_bytes
                        ? new Intl.NumberFormat("en-US", { style: "unit", unit: "byte", unitDisplay: "narrow" }).format(source.metadata.size_bytes)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {source.metadata.page_count ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          source.status === "completed"
                            ? "default"
                            : source.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="gap-1.5 px-2.5 py-0.5 min-w-[90px] justify-center"
                      >
                        {source.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                        {source.status === "failed" && <XCircle className="h-3 w-3" />}
                        {["pending", "processing"].includes(source.status) && (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        )}
                        <span className="capitalize">
                          {["pending", "processing"].includes(source.status) && source.progress?.percent !== undefined
                            ? `${source.progress.percent}%`
                            : source.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteModal(source)}
                        disabled={deletingSourceId === source.id}
                      >
                        {deletingSourceId === source.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {(sources?.length ?? 0) > itemsPerPage && (
            <div className="flex items-center justify-end px-4 py-4 border-t gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
