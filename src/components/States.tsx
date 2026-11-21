import { AlertTriangle, Inbox, RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/hooks/useNews";

export function ErrorPanel({ onRetry, retrying, compact }: { onRetry?: () => void; retrying?: boolean; compact?: boolean }) {
  return (
    <div role="alert" className={`flex flex-col items-center rounded-lg border border-dashed text-center ${compact ? "p-6" : "p-10"}`}>
      <AlertTriangle className="mb-3 h-8 w-8 text-amber-500" aria-hidden="true" />
      <h2 className="font-semibold">News is temporarily unavailable</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">We're having trouble reaching the news server. Please try again in a moment.</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry} disabled={retrying}>
          <RotateCw className={`mr-2 h-4 w-4 ${retrying ? "animate-spin" : ""}`} aria-hidden="true" /> Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed p-10 text-center">
      <Inbox className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="font-semibold">{title}</h2>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
      <WifiOff className="h-4 w-4" aria-hidden="true" /> You're offline. Showing saved stories.
    </div>
  );
}
