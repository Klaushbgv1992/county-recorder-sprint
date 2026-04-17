import { useSearchParams } from "react-router";

/**
 * Reads `?now=<ISO-with-tz>` from the current URL and returns the
 * parsed epoch milliseconds, or `undefined` if the query parameter
 * is absent or unparseable.
 *
 * Used by the landing page to freeze the <CountyHeartbeat/> clock
 * for Preview MCP screenshots and guided-walkthrough demos, e.g.
 * `/?now=2026-04-09T14:00:00-07:00`. Fails closed: any parse error
 * yields undefined, which falls back to the live clock.
 *
 * Kept at the page level (not inside CountyHeartbeat) so the
 * component's public surface remains `now?: number` and nothing else.
 */
export function useNowOverrideFromSearchParams(): number | undefined {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get("now");
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}
