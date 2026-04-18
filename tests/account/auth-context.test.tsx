import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AuthProvider, useAuth } from "../../src/account/AuthContext";

function Probe() {
  const { user, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="state">{user ? "IN" : "OUT"}</span>
      {user && <span data-testid="name">{user.display_name}</span>}
      <button onClick={() => signIn()}>sign-in</button>
      <button onClick={() => signOut()}>sign-out</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("starts signed out", () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId("state")).toHaveTextContent("OUT");
  });

  it("signs in and persists across remount", () => {
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>);
    act(() => screen.getByText("sign-in").click());
    expect(screen.getByTestId("name")).toHaveTextContent("Jordan Rivera");
    unmount();
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId("state")).toHaveTextContent("IN");
  });

  it("signs out and clears state", () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => screen.getByText("sign-in").click());
    act(() => screen.getByText("sign-out").click());
    expect(screen.getByTestId("state")).toHaveTextContent("OUT");
  });
});
