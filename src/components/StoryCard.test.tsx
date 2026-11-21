import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoryCard } from "@/components/StoryCard";
import { EmptyState, ErrorPanel } from "@/components/States";
import type { StoryWithSources } from "@/types/news";

const story: StoryWithSources = {
  id: "11111111-1111-1111-1111-111111111111",
  headline: "OpenAI ships a new model",
  description: "A short description.",
  summary: null,
  story_type: "news",
  importance_score: null,
  first_published_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  last_updated_at: null,
  source_count: 1,
  sources: [{
    story_id: "11111111-1111-1111-1111-111111111111", article_id: "a", title: "OpenAI ships a new model",
    original_url: "https://openai.com/index/new-model", author: null, published_at: null, source_id: "s",
    source_name: "OpenAI News", source_domain: "openai.com", relationship_type: "primary_coverage", is_primary: true,
  }],
};

const renderCard = (props: Partial<Parameters<typeof StoryCard>[0]> = {}) =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <StoryCard story={story} {...props} />
      </TooltipProvider>
    </MemoryRouter>,
  );

describe("StoryCard", () => {
  it("links the headline to the story page and shows the source and time", () => {
    renderCard();
    expect(screen.getByRole("link", { name: "OpenAI ships a new model" })).toHaveAttribute("href", `/news/${story.id}`);
    expect(screen.getByText("OpenAI News")).toBeInTheDocument();
    expect(screen.getByText("2h ago")).toBeInTheDocument();
    expect(screen.getByText("A short description.")).toBeInTheDocument();
  });

  it("opens the publisher in a new tab safely", () => {
    renderCard();
    const ext = screen.getByRole("link", { name: /read at openai news/i });
    expect(ext).toHaveAttribute("href", "https://openai.com/index/new-model");
    expect(ext).toHaveAttribute("target", "_blank");
    expect(ext).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("highlights search terms", () => {
    const { container } = renderCard({ query: "model" });
    expect(container.querySelector("mark")?.textContent).toBe("model");
  });
});

describe("states", () => {
  it("error panel offers retry", () => {
    render(<ErrorPanel onRetry={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("temporarily unavailable");
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
  it("empty state shows title", () => {
    render(<EmptyState title="No stories yet" />);
    expect(screen.getByText("No stories yet")).toBeInTheDocument();
  });
});
