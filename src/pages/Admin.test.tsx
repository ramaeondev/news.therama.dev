import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import type { AdminStory } from "@/lib/adminApi";

const mocks = vi.hoisted(() => ({
  fetchAdminStories: vi.fn(),
  fetchAllStoryIds: vi.fn(),
  fetchStatusCounts: vi.fn(),
  fetchMergeSuggestionCount: vi.fn(),
  setStoriesStatus: vi.fn(),
  setStoryStatus: vi.fn(),
  resummarizeStory: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("@/lib/adminApi", () => {
  class AuthRequiredError extends Error {}
  return {
    AuthRequiredError,
    fetchAdminStories: mocks.fetchAdminStories,
    fetchAllStoryIds: mocks.fetchAllStoryIds,
    fetchStatusCounts: mocks.fetchStatusCounts,
    fetchMergeSuggestionCount: mocks.fetchMergeSuggestionCount,
    setStoriesStatus: mocks.setStoriesStatus,
    setStoryStatus: mocks.setStoryStatus,
    resummarizeStory: mocks.resummarizeStory,
  };
});
vi.mock("@/lib/auth", () => ({
  loadSession: () => ({ access_token: "t", refresh_token: "r", expires_at: 9e9 }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: mocks.toastSuccess, warning: mocks.toastWarning, error: vi.fn(), info: vi.fn() }),
}));

const { default: Admin } = await import("@/pages/Admin");

const story = (i: number, status: AdminStory["publication_status"] = "pending_review"): AdminStory => ({
  id: `s${i}`,
  headline: `Story ${i}`,
  description: null,
  publication_status: status,
  first_published_at: null,
  published_at: null,
  created_at: "2026-11-01T00:00:00Z",
  article_id: null,
  original_url: null,
  author: null,
  source_name: null,
  source_domain: null,
  source_trust_score: null,
  last_review_status: null,
  last_reviewed_at: null,
});

const renderAdmin = () =>
  render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Admin />
      </QueryClientProvider>
    </HelmetProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchAdminStories.mockResolvedValue([story(1), story(2), story(3)]);
  mocks.fetchStatusCounts.mockResolvedValue({ pending_review: 3, published: 0, rejected: 0, archived: 0 });
  mocks.fetchMergeSuggestionCount.mockResolvedValue(0);
  mocks.setStoriesStatus.mockImplementation((ids: string[]) => Promise.resolve({ succeeded: ids, failed: [] }));
});

describe("admin bulk actions", () => {
  it("asks for confirmation before publishing a batch", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole("checkbox", { name: "Select Story 1" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Story 3" }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /publish 2/i }));

    // Nothing is sent until the dialog is confirmed.
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Publish these stories?");
    expect(mocks.setStoriesStatus).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(mocks.setStoriesStatus).toHaveBeenCalledWith(["s1", "s3"], "published"));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Published 2 stories");
    expect(screen.queryByText(/selected/)).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancels a batch without changing anything", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole("checkbox", { name: "Select Story 1" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Story 2" }));
    await user.click(screen.getByRole("button", { name: /reject 2/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Reject these stories?");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.setStoriesStatus).not.toHaveBeenCalled();
    // The selection survives so the admin can pick a different action.
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("does not ask twice when a single story is selected", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole("checkbox", { name: "Select Story 1" }));
    await user.click(screen.getByRole("button", { name: /publish 1/i }));

    await waitFor(() => expect(mocks.setStoriesStatus).toHaveBeenCalledWith(["s1"], "published"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("selects every loaded story from the header checkbox", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole("checkbox", { name: /select all loaded \(3\)/i }));
    expect(screen.getByText("3 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reject 3/i }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(mocks.setStoriesStatus).toHaveBeenCalledWith(["s1", "s2", "s3"], "rejected"));
  });

  it("clears the selection", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole("checkbox", { name: "Select Story 2" }));
    await user.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(screen.queryByText(/selected/)).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Select Story 2" })).not.toBeChecked();
  });

  it("can select a whole tab that is longer than the loaded page", async () => {
    mocks.fetchStatusCounts.mockResolvedValue({ pending_review: 5, published: 0, rejected: 0, archived: 0 });
    mocks.fetchAllStoryIds.mockResolvedValue(["s1", "s2", "s3", "s4", "s5"]);
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole("button", { name: /select all 5/i }));
    await waitFor(() => expect(mocks.fetchAllStoryIds).toHaveBeenCalledWith("pending_review"));
    expect(screen.getByText("5 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /publish 5/i }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Publish" }));
    await waitFor(() =>
      expect(mocks.setStoriesStatus).toHaveBeenCalledWith(["s1", "s2", "s3", "s4", "s5"], "published"),
    );
  });

  it("keeps the dialog open with progress while the batch runs", async () => {
    let finish: (v: { succeeded: string[]; failed: { id: string; message: string }[] }) => void = () => {};
    mocks.setStoriesStatus.mockImplementation(
      () => new Promise((resolve) => { finish = resolve; }),
    );
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole("checkbox", { name: "Select Story 1" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Story 2" }));
    await user.click(screen.getByRole("button", { name: /publish 2/i }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Publish" }));

    const running = await screen.findByRole("button", { name: /publishing/i });
    expect(running).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    finish({ succeeded: ["s1", "s2"], failed: [] });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps failed stories selected so the batch can be retried", async () => {
    mocks.setStoriesStatus.mockResolvedValue({ succeeded: ["s1"], failed: [{ id: "s2", message: "API 500: boom" }] });
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole("checkbox", { name: /select all loaded \(3\)/i }));
    await user.click(screen.getByRole("button", { name: /publish 3/i }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(mocks.toastWarning).toHaveBeenCalledWith(expect.stringContaining("1 of 3")));
    expect(screen.getByRole("checkbox", { name: "Select Story 2" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Story 1" })).not.toBeChecked();
  });
});
