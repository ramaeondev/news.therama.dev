import { absoluteTime, relativeTime } from "@/lib/time";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTimeZone } from "@/lib/timezone-context";

export function TimeAgo({ iso, className }: { iso: string | null; className?: string }) {
  const { timeZone } = useTimeZone();
  if (!iso) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={iso} className={className}>
          {relativeTime(iso)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{absoluteTime(iso, timeZone)}</TooltipContent>
    </Tooltip>
  );
}
