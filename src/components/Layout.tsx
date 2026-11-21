import { Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { TimeZonePicker } from "@/components/TimeZonePicker";
import { SearchBox } from "@/components/SearchBox";
import { OfflineBanner } from "@/components/States";
import { StoryListSkeleton } from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn("rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground", isActive ? "text-foreground" : "text-muted-foreground");

export function Layout() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { pathname } = useLocation();

  // Braces matter: newer browsers return a Promise from scrollTo, which must not become the effect cleanup.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // "/" focuses search (unless typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable) return;
      e.preventDefault();
      if (window.matchMedia("(min-width: 768px)").matches) searchRef.current?.focus();
      else setSheetOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-14 items-center gap-4">
          <Link to="/" className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="AI News home">
            <Logo />
          </Link>
          <SearchBox ref={searchRef} className="mx-auto hidden w-full max-w-md md:block" />
          <nav aria-label="Main" className="ml-auto flex items-center md:ml-0">
            <NavLink to="/sources" className={navClass}>Sources</NavLink>
            <NavLink to="/about" className={cn(navClass({ isActive: false }), "hidden sm:inline-flex")}>About</NavLink>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="pt-10">
                <SheetTitle className="sr-only">Search AI news</SheetTitle>
                <SearchBox autoFocus onDone={() => setSheetOpen(false)} />
              </SheetContent>
            </Sheet>
            <TimeZonePicker />
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <OfflineBanner />
      <main id="main" className="container flex-1 py-6 md:py-10">
        <Suspense fallback={<div className="mx-auto max-w-3xl"><StoryListSkeleton /></div>}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t">
        <div className="container flex flex-col gap-3 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl">
            News is collected automatically from publisher feeds and links to the original articles. Headlines and descriptions belong to their publishers.
          </p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link to="/sources" className="hover:text-foreground">Sources</Link>
            <Link to="/about" className="hover:text-foreground">About</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
