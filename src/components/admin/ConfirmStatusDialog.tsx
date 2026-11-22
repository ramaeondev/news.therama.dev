import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ACTIONS } from "@/components/admin/statusActions";
import type { AdminStatus } from "@/lib/adminApi";

/** Copy for the confirmation dialog, keyed by the status being applied. */
const CONFIRM: Record<AdminStatus, { title: string; body: string; confirm: string; progress: string; batch: (n: number) => string }> = {
  published: {
    title: "Publish these stories?",
    body: "They become visible on the public site straight away.",
    confirm: "Publish",
    progress: "Publishing",
    batch: (n) => `You are about to publish ${n} stories.`,
  },
  rejected: {
    title: "Reject these stories?",
    body: "They stay hidden from the public site and move to the Rejected tab, where they can be published later.",
    confirm: "Reject",
    progress: "Rejecting",
    batch: (n) => `You are about to reject ${n} stories.`,
  },
  archived: {
    title: "Unpublish these stories?",
    body: "They disappear from the public site and move to the Archived tab. Links to them stop working until they are republished.",
    confirm: "Unpublish",
    progress: "Unpublishing",
    batch: (n) => `You are about to unpublish ${n} stories.`,
  },
  pending_review: {
    title: "Move these stories back to pending?",
    body: "They leave the public site and return to the review queue.",
    confirm: "Move to pending",
    progress: "Moving to pending",
    batch: (n) => `You are about to move ${n} stories back to pending.`,
  },
};

interface ConfirmStatusDialogProps {
  /** Selected count; the dialog is closed when null. */
  count: number | null;
  status: AdminStatus;
  target: AdminStatus;
  busy: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

/** Admin: last check before a bulk action changes the public site. */
export function ConfirmStatusDialog({ count, status, target, busy, onConfirm, onOpenChange }: ConfirmStatusDialogProps) {
  const action = ACTIONS[status].find((a) => a.to === target);
  const copy = CONFIRM[target];
  return (
    <Dialog open={count != null} onOpenChange={(open) => !busy && onOpenChange(open)}>
      <DialogContent aria-describedby="confirm-status-description">
        <DialogHeader>
          <DialogTitle>{count === 1 ? copy.title.replace("these stories", "this story") : copy.title}</DialogTitle>
          <DialogDescription id="confirm-status-description">
            {copy.body}
            {count != null && count > 1 && ` ${copy.batch(count)}`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant={target === "rejected" ? "destructive" : "default"} onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : action && <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />}
            {busy ? `${copy.progress}…` : copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
