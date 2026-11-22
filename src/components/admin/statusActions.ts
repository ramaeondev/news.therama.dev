// Status transitions the admin can trigger, shared by the story rows and the bulk action bar.
import { Archive, Check, RotateCcw, X, type LucideIcon } from "lucide-react";
import type { AdminStatus } from "@/lib/adminApi";

export interface StatusAction {
  to: AdminStatus;
  label: string;
  icon: LucideIcon;
  variant: "default" | "outline";
}

export const ACTIONS: Record<AdminStatus, StatusAction[]> = {
  pending_review: [
    { to: "published", label: "Publish", icon: Check, variant: "default" },
    { to: "rejected", label: "Reject", icon: X, variant: "outline" },
  ],
  published: [{ to: "archived", label: "Unpublish", icon: Archive, variant: "outline" }],
  rejected: [
    { to: "published", label: "Publish", icon: Check, variant: "default" },
    { to: "pending_review", label: "Back to pending", icon: RotateCcw, variant: "outline" },
  ],
  archived: [
    { to: "published", label: "Republish", icon: Check, variant: "default" },
    { to: "pending_review", label: "Back to pending", icon: RotateCcw, variant: "outline" },
  ],
};

/** Past-tense text used in toasts, e.g. "Published 12 stories". */
export const DONE_TEXT: Record<AdminStatus, string> = {
  published: "Published",
  rejected: "Rejected",
  archived: "Unpublished",
  pending_review: "Moved to pending",
};
