import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmStatusDialog } from "@/components/admin/ConfirmStatusDialog";

const setup = (props: Partial<Parameters<typeof ConfirmStatusDialog>[0]> = {}) => {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ConfirmStatusDialog count={3} status="pending_review" target="published" busy={false} onConfirm={onConfirm} onOpenChange={onOpenChange} {...props} />,
  );
  return { onConfirm, onOpenChange };
};

describe("ConfirmStatusDialog", () => {
  it("stays closed when nothing is pending", () => {
    render(<ConfirmStatusDialog count={null} status="pending_review" target="published" busy={false} onConfirm={vi.fn()} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("names the action and the batch size before publishing", () => {
    const { onConfirm } = setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Publish these stories?");
    expect(dialog).toHaveTextContent("visible on the public site straight away");
    expect(dialog).toHaveTextContent("You are about to publish 3 stories.");
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("uses singular wording for one story", () => {
    setup({ count: 1 });
    expect(screen.getByRole("dialog")).toHaveTextContent("Publish this story?");
  });

  it("explains the unpublished consequence and confirms", () => {
    const { onConfirm } = setup({ status: "published", target: "archived" });
    expect(screen.getByRole("dialog")).toHaveTextContent("Unpublish these stories?");
    fireEvent.click(screen.getByRole("button", { name: "Unpublish" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("offers a cancel that closes without confirming", () => {
    const { onConfirm, onOpenChange } = setup({ target: "rejected" });
    expect(screen.getByRole("dialog")).toHaveTextContent("Reject these stories?");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("locks the buttons while the batch runs", () => {
    setup({ busy: true });
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /publishing/i })).toBeDisabled();
  });
});
