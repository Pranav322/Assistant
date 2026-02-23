import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

import type { Source } from "./types";

type Props = {
  isDeleteModalOpen: boolean;
  onCloseDeleteModal: () => void;
  sourceToDelete: Source | null;
  deleteConfirmation: string;
  setDeleteConfirmation: (value: string) => void;
  confirmDeleteSource: () => void;
  deletingSourceId: string | null;
  isBulkDeleteModalOpen: boolean;
  onCloseBulkDeleteModal: () => void;
  selectedSourcesCount: number;
  isBulkDeleting: boolean;
  confirmBulkDelete: () => void;
};

export function DeleteSourcesModals({
  isDeleteModalOpen,
  onCloseDeleteModal,
  sourceToDelete,
  deleteConfirmation,
  setDeleteConfirmation,
  confirmDeleteSource,
  deletingSourceId,
  isBulkDeleteModalOpen,
  onCloseBulkDeleteModal,
  selectedSourcesCount,
  isBulkDeleting,
  confirmBulkDelete,
}: Props) {
  const sourceLabel =
    sourceToDelete?.metadata.filename ||
    sourceToDelete?.metadata.source_url ||
    sourceToDelete?.content_hash ||
    "";

  return (
    <>
      <Modal isOpen={isDeleteModalOpen} onClose={onCloseDeleteModal} title="Delete Source">
        <div className="space-y-4">
          <div className="rounded-md bg-destructive/10 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">Warning: Permanent Deletion</h3>
                <div className="mt-2 text-sm text-destructive/90">
                  <p>
                    This action guarantees data loss. If you are sure, type <strong>{sourceLabel}</strong> below.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="confirm-delete">Type the name/URL to confirm</Label>
            <Input
              id="confirm-delete"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={sourceLabel}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCloseDeleteModal}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteSource}
              disabled={deleteConfirmation !== sourceLabel}
            >
              {deletingSourceId === sourceToDelete?.id ? "Deleting..." : "Delete Source"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={onCloseBulkDeleteModal}
        title="Delete Selected Sources"
      >
        <div className="space-y-4">
          <div className="rounded-md bg-destructive/10 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">Warning: Permanent Deletion</h3>
                <div className="mt-2 text-sm text-destructive/90">
                  <p>
                    You are about to delete {selectedSourcesCount} data sources. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCloseBulkDeleteModal}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                </span>
              ) : (
                `Delete ${selectedSourcesCount} Sources`
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
