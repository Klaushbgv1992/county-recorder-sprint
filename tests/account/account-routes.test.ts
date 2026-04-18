import { describe, it, expect } from "vitest";
import { routes } from "../../src/router";

function flatten(rs: typeof routes, prefix = ""): string[] {
  const out: string[] = [];
  for (const r of rs) {
    const here = r.path ? `${prefix}/${r.path}`.replace(/\/+/g, "/") : prefix;
    if (r.path) out.push(here);
    if (r.children) out.push(...flatten(r.children, here));
  }
  return out;
}

describe("account routes", () => {
  it("registers all /account/* sub-routes", () => {
    const paths = flatten(routes);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/account",
        "/account/watchlist",
        "/account/inbox",
        "/account/preferences",
        "/account/notices",
        "/account/records-request",
        "/account/commitments",
      ]),
    );
  });
});
