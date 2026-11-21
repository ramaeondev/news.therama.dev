/** Publishers collected by the backend. The public API has no "list sources" endpoint. */
export interface SourceInfo {
  slug: string;
  name: string;
  domain: string;
  kind: "Official" | "Publisher";
  description: string;
}

export const SOURCES: readonly SourceInfo[] = [
  { slug: "openai", name: "OpenAI News", domain: "openai.com", kind: "Official", description: "Announcements and research from OpenAI." },
  { slug: "google-ai", name: "Google AI Blog", domain: "blog.google", kind: "Official", description: "AI news from Google and Google DeepMind." },
  { slug: "hugging-face", name: "Hugging Face Blog", domain: "huggingface.co", kind: "Official", description: "Open-source models, datasets and tooling." },
  { slug: "the-verge", name: "The Verge", domain: "theverge.com", kind: "Publisher", description: "AI coverage from The Verge." },
  { slug: "techcrunch", name: "TechCrunch", domain: "techcrunch.com", kind: "Publisher", description: "AI startups, funding and products." },
  { slug: "ars-technica", name: "Ars Technica", domain: "arstechnica.com", kind: "Publisher", description: "In-depth AI reporting and analysis." },
  { slug: "mit-tech-review", name: "MIT Technology Review", domain: "technologyreview.com", kind: "Publisher", description: "AI research, policy and impact." },
];

export const sourceBySlug = (slug: string) => SOURCES.find((s) => s.slug === slug);
export const sourceByDomain = (domain: string) => SOURCES.find((s) => s.domain === domain);
