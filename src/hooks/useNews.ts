import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  PAGE_SIZE, fetchBySource, fetchSocialLinks, fetchFeedPage, fetchLatestMarker, fetchStory, searchStories, type SearchParams,
} from "@/lib/api";
import type { FeedCursor, StoryWithSources } from "@/types/news";

const nextCursor = (page: StoryWithSources[]): FeedCursor | undefined => {
  if (page.length < PAGE_SIZE) return undefined;
  const last = page[page.length - 1];
  return last.first_published_at ? { t: last.first_published_at, id: last.id } : undefined;
};

/** Home feed: keyset-paginated, stable while new stories arrive. */
export function useFeed() {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam, signal }) => fetchFeedPage(pageParam, signal),
    initialPageParam: undefined as FeedCursor | undefined,
    getNextPageParam: nextCursor,
  });
}

/** True when a story newer than `currentTopId` exists (polled every 2 minutes). */
export function useHasNewStories(currentTop?: { id: string; first_published_at: string | null }) {
  const { data } = useQuery({
    queryKey: ["latest-marker"],
    queryFn: ({ signal }) => fetchLatestMarker(signal),
    refetchInterval: 120_000,
    enabled: Boolean(currentTop),
  });
  if (!data || !currentTop) return false;
  return data.id !== currentTop.id && (data.first_published_at ?? "") > (currentTop.first_published_at ?? "");
}

export function useStory(id: string | undefined) {
  return useQuery({
    queryKey: ["story", id],
    queryFn: ({ signal }) => fetchStory(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useSearch(params: Omit<SearchParams, "offset" | "limit">) {
  return useInfiniteQuery({
    queryKey: ["search", params.q ?? "", params.from ?? "", params.to ?? ""],
    queryFn: ({ pageParam, signal }) => searchStories({ ...params, offset: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE),
  });
}

export function useSourceFeed(domain: string | undefined, pageSize = PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: ["source", domain, pageSize],
    queryFn: ({ pageParam, signal }) => fetchBySource(domain as string, pageParam, pageSize, signal),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < pageSize ? undefined : pages.length * pageSize),
    enabled: Boolean(domain),
  });
}

/** Debounces a value (search box). */
export function useDebounced<T>(value: T, ms = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** Social links rarely change: cache for an hour. */
export function useSocialLinks() {
  return useQuery({
    queryKey: ["social-links"],
    queryFn: ({ signal }) => fetchSocialLinks(signal),
    staleTime: 60 * 60_000,
  });
}
