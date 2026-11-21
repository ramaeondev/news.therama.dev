import { absoluteTime, relativeTime } from "@/lib/time";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TimeAgo({ iso, className }: { iso: string | null; className?: string }) {
  if (!iso) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={iso} className={className}>
          {relativeTime(iso)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{absoluteTime(iso)}</TooltipContent>
    </Tooltip>
  );
}
