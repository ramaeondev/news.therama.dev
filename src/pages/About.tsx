import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { SOURCES } from "@/config/sources";
import { SocialLinks } from "@/components/SocialLinks";

export default function About() {
  return (
    <div className="prose prose-zinc mx-auto max-w-2xl dark:prose-invert">
      <Seo title="About" description="How therama AI News collects and presents AI news." path="/about" />
      <h1>About therama AI News</h1>
      <p>
        therama AI News is a single, fast feed of what's happening in artificial intelligence: model releases,
        product launches, research, funding and policy.
      </p>
      <h2>How it works</h2>
      <p>
        Stories are collected automatically, around the clock, from {SOURCES.length} sources: official AI company blogs
        and established technology publications (see <Link to="/sources">Sources</Link>). New stories usually appear
        within minutes of being published.
      </p>
      <h2>Attribution</h2>
      <p>
        We show each story's original headline and the publisher's short description, and always link to the original
        article. We don't republish full articles. Headlines and descriptions belong to their publishers.
      </p>
      <h2>AI summaries</h2>
      <p>When a story shows an "AI summary", it was generated automatically. Always read the original for full details.</p>
      <h2>Contact</h2>
      <p>
        Built by <a href="https://therama.dev" target="_blank" rel="noopener noreferrer">therama.dev</a>. Find us on:
      </p>
      <SocialLinks className="not-prose" />
    </div>
  );
}
