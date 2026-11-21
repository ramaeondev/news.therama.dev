import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { TimeZoneProvider } from "@/components/TimeZoneProvider";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StoryListSkeleton } from "@/components/StoryCard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";

const Story = lazy(() => import("@/pages/Story"));
const Search = lazy(() => import("@/pages/Search"));
const Sources = lazy(() => import("@/pages/Sources"));
const SourceFeed = lazy(() => import("@/pages/SourceFeed"));
const About = lazy(() => import("@/pages/About"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Admin = lazy(() => import("@/pages/Admin"));


export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TimeZoneProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider delayDuration={300}>
              <BrowserRouter>
                <Suspense fallback={<div className="container py-10"><StoryListSkeleton /></div>}>
                  <Routes>
                    <Route element={<Layout />}>
                      <Route index element={<Home />} />
                      <Route path="news/:id" element={<Story />} />
                      <Route path="search" element={<Search />} />
                      <Route path="sources" element={<Sources />} />
                      <Route path="sources/:slug" element={<SourceFeed />} />
                      <Route path="about" element={<About />} />
                      <Route path="admin" element={<Admin />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
              <Toaster />
            </TooltipProvider>
          </QueryClientProvider>
          </TimeZoneProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
