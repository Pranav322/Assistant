import { Key, Loader2, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";

type Props = {
  usage: { requests: number; tokens: number; limit?: number } | undefined;
  deleteProject: () => void;
  deletingProject: boolean;
};

export function SettingsTab({ usage, deleteProject, deletingProject }: Props) {
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
