import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BulkBar } from "@/components/admin/BulkBar";

const setup = (props: Partial<Parameters<typeof BulkBar>[0]> = {}) => {
  const onAction = vi.fn();
  const onClear = vi.fn();
  render(<BulkBar status="pending_review" count={3} busy={false} onAction={onAction} onClear={onClear} {...props} />);
  return { onAction, onClear };
};

describe("BulkBar", () => {
  it("renders nothing without a selection", () => {
    const { container } = render(<BulkBar status="pending_review" count={0} busy={false} onAction={vi.fn()} onClear={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the selection count and applies the tab's transitions", () => {
    const { onAction } = setup();
    expect(screen.getByRole("region", { name: "Bulk actions" })).toHaveTextContent("3 selected");
    fireEvent.click(screen.getByRole("button", { name: /publish 3/i }));
    expect(onAction).toHaveBeenCalledWith("published");
    fireEvent.click(screen.getByRole("button", { name: /reject 3/i }));
    expect(onAction).toHaveBeenCalledWith("rejected");
  });

  it("offers unpublish on the published tab and clears the selection", () => {
    const { onAction, onClear } = setup({ status: "published", count: 2 });
    fireEvent.click(screen.getByRole("button", { name: /unpublish 2/i }));
    expect(onAction).toHaveBeenCalledWith("archived");
    expect(screen.queryByRole("button", { name: /^publish 2$/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it("disables every action while the batch runs", () => {
    setup({ busy: true });
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });
});
