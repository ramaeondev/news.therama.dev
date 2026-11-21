import { useState } from "react";
import { cn } from "@/lib/utils";

/** Publisher-hosted image (linked from the publisher's site). Disappears if it fails to load. */
export function StoryImage({ src, alt = "", className, eager }: { src?: string | null; alt?: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed || !src.startsWith("https://")) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("bg-muted object-cover", className)}
    />
  );
}
