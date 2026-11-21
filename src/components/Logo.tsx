import { cn } from "@/lib/utils";

/** therama lotus mark (brand). Stroke uses the brand gold; size via className. */
export function LotusMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-brand", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path d="M32 11c6 8 6.5 22 0 33c-6.5-11-6-25 0-33z" />
      <path d="M32 44c-1.5-11 2.5-21 11-26c3.5 10 .5 20-11 26z" />
      <path d="M32 44c1.5-11-2.5-21-11-26c-3.5 10-.5 20 11 26z" />
      <path d="M32 44c5.5-9 13-15 23.5-15.5c-2.5 10-11 15.5-23.5 15.5z" />
      <path d="M32 44c-5.5-9-13-15-23.5-15.5c2.5 10 11 15.5 23.5 15.5z" />
      <path d="M15 51.5h34" />
    </svg>
  );
}

/** Header lockup: lotus + "therama AI News". */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LotusMark className="h-7 w-7" />
      <span>
        therama <span className="text-primary">AI News</span>
      </span>
    </span>
  );
}
