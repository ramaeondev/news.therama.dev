import { Link } from "react-router-dom";
import { SOURCES } from "@/config/sources";
import { SourceFavicon } from "@/components/SourceFavicon";
import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";

export default function Sources() {
  return (
    <div className="mx-auto max-w-5xl">
      <Seo title="Sources" description="The AI company blogs and tech publications behind therama AI News." path="/sources" />
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sources</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every story links back to one of these publishers.</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SOURCES.map((s) => (
          <li key={s.slug}>
            <Link to={`/sources/${s.slug}`} className="flex h-full flex-col rounded-lg border p-5 transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex items-center gap-3">
                <SourceFavicon domain={s.domain} name={s.name} size={32} />
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{s.name}</h2>
                  <p className="text-xs text-muted-foreground">{s.domain}</p>
                </div>
                <Badge variant={s.kind === "Official" ? "default" : "secondary"} className="ml-auto">{s.kind}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
