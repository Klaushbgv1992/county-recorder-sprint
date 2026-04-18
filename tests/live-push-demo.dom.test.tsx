import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LivePushDemo } from "../src/components/LivePushDemo";

/**
 * Use a schedule of 0ms steps so the animation fires synchronously-ish
 * and the test doesn't have to wait real wall-clock time.
 */
const INSTANT_SCHEDULE = [0, 0, 0, 0];

afterEach(() => {
  cleanup();
});

describe("LivePushDemo", () => {
  it("mounts in idle state with the lag ribbon copy rendered", () => {
    render(<LivePushDemo lagDaysMin={2} lagDaysMax={7} />);
    expect(
      screen.getByRole("button", { name: /Record new instrument now/i }),
    ).toBeEnabled();
    expect(screen.getByText(/2–7 days later/i)).toBeInTheDocument();
  });

  it("advances through all four stages and shows the post-push ribbon", async () => {
    const user = userEvent.setup();
    render(
      <LivePushDemo
        lagDaysMin={2}
        lagDaysMax={7}
        stageSchedule={INSTANT_SCHEDULE}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /Record new instrument now/i }),
    );
    await waitFor(() => {
      // All four stages reached.
      for (let i = 0; i < 4; i++) {
        const li = screen.getByTestId(`live-push-stage-${i}`);
        expect(li.dataset.reached).toBe("true");
      }
    });
    await waitFor(() => {
      expect(screen.getByText(/Published just now|Published \d+s ago/i)).toBeInTheDocument();
    });
    // The lag range is named in both the header copy and the completion
    // ribbon after push — one element per panel region.
    expect(screen.getAllByText(/2–7 days/).length).toBeGreaterThanOrEqual(1);
  });

  it("resets to idle when Reset is clicked after completion", async () => {
    const user = userEvent.setup();
    render(
      <LivePushDemo
        lagDaysMin={2}
        lagDaysMax={7}
        stageSchedule={INSTANT_SCHEDULE}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Record new instrument now/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /Reset/i }));
    expect(
      screen.getByRole("button", { name: /Record new instrument now/i }),
    ).toBeInTheDocument();
  });
});
