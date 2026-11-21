export type StoryType =
  | "announcement" | "product_release" | "model_release" | "research" | "funding"
  | "business" | "policy" | "security" | "analysis" | "news" | "other";

/** Row of ai_news.v_published_stories (the public news item). */
export interface Story {
  id: string;
  headline: string;
  description: string | null;
  summary: string | null;
  story_type: StoryType;
  importance_score: number | null;
  /** Publisher publication time: sort and display by this. */
  first_published_at: string | null;
  last_updated_at: string | null;
  /** Time it went live on this site (only present when selected). */
  published_at?: string;
  source_count: number;
  /** Publisher's own image (linked, not stored). */
  image_url?: string | null;
  image_attribution?: string | null;
  /** AI summary details (present when `summary` is). */
  summary_takeaways?: string[] | null;
  summary_model?: string | null;
  summary_generated_at?: string | null;
  /** One-line significance (DeepSeek summaries only). */
  summary_why_it_matters?: string | null;
}

export type TagKind = "company" | "tool" | "category";

/** Row of ai_news.v_published_story_tags. */
export interface StoryTag {
  story_id: string;
  kind: TagKind;
  slug: string;
  name: string;
  is_primary: boolean;
}

/** Row of ai_news.v_taxonomy (filter options). */
export interface TaxonomyItem {
  kind: TagKind;
  slug: string;
  name: string;
  story_count: number;
}

/** Row of ai_news.v_story_redirects (publisher article behind a story). */
export interface StorySource {
  story_id: string;
  article_id: string;
  title: string;
  original_url: string;
  author: string | null;
  published_at: string | null;
  source_id: string;
  source_name: string;
  source_domain: string;
  relationship_type: "primary_coverage" | "independent_coverage" | "follow_up" | "correction" | "related";
  is_primary: boolean;
}

export interface StoryWithSources extends Story {
  sources: StorySource[];
  tags: StoryTag[];
}

export interface FeedCursor {
  t: string;
  id: string;
}
