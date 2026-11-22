import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTIONS } from "@/components/admin/statusActions";
import type { AdminStatus } from "@/lib/adminApi";

interface BulkBarProps {
  /** Status the selected stories currently share. */
  status: AdminStatus;
  count: number;
  busy: boolean;
  onAction: (to: AdminStatus) => void;
  onClear: () => void;
}

/** Admin: the actions that apply to every selected story, with the selection count. */
export function BulkBar({ status, count, busy, onAction, onClear }: BulkBarProps) {
  if (!count) return null;
  const actions = ACTIONS[status];
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="sticky top-14 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <span aria-live="polite" className="mr-1 text-sm font-medium">
        {count} selected
      </span>
      {actions.map((a) => (
        <Button key={a.to} size="sm" variant={a.variant} disabled={busy} onClick={() => onAction(a.to)}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <a.icon className="mr-1.5 h-4 w-4" aria-hidden="true" />}
          {a.label} {count}
        </Button>
      ))}
      <Button size="sm" variant="ghost" className="ml-auto" disabled={busy} onClick={onClear}>
        <X className="mr-1.5 h-4 w-4" aria-hidden="true" /> Clear
      </Button>
    </div>
  );
}
