import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Infinite-scroll sentinel with a button fallback. */
export function LoadMore({
  hasMore, loading, onLoad, auto = true, endText = "You're all caught up.",
}: { hasMore: boolean; loading: boolean; onLoad: () => void; auto?: boolean; endText?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!auto || !hasMore || loading || !ref.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver((entries) => entries[0]?.isIntersecting && onLoad(), { rootMargin: "600px" });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [auto, hasMore, loading, onLoad]);

  if (!hasMore) return <p className="py-8 text-center text-sm text-muted-foreground">{endText}</p>;
  return (
    <div ref={ref} className="flex justify-center py-6">
      <Button variant="outline" onClick={onLoad} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {loading ? "Loading…" : "Load more"}
      </Button>
    </div>
  );
}
