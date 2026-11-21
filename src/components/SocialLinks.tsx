import { useSocialLinks } from "@/hooks/useNews";
import { SourceFavicon } from "@/components/SourceFavicon";
import { cn } from "@/lib/utils";

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** therama social links from the shared static.social_links API. Renders nothing if unavailable. */
export function SocialLinks({ variant = "pills", className }: { variant?: "pills" | "icons"; className?: string }) {
  const { data, isPending } = useSocialLinks();

  if (isPending) {
    return (
      <div className={cn("flex gap-2", className)} aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={cn("animate-pulse rounded-full bg-muted", variant === "pills" ? "h-9 w-24" : "h-8 w-8")} />
        ))}
      </div>
    );
  }
  if (!data?.length) return null;

  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="therama on social media">
      {data.map((link) => (
        <li key={link.id}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer me"
            title={link.display_name}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              variant === "pills" ? "px-3.5 py-1.5" : "h-8 w-8 justify-center",
            )}
          >
            <SourceFavicon domain={hostOf(link.url)} name={link.display_name} />
            <span className={variant === "icons" ? "sr-only" : undefined}>{link.display_name}</span>
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
