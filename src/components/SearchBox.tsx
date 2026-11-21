import { forwardRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Header search: Enter navigates to /search?q=… */
export const SearchBox = forwardRef<HTMLInputElement, { className?: string; onDone?: () => void; autoFocus?: boolean }>(
  ({ className, onDone, autoFocus }, ref) => {
    const [q, setQ] = useState("");
    const navigate = useNavigate();
    const submit = (e: FormEvent) => {
      e.preventDefault();
      const term = q.trim();
      navigate(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
      setQ("");
      onDone?.();
    };
    return (
      <form role="search" onSubmit={submit} className={cn("relative", className)}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={ref}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search AI news…"
          aria-label="Search AI news"
          autoFocus={autoFocus}
          className="h-9 pl-9 pr-10"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground md:inline">/</kbd>
      </form>
    );
  },
);
SearchBox.displayName = "SearchBox";
