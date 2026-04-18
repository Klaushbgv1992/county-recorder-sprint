# Demo Account Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## Terminal Agent Handoff

**You are a Claude Code agent running in a CLI terminal, in parallel with three other agents working on the same repository.** This plan is fully self-contained. Do not ask the user for context — everything you need is here or in `CLAUDE.md` at the repo root.

### Bootstrap steps before starting Task 1

1. Confirm you are at the repo root: `C:\Users\Klaus\county-recorder-sprint` (you may be in a parent worktree — that's fine, move to the repo root if needed).
2. Read `CLAUDE.md` at the repo root. Pay attention to the Decision Log entries #36 (deep-linkable routing), #42 (Commitment Export), #43 (CountyHeartbeat), and the Hard Constraints block. You do not need to re-derive any of that.
3. Create a fresh worktree and branch for this work:
   ```bash
   git worktree add .claude/worktrees/feat-account-portal -b feat/demo-account-portal main
   cd .claude/worktrees/feat-account-portal
   npm install
   npx vitest run --reporter=dot  # baseline — know which tests pass before you start
   ```
4. From now on, all commands run inside `.claude/worktrees/feat-account-portal`.

### Parallel agents — file ownership

Three other worktrees are active. Avoid their files; where unavoidable, use the non-conflicting placement instructions below.

| Agent | Branch | Owns | Do not modify |
|---|---|---|---|
| Live AI Extract | `feat/live-ai-extract` | `src/components/AiExtract*`, new API route, `src/components/ChainSwimlane.tsx` integration | `src/components/ChainSwimlane.tsx`, `src/components/ChainOfTitle.tsx` swimlane region, `src/components/ProofDrawer.tsx` body region |
| Homeowner Landing | `feat/homeowner-landing` | `src/components/LandingPage.tsx` hero, `src/components/story/*`, `<Term>` | `src/components/LandingPage.tsx`, `src/components/story/StoryPage.tsx` |
| Party Search Hero | `feat/party-search-hero` | `LandingPage.tsx` feature card slot, walkthrough step, `/party/` empty state body | `src/components/LandingPage.tsx`, walkthrough step components, `PartyPage.tsx` body |

**Your work touches these shared files; here is how to keep merges painless:**

- `src/components/RootLayout.tsx` — wrap existing children in `<AuthProvider>` and insert `<HeaderBar/>` *above* the existing `<PipelineBanner/>`. Do not restructure the existing h-screen flex layout; add, don't move.
- `src/components/ProofDrawer.tsx` — Task 19 adds `<FlagInstrumentButton/>` in the drawer's header action row. Use the exact anchor pattern in Task 19; do not touch the body.
- `src/components/ChainOfTitle.tsx` — Task 20 adds a small actions cluster (Star + Correction) in the *parcel header* area (top of the page, near APN/address). Keep the actions cluster as a single new element; do not refactor adjacent markup.
- `src/components/PartyPage.tsx` — Task 20 adds a `<StarButton kind="party"/>` next to the party name in the heading. Single additive node only.
- `src/components/CuratorQueue.tsx` — Task 21 inserts one section above the existing list. Purely additive.

**You do not touch `LandingPage.tsx` at all.**

### Ship quality bar

- Every task is TDD: write the failing test first, implement, run tests, commit.
- No raw `<input type="checkbox">` or `<select>` for primary UI — use the custom `<Switch/>`, `<Select/>` primitives from Task 1. Secondary forms (modal reasons) may use native controls.
- Every "demo-only" surface mounts `<PreviewPill/>`. If you skip a pill, it is a bug.
- Every interactive surface has a `focus-visible` ring and a hover state.
- All interactive icons are inline SVG (Task 1). No new npm deps.
- Commits are small (one task = one commit) and use the `feat(account):` or `test(account):` prefix.
- Before the final commit, run `npm run test` once and `npm run build` once. If either fails, fix the root cause — do not weaken tests or disable rules.

### Branch & PR

- Branch: `feat/demo-account-portal`.
- Do NOT open a PR or merge to `main`. When all tasks are checked, post a short summary and stop. The sprint owner will do final integration after the other three agents land.

---

**Goal:** Ship a demo-functioning, clearly-labeled user account portal with a modern, polished UI. Retention mechanics (bookmarks, notifications, flagging, statutory-notice inbox, correction and records requests) wrap around the existing examiner product without any real auth/email/SMS infrastructure.

**Architecture:** A small internal design system (`<Card/>`, `<Switch/>`, `<Chip/>`, `<Dialog/>`, `<Toast/>`, `<Avatar/>`, `<Icon/>`) built from Tailwind primitives and pure React — zero new npm dependencies. A fake `AuthContext` persisted to localStorage drives a single hardcoded demo user. State — watchlist, inbox read/unread, flag submissions, correction requests, commitments history, recently-viewed — lives in localStorage via dedicated hooks. Notifications and statutory notices are pre-seeded fixtures filtered at render time by the user's watchlist. Every fake surface renders a `<PreviewPill/>`. Flagged items and FOIA requests write to localStorage AND are picked up by the existing `/staff/queue` curator workbench, closing a real UI loop visible in the demo. New routes nest under `/account/*` and share an `AccountLayout` shell separate from `AppShell`.

**Tech Stack:** React 19, react-router v7, Tailwind v4, vitest + @testing-library/react, localStorage for persistence.

---

## File Structure

**Design system (Task 1):**
- `src/components/ui/Card.tsx`
- `src/components/ui/Switch.tsx`
- `src/components/ui/Chip.tsx`
- `src/components/ui/Dialog.tsx`
- `src/components/ui/Avatar.tsx`
- `src/components/ui/Icon.tsx`
- `src/components/ui/Toast.tsx`
- `src/components/ui/EmptyState.tsx`

**Foundation state (Tasks 2–8):**
- `src/account/AuthContext.tsx`
- `src/account/useWatchlist.ts`
- `src/account/useRecentlyViewed.ts`
- `src/account/useNotifications.ts`
- `src/account/useFlaggedItems.ts`
- `src/account/useCorrectionRequests.ts`
- `src/account/useRecordsRequests.ts`
- `src/account/useCommitmentHistory.ts`

**Chrome (Tasks 9–12):**
- `src/components/account/PreviewPill.tsx`
- `src/components/account/SignInButton.tsx`
- `src/components/account/NotificationBell.tsx`
- `src/components/account/AccountMenu.tsx`
- `src/components/account/StarButton.tsx`
- `src/components/HeaderBar.tsx`
- modify `src/components/RootLayout.tsx`

**Account pages (Tasks 13–18):**
- `src/components/account/AccountLayout.tsx`
- `src/components/account/AccountDashboard.tsx`
- `src/components/account/AccountWatchlist.tsx`
- `src/components/account/AccountInbox.tsx`
- `src/components/account/AccountPreferences.tsx`
- `src/components/account/AccountStatutoryNotices.tsx`
- `src/components/account/AccountRecordsRequest.tsx`
- `src/components/account/AccountCommitments.tsx`

**Cross-surface affordances (Tasks 19–20):**
- `src/components/account/FlagInstrumentButton.tsx`
- `src/components/account/CorrectionRequestButton.tsx`
- modify `src/components/ProofDrawer.tsx`, `src/components/ChainOfTitle.tsx`, `src/components/PartyPage.tsx`

**Wire-up (Tasks 21–24):**
- modify `src/router.tsx`
- modify `src/components/CuratorQueue.tsx`
- modify `src/components/SubscribePlaceholder.tsx`
- `docs/account-portal-demo.md`

**Fixtures:**
- `src/data/account/demo-user.json`
- `src/data/account/seed-notifications.json`
- `src/data/account/seed-statutory-notices.json`

---

## Task 1: UI Primitives Library

Modern, cohesive UI starts with a shared primitives layer so every page feels the same. No new dependencies — pure Tailwind + React.

**Files:**
- Create: `src/components/ui/Icon.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Chip.tsx`
- Create: `src/components/ui/Switch.tsx`
- Create: `src/components/ui/Avatar.tsx`
- Create: `src/components/ui/Dialog.tsx`
- Create: `src/components/ui/Toast.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Test: `tests/ui/primitives.dom.test.tsx`

- [x] **Step 1: Write Icon component**

```tsx
// src/components/ui/Icon.tsx
// Small curated set of inline SVG icons. Stroked 1.5, 20×20, currentColor.
// No external deps. Add new icons here as pages need them.

import type { SVGProps } from "react";

const PATHS: Record<string, string> = {
  star: "M12 3l2.7 6 6.3.9-4.5 4.4 1 6.2L12 17.8 6.5 20.5l1-6.2L3 9.9l6.3-.9z",
  bell: "M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16zM10 20a2 2 0 0 0 4 0",
  check: "M5 12l4 4 10-10",
  flag: "M5 21V4h12l-2 4 2 4H5",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  arrowRight: "M5 12h14M13 5l7 7-7 7",
  sparkle: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z",
  inbox: "M4 13l2-7h12l2 7M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
  file: "M7 3h7l5 5v13H7zM14 3v5h5",
  gear: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM19.4 12l1.6-1-2-3.5-1.8.7a7 7 0 0 0-1.7-1L15 5h-4l-.5 2.2a7 7 0 0 0-1.7 1l-1.8-.7-2 3.5L6.6 12l-1.6 1 2 3.5 1.8-.7a7 7 0 0 0 1.7 1L11 19h4l.5-2.2a7 7 0 0 0 1.7-1l1.8.7 2-3.5z",
  gavel: "M14 2l6 6-3 3-6-6zM11 5L4 12l3 3 7-7M9 17l-5 5M14 22l5-5",
  building: "M4 21V6l8-3 8 3v15M9 10h2M13 10h2M9 14h2M13 14h2M9 18h2M13 18h2",
  star_filled: "M12 2l2.9 6.5 7.1 1-5.2 5 1.2 7L12 18.3 6 21.5l1.2-7L2 9.5l7.1-1z",
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: keyof typeof PATHS;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 20, filled = false, ...rest }: IconProps) {
  const key = filled && PATHS[`${name}_filled`] ? `${name}_filled` : name;
  const d = PATHS[key] ?? PATHS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}
```

- [x] **Step 2: Write Card component**

```tsx
// src/components/ui/Card.tsx
import type { ReactNode } from "react";

export function Card({
  children,
  interactive,
  className = "",
}: {
  children: ReactNode;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
        interactive
          ? "transition-all duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-slate-300"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-start justify-between gap-3 px-5 pt-4 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 pb-4 pt-3 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-3 border-t border-slate-100 text-xs text-slate-600 ${className}`}>
      {children}
    </div>
  );
}
```

- [x] **Step 3: Write Chip component**

```tsx
// src/components/ui/Chip.tsx
import type { ReactNode } from "react";

type Tone = "neutral" | "moat" | "warn" | "danger" | "success" | "info";

const TONE: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  moat: "bg-moat-50 text-moat-800 ring-moat-200",
  warn: "bg-amber-50 text-amber-900 ring-amber-200",
  danger: "bg-red-50 text-red-800 ring-red-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
};

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
```

- [x] **Step 4: Write Switch component**

```tsx
// src/components/ui/Switch.tsx
interface Props {
  id: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  sub?: string;
  disabled?: boolean;
}

export function Switch({ id, checked, onChange, label, sub, disabled }: Props) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start justify-between gap-4 py-2 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {sub && <span className="mt-0.5 block text-xs text-slate-500">{sub}</span>}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
        />
        <span
          aria-hidden
          className={`block h-5 w-9 rounded-full transition-colors ${
            checked ? "bg-moat-700" : "bg-slate-300"
          } peer-focus-visible:ring-2 peer-focus-visible:ring-moat-500 peer-focus-visible:ring-offset-2`}
        />
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </label>
  );
}
```

- [x] **Step 5: Write Avatar component**

```tsx
// src/components/ui/Avatar.tsx
const GRADIENTS = [
  "from-moat-500 to-moat-700",
  "from-sky-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  size = 28,
}: {
  name: string;
  size?: number;
}) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  const grad = GRADIENTS[hash(name) % GRADIENTS.length];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${grad} text-white font-semibold ring-1 ring-white/60 shadow-sm`}
      style={{ width: size, height: size, fontSize: Math.floor(size * 0.42) }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
```

- [x] **Step 6: Write Dialog component**

```tsx
// src/components/ui/Dialog.tsx
import { useEffect, useRef, type ReactNode } from "react";

export function Dialog({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sz = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_120ms_ease-out]"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`w-full ${sz} rounded-2xl bg-white shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-moat-500 animate-[slideUp_160ms_cubic-bezier(0.16,1,0.3,1)]`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
              aria-label="Close"
            >
              ✕
            </button>
          </header>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
```

Add these keyframes to `src/index.css` (find the existing `@theme` / `@layer` region; append at the end of the file):

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

- [x] **Step 7: Write Toast component**

```tsx
// src/components/ui/Toast.tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ToastItem {
  id: string;
  title: string;
  body?: string;
  tone: "success" | "info" | "warn";
}

interface ToastValue {
  show: (t: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((t: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setItems((s) => [...s, { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto min-w-[280px] max-w-sm rounded-lg border px-4 py-3 shadow-lg animate-[slideUp_160ms_cubic-bezier(0.16,1,0.3,1)] ${
              t.tone === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : t.tone === "warn"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
            role="status"
          >
            <div className="text-sm font-semibold">{t.title}</div>
            {t.body && <div className="mt-0.5 text-xs opacity-80">{t.body}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
```

- [x] **Step 8: Write EmptyState component**

```tsx
// src/components/ui/EmptyState.tsx
import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function EmptyState({
  icon = "inbox",
  title,
  body,
  action,
}: {
  icon?: Parameters<typeof Icon>[0]["name"];
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
        <Icon name={icon} size={18} />
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {body && <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [x] **Step 9: Write the primitives smoke test**

```tsx
// tests/ui/primitives.dom.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { Card, CardBody, CardHeader } from "../../src/components/ui/Card";
import { Chip } from "../../src/components/ui/Chip";
import { Switch } from "../../src/components/ui/Switch";
import { Avatar } from "../../src/components/ui/Avatar";
import { Dialog } from "../../src/components/ui/Dialog";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { Icon } from "../../src/components/ui/Icon";

describe("UI primitives", () => {
  afterEach(() => cleanup());

  it("Card renders header and body", () => {
    render(
      <Card>
        <CardHeader>H</CardHeader>
        <CardBody>B</CardBody>
      </Card>,
    );
    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("Chip renders with tone classes", () => {
    render(<Chip tone="moat">Custodian</Chip>);
    expect(screen.getByText("Custodian")).toBeInTheDocument();
  });

  it("Switch toggles via click", async () => {
    let checked = false;
    const { rerender } = render(
      <Switch id="s" label="Email" checked={checked} onChange={() => {}} />,
    );
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    checked = true;
    rerender(<Switch id="s" label="Email" checked={checked} onChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("Avatar renders the first letter of the name", () => {
    render(<Avatar name="Jordan" />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("Dialog closes on Escape", async () => {
    let open = true;
    const onClose = () => { open = false; };
    render(
      <Dialog open={open} onClose={onClose} title="Test">
        <p>body</p>
      </Dialog>,
    );
    await userEvent.keyboard("{Escape}");
    expect(open).toBe(false);
  });

  it("EmptyState renders icon + title + body", () => {
    render(<EmptyState title="Empty" body="No items" />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("Icon renders an SVG by name", () => {
    const { container } = render(<Icon name="star" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
```

- [x] **Step 10: Run tests, verify pass**

Run: `npx vitest run tests/ui/primitives.dom.test.tsx`
Expected: PASS, 7 tests.

If any tone/color classes fail to compile under Tailwind v4 (e.g. `moat-50`), check `src/index.css` for the active `@theme` block and use only colors defined there. The codebase already uses `moat-*` and `recorder-*` tokens, so they should be live — confirm with a grep if a specific shade is missing.

- [x] **Step 11: Commit**

```bash
git add src/components/ui/*.tsx src/index.css tests/ui/primitives.dom.test.tsx
git commit -m "feat(ui): shared primitives — Card/Chip/Switch/Avatar/Dialog/Toast/EmptyState/Icon"
```

---

## Task 2: AuthContext + Demo User Fixture

**Files:**
- Create: `src/data/account/demo-user.json`
- Create: `src/account/AuthContext.tsx`
- Test: `tests/account/auth-context.test.tsx`

- [x] **Step 1: Create the demo-user fixture**

```json
{
  "id": "demo-user-001",
  "display_name": "Jordan Rivera",
  "email": "jordan.rivera@example.com",
  "phone_masked": "(***) ***-4417",
  "joined_date": "2025-11-02",
  "note": "Demo user. Faked for prototype. Production uses real OAuth."
}
```

File: `src/data/account/demo-user.json`.

- [x] **Step 2: Write the failing test**

```tsx
// tests/account/auth-context.test.tsx
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
```

- [x] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/account/auth-context.test.tsx`
Expected: FAIL — module `src/account/AuthContext` not found.

- [x] **Step 4: Implement AuthContext**

```tsx
// src/account/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import demoUser from "../data/account/demo-user.json";

export interface DemoUser {
  id: string;
  display_name: string;
  email: string;
  phone_masked: string;
  joined_date: string;
}

interface AuthValue {
  user: DemoUser | null;
  signIn: () => void;
  signOut: () => void;
}

const STORAGE_KEY = "mcr.account.signedIn.v1";
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    try {
      if (signedIn) localStorage.setItem(STORAGE_KEY, "1");
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* noop */ }
  }, [signedIn]);

  return (
    <AuthContext.Provider
      value={{
        user: signedIn ? (demoUser as DemoUser) : null,
        signIn: () => setSignedIn(true),
        signOut: () => setSignedIn(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
```

- [x] **Step 5: Run tests, verify pass**

Run: `npx vitest run tests/account/auth-context.test.tsx`
Expected: PASS, 3 tests.

- [x] **Step 6: Commit**

```bash
git add src/data/account/demo-user.json src/account/AuthContext.tsx tests/account/auth-context.test.tsx
git commit -m "feat(account): AuthContext with demo user persistence"
```

---

## Task 3: useWatchlist Hook

**Files:**
- Create: `src/account/useWatchlist.ts`
- Test: `tests/account/use-watchlist.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/use-watchlist.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWatchlist } from "../../src/account/useWatchlist";

describe("useWatchlist", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", () => {
    const { result } = renderHook(() => useWatchlist());
    expect(result.current.parcels).toEqual([]);
    expect(result.current.parties).toEqual([]);
  });

  it("toggles parcels idempotently", () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => result.current.toggleParcel("304-78-386"));
    expect(result.current.isParcelWatched("304-78-386")).toBe(true);
    act(() => result.current.toggleParcel("304-78-386"));
    expect(result.current.isParcelWatched("304-78-386")).toBe(false);
  });

  it("persists across remounts", () => {
    const first = renderHook(() => useWatchlist());
    act(() => first.result.current.toggleParcel("304-78-386"));
    act(() => first.result.current.toggleParty("wells-fargo"));
    first.unmount();
    const second = renderHook(() => useWatchlist());
    expect(second.result.current.parcels).toEqual(["304-78-386"]);
    expect(second.result.current.parties).toEqual(["wells-fargo"]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/use-watchlist.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement useWatchlist**

```ts
// src/account/useWatchlist.ts
import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.watchlist.v1";

interface State {
  parcels: string[];
  parties: string[];
}

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { parcels: [], parties: [] };
    const parsed = JSON.parse(raw);
    return {
      parcels: Array.isArray(parsed.parcels) ? parsed.parcels : [],
      parties: Array.isArray(parsed.parties) ? parsed.parties : [],
    };
  } catch {
    return { parcels: [], parties: [] };
  }
}

export function useWatchlist() {
  const [state, setState] = useState<State>(() => read());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* noop */ }
  }, [state]);

  const toggleParcel = useCallback((apn: string) => {
    setState((s) => ({
      ...s,
      parcels: s.parcels.includes(apn) ? s.parcels.filter((a) => a !== apn) : [...s.parcels, apn],
    }));
  }, []);

  const toggleParty = useCallback((normalizedName: string) => {
    setState((s) => ({
      ...s,
      parties: s.parties.includes(normalizedName)
        ? s.parties.filter((n) => n !== normalizedName)
        : [...s.parties, normalizedName],
    }));
  }, []);

  const isParcelWatched = useCallback((apn: string) => state.parcels.includes(apn), [state.parcels]);
  const isPartyWatched = useCallback(
    (n: string) => state.parties.includes(n),
    [state.parties],
  );

  return { parcels: state.parcels, parties: state.parties, toggleParcel, toggleParty, isParcelWatched, isPartyWatched };
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/use-watchlist.test.tsx`
Expected: PASS, 3 tests.

- [x] **Step 5: Commit**

```bash
git add src/account/useWatchlist.ts tests/account/use-watchlist.test.tsx
git commit -m "feat(account): useWatchlist hook"
```

---

## Task 4: useRecentlyViewed Hook

**Files:**
- Create: `src/account/useRecentlyViewed.ts`
- Test: `tests/account/use-recently-viewed.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/use-recently-viewed.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecentlyViewed } from "../../src/account/useRecentlyViewed";

describe("useRecentlyViewed", () => {
  beforeEach(() => localStorage.clear());

  it("caps at 8 entries", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    for (let i = 0; i < 10; i++) {
      act(() => result.current.record({ kind: "parcel", id: `apn-${i}`, label: `APN ${i}` }));
    }
    expect(result.current.items).toHaveLength(8);
    expect(result.current.items[0].id).toBe("apn-9");
  });

  it("dedupes repeat visits by promoting to front", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => result.current.record({ kind: "parcel", id: "A", label: "A" }));
    act(() => result.current.record({ kind: "parcel", id: "B", label: "B" }));
    act(() => result.current.record({ kind: "parcel", id: "A", label: "A" }));
    expect(result.current.items.map((i) => i.id)).toEqual(["A", "B"]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/use-recently-viewed.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement useRecentlyViewed**

```ts
// src/account/useRecentlyViewed.ts
import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.recentlyViewed.v1";
const MAX = 8;

export interface RecentItem {
  kind: "parcel" | "party";
  id: string;
  label: string;
  visited_at: string;
}

function readAll(): RecentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch { return []; }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>(() => readAll());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const record = useCallback((entry: Omit<RecentItem, "visited_at">) => {
    setItems((s) => {
      const without = s.filter((x) => !(x.kind === entry.kind && x.id === entry.id));
      const next: RecentItem = { ...entry, visited_at: new Date().toISOString() };
      return [next, ...without].slice(0, MAX);
    });
  }, []);

  return { items, record };
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/use-recently-viewed.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 5: Commit**

```bash
git add src/account/useRecentlyViewed.ts tests/account/use-recently-viewed.test.tsx
git commit -m "feat(account): useRecentlyViewed with 8-entry rolling dedup"
```

---

## Task 5: Notifications Fixture + Hook

**Files:**
- Create: `src/data/account/seed-notifications.json`
- Create: `src/account/useNotifications.ts`
- Test: `tests/account/use-notifications.test.tsx`

- [x] **Step 1: Create the seed fixture**

File: `src/data/account/seed-notifications.json`.

```json
{
  "note": "Pre-seeded demo notifications. Filtered at render time by the user's watchlist.",
  "items": [
    {
      "id": "n-001",
      "kind": "new_instrument",
      "parcel_apn": "304-78-386",
      "recording_number": "20230100000",
      "title": "New instrument recorded on 3674 E Palmer St",
      "body": "ASSIGNMENT OF DEED OF TRUST filed today, naming Wells Fargo as assignee.",
      "recorded_at": "2026-04-17T10:14:00-07:00",
      "unread_by_default": true
    },
    {
      "id": "n-002",
      "kind": "watched_party",
      "party_normalized": "wells-fargo",
      "title": "Wells Fargo recorded 3 new filings this week",
      "body": "2 assignments of deed of trust and 1 reconveyance across Maricopa County.",
      "recorded_at": "2026-04-16T08:02:00-07:00",
      "unread_by_default": true
    },
    {
      "id": "n-003",
      "kind": "flag_response",
      "ref": "MCR-REPORT-2026-00714",
      "title": "Your issue report was reviewed by a curator",
      "body": "Your flag on instrument 20210075858 was triaged. Status: accepted for follow-up.",
      "recorded_at": "2026-04-15T14:40:00-07:00",
      "unread_by_default": false
    },
    {
      "id": "n-004",
      "kind": "statutory_notice",
      "parcel_apn": "304-78-386",
      "title": "Statutory notice near your watched parcel",
      "body": "A tax-sale notice was published for a neighboring parcel in Seville Parcel 3.",
      "recorded_at": "2026-04-12T09:00:00-07:00",
      "unread_by_default": true
    },
    {
      "id": "n-005",
      "kind": "digest",
      "title": "Weekly digest — 4 events on your watchlist",
      "body": "1 new deed, 2 watched-party filings, 1 statutory notice. See inbox for details.",
      "recorded_at": "2026-04-11T06:00:00-07:00",
      "unread_by_default": false
    }
  ]
}
```

- [x] **Step 2: Write the failing test**

```tsx
// tests/account/use-notifications.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotifications } from "../../src/account/useNotifications";

describe("useNotifications", () => {
  beforeEach(() => localStorage.clear());

  it("seeds with fixture items and exposes an unread count", () => {
    const { result } = renderHook(() =>
      useNotifications({ watchedParcels: ["304-78-386"], watchedParties: ["wells-fargo"] }),
    );
    expect(result.current.items.length).toBeGreaterThan(0);
    expect(result.current.unreadCount).toBeGreaterThan(0);
  });

  it("filters to items on watched parcels and parties plus universal kinds", () => {
    const { result: watchingAll } = renderHook(() =>
      useNotifications({ watchedParcels: ["304-78-386"], watchedParties: ["wells-fargo"] }),
    );
    const { result: empty } = renderHook(() =>
      useNotifications({ watchedParcels: [], watchedParties: [] }),
    );
    expect(empty.current.items.length).toBeLessThan(watchingAll.current.items.length);
    expect(empty.current.items.some((i) => i.kind === "digest")).toBe(true);
  });

  it("persists read state across remount", () => {
    const first = renderHook(() =>
      useNotifications({ watchedParcels: ["304-78-386"], watchedParties: ["wells-fargo"] }),
    );
    const before = first.result.current.unreadCount;
    act(() => first.result.current.markRead("n-001"));
    first.unmount();
    const second = renderHook(() =>
      useNotifications({ watchedParcels: ["304-78-386"], watchedParties: ["wells-fargo"] }),
    );
    expect(second.result.current.unreadCount).toBe(before - 1);
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/account/use-notifications.test.tsx`
Expected: FAIL.

- [x] **Step 4: Implement useNotifications**

```ts
// src/account/useNotifications.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import seed from "../data/account/seed-notifications.json";

export type NotificationKind =
  | "new_instrument" | "watched_party" | "flag_response" | "statutory_notice" | "digest";

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  recorded_at: string;
  parcel_apn?: string;
  party_normalized?: string;
  recording_number?: string;
  ref?: string;
  unread_by_default: boolean;
}

const KEY = "mcr.account.notifications.readIds.v1";

function readReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch { return new Set(); }
}

interface Filter {
  watchedParcels: string[];
  watchedParties: string[];
}

function matchesFilter(n: Notification, f: Filter): boolean {
  if (n.kind === "digest" || n.kind === "flag_response") return true;
  if (n.parcel_apn && f.watchedParcels.includes(n.parcel_apn)) return true;
  if (n.party_normalized && f.watchedParties.includes(n.party_normalized)) return true;
  return false;
}

export function useNotifications(filter: Filter) {
  const [readIds, setReadIds] = useState<Set<string>>(() => readReadIds());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(Array.from(readIds))); } catch { /* noop */ }
  }, [readIds]);

  const items = useMemo(
    () =>
      (seed.items as Notification[])
        .filter((n) => matchesFilter(n, filter))
        .map((n) => ({ ...n, read: readIds.has(n.id) || !n.unread_by_default }))
        .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)),
    [filter, readIds],
  );

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    setReadIds((s) => new Set([...s, id]));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(new Set(items.map((n) => n.id)));
  }, [items]);

  return { items, unreadCount, markRead, markAllRead };
}
```

- [x] **Step 5: Run tests, verify pass**

Run: `npx vitest run tests/account/use-notifications.test.tsx`
Expected: PASS, 3 tests.

- [x] **Step 6: Commit**

```bash
git add src/data/account/seed-notifications.json src/account/useNotifications.ts tests/account/use-notifications.test.tsx
git commit -m "feat(account): seeded notifications hook with watchlist filter"
```

---

## Task 6: useFlaggedItems + Curator Queue Bridge

**Files:**
- Create: `src/account/useFlaggedItems.ts`
- Test: `tests/account/use-flagged-items.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/use-flagged-items.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFlaggedItems, readAllFlaggedItemsFromStorage } from "../../src/account/useFlaggedItems";

describe("useFlaggedItems", () => {
  beforeEach(() => localStorage.clear());

  it("produces a deterministic reference pattern", () => {
    const { result } = renderHook(() => useFlaggedItems());
    let ref = "";
    act(() => {
      ref = result.current.submit({
        instrument_number: "20210075858",
        reason: "wrong grantor",
        note: "typo",
      }).ref;
    });
    expect(ref).toMatch(/^MCR-REPORT-\d{4}-\d{5}$/);
    expect(result.current.items).toHaveLength(1);
  });

  it("surfaces submissions to the staff-queue reader", () => {
    const { result } = renderHook(() => useFlaggedItems());
    act(() => {
      result.current.submit({ instrument_number: "20210075858", reason: "r", note: "" });
    });
    expect(readAllFlaggedItemsFromStorage()).toHaveLength(1);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/use-flagged-items.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement useFlaggedItems**

```ts
// src/account/useFlaggedItems.ts
import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.flaggedItems.v1";

export interface FlaggedItem {
  id: string;
  ref: string;
  instrument_number: string;
  parcel_apn?: string;
  reason: string;
  note: string;
  submitted_at: string;
  status: "pending" | "accepted" | "rejected";
}

function readAll(): FlaggedItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function readAllFlaggedItemsFromStorage(): FlaggedItem[] {
  return readAll();
}

function makeRef(id: string): string {
  const n = Array.from(id).reduce((acc, ch) => (acc + ch.charCodeAt(0)) % 100000, 0);
  return `MCR-REPORT-${new Date().getFullYear()}-${String(n).padStart(5, "0")}`;
}

export function useFlaggedItems() {
  const [items, setItems] = useState<FlaggedItem[]>(() => readAll());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const submit = useCallback(
    (input: { instrument_number: string; parcel_apn?: string; reason: string; note: string }): FlaggedItem => {
      const id = crypto.randomUUID();
      const entry: FlaggedItem = {
        id,
        ref: makeRef(id),
        instrument_number: input.instrument_number,
        parcel_apn: input.parcel_apn,
        reason: input.reason,
        note: input.note,
        submitted_at: new Date().toISOString(),
        status: "pending",
      };
      setItems((s) => [entry, ...s]);
      return entry;
    },
    [],
  );

  return { items, submit };
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/use-flagged-items.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 5: Commit**

```bash
git add src/account/useFlaggedItems.ts tests/account/use-flagged-items.test.tsx
git commit -m "feat(account): useFlaggedItems with deterministic ref numbers"
```

---

## Task 7: useCorrectionRequests + useRecordsRequests

These are structurally identical to `useFlaggedItems` — two small hooks, one test file covering both.

**Files:**
- Create: `src/account/useCorrectionRequests.ts`
- Create: `src/account/useRecordsRequests.ts`
- Test: `tests/account/request-hooks.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/request-hooks.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCorrectionRequests } from "../../src/account/useCorrectionRequests";
import { useRecordsRequests } from "../../src/account/useRecordsRequests";

describe("request hooks", () => {
  beforeEach(() => localStorage.clear());

  it("useCorrectionRequests mints MCR-CORR refs", () => {
    const { result } = renderHook(() => useCorrectionRequests());
    let ref = "";
    act(() => {
      ref = result.current.submit({
        parcel_apn: "304-78-386",
        claim: "Owner",
        correction: "Name typo",
      }).ref;
    });
    expect(ref).toMatch(/^MCR-CORR-\d{4}-\d{5}$/);
  });

  it("useRecordsRequests mints MCR-FOIA refs", () => {
    const { result } = renderHook(() => useRecordsRequests());
    let ref = "";
    act(() => {
      ref = result.current.submit({ subject: "Plat copy", details: "Book 553 Page 15" }).ref;
    });
    expect(ref).toMatch(/^MCR-FOIA-\d{4}-\d{5}$/);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/request-hooks.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement useCorrectionRequests**

```ts
// src/account/useCorrectionRequests.ts
import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.correctionRequests.v1";

export interface CorrectionRequest {
  id: string;
  ref: string;
  parcel_apn: string;
  claim: string;
  correction: string;
  submitted_at: string;
  status: "pending" | "under_review" | "resolved";
}

function readAll(): CorrectionRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CorrectionRequest[]) : [];
  } catch { return []; }
}

function makeRef(id: string): string {
  const n = Array.from(id).reduce((acc, ch) => (acc + ch.charCodeAt(0)) % 100000, 0);
  return `MCR-CORR-${new Date().getFullYear()}-${String(n).padStart(5, "0")}`;
}

export function useCorrectionRequests() {
  const [items, setItems] = useState<CorrectionRequest[]>(() => readAll());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const submit = useCallback(
    (input: { parcel_apn: string; claim: string; correction: string }): CorrectionRequest => {
      const id = crypto.randomUUID();
      const entry: CorrectionRequest = {
        id, ref: makeRef(id),
        parcel_apn: input.parcel_apn, claim: input.claim, correction: input.correction,
        submitted_at: new Date().toISOString(), status: "pending",
      };
      setItems((s) => [entry, ...s]);
      return entry;
    },
    [],
  );

  return { items, submit };
}
```

- [x] **Step 4: Implement useRecordsRequests**

```ts
// src/account/useRecordsRequests.ts
import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.recordsRequests.v1";

export interface RecordsRequest {
  id: string;
  ref: string;
  subject: string;
  details: string;
  requested_at: string;
  status: "submitted" | "in_review" | "fulfilled";
}

function readAll(): RecordsRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecordsRequest[]) : [];
  } catch { return []; }
}

function makeRef(id: string): string {
  const n = Array.from(id).reduce((acc, ch) => (acc + ch.charCodeAt(0)) % 100000, 0);
  return `MCR-FOIA-${new Date().getFullYear()}-${String(n).padStart(5, "0")}`;
}

export function useRecordsRequests() {
  const [items, setItems] = useState<RecordsRequest[]>(() => readAll());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const submit = useCallback(
    (input: { subject: string; details: string }): RecordsRequest => {
      const id = crypto.randomUUID();
      const entry: RecordsRequest = {
        id, ref: makeRef(id),
        subject: input.subject, details: input.details,
        requested_at: new Date().toISOString(), status: "submitted",
      };
      setItems((s) => [entry, ...s]);
      return entry;
    },
    [],
  );

  return { items, submit };
}
```

- [x] **Step 5: Run tests, verify pass**

Run: `npx vitest run tests/account/request-hooks.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 6: Commit**

```bash
git add src/account/useCorrectionRequests.ts src/account/useRecordsRequests.ts tests/account/request-hooks.test.tsx
git commit -m "feat(account): correction + records-request hooks"
```

---

## Task 8: useCommitmentHistory Hook

**Files:**
- Create: `src/account/useCommitmentHistory.ts`
- Test: `tests/account/use-commitment-history.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/use-commitment-history.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommitmentHistory } from "../../src/account/useCommitmentHistory";

describe("useCommitmentHistory", () => {
  beforeEach(() => localStorage.clear());

  it("records exports newest-first", () => {
    const { result } = renderHook(() => useCommitmentHistory());
    act(() => {
      result.current.record({ parcel_apn: "A", instrument_count: 1, open_encumbrance_count: 0 });
      result.current.record({ parcel_apn: "B", instrument_count: 2, open_encumbrance_count: 1 });
    });
    expect(result.current.items.map((i) => i.parcel_apn)).toEqual(["B", "A"]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/use-commitment-history.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement useCommitmentHistory**

```ts
// src/account/useCommitmentHistory.ts
import { useCallback, useEffect, useState } from "react";

const KEY = "mcr.account.commitmentHistory.v1";

export interface CommitmentExport {
  id: string;
  parcel_apn: string;
  exported_at: string;
  instrument_count: number;
  open_encumbrance_count: number;
}

function readAll(): CommitmentExport[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CommitmentExport[]) : [];
  } catch { return []; }
}

export function useCommitmentHistory() {
  const [items, setItems] = useState<CommitmentExport[]>(() => readAll());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const record = useCallback((entry: Omit<CommitmentExport, "id" | "exported_at">) => {
    const full: CommitmentExport = {
      id: crypto.randomUUID(),
      exported_at: new Date().toISOString(),
      ...entry,
    };
    setItems((s) => [full, ...s]);
    return full;
  }, []);

  return { items, record };
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/use-commitment-history.test.tsx`
Expected: PASS, 1 test.

- [x] **Step 5: Commit**

```bash
git add src/account/useCommitmentHistory.ts tests/account/use-commitment-history.test.tsx
git commit -m "feat(account): useCommitmentHistory"
```

---

## Task 9: PreviewPill + StarButton

**Files:**
- Create: `src/components/account/PreviewPill.tsx`
- Create: `src/components/account/StarButton.tsx`
- Test: `tests/account/star-button.dom.test.tsx`

- [x] **Step 1: Implement PreviewPill**

```tsx
// src/components/account/PreviewPill.tsx
import { Icon } from "../ui/Icon";

export function PreviewPill({
  productionNote = "production ships with live delivery",
}: {
  productionNote?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-gradient-to-b from-amber-50 to-amber-100/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900 shadow-sm"
      title={`Demo-only surface — ${productionNote}.`}
    >
      <Icon name="sparkle" size={12} />
      Preview
      <span className="font-normal normal-case tracking-normal text-amber-800/90">
        · {productionNote}
      </span>
    </span>
  );
}
```

- [x] **Step 2: Write the failing StarButton test**

```tsx
// tests/account/star-button.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../src/account/AuthContext";
import { StarButton } from "../../src/components/account/StarButton";

function mount() {
  return render(
    <AuthProvider>
      <StarButton kind="parcel" id="304-78-386" label="304-78-386" />
    </AuthProvider>,
  );
}

describe("StarButton", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("prompts sign-in when signed out", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: /watch/i }));
    expect(screen.getByText(/sign in to watch/i)).toBeInTheDocument();
  });

  it("toggles watched state when signed in", async () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    mount();
    await userEvent.click(screen.getByRole("button", { name: /watch/i }));
    expect(screen.getByRole("button", { name: /watching/i })).toBeInTheDocument();
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/account/star-button.dom.test.tsx`
Expected: FAIL.

- [x] **Step 4: Implement StarButton**

```tsx
// src/components/account/StarButton.tsx
import { useState } from "react";
import { useAuth } from "../../account/AuthContext";
import { useWatchlist } from "../../account/useWatchlist";
import { Icon } from "../ui/Icon";

interface Props {
  kind: "parcel" | "party";
  id: string;
  label: string;
}

export function StarButton({ kind, id, label }: Props) {
  const { user, signIn } = useAuth();
  const wl = useWatchlist();
  const [hint, setHint] = useState(false);

  const watched = kind === "parcel" ? wl.isParcelWatched(id) : wl.isPartyWatched(id);

  const onClick = () => {
    if (!user) { setHint(true); return; }
    (kind === "parcel" ? wl.toggleParcel : wl.toggleParty)(id);
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={watched}
        title={watched ? `Watching ${label}` : `Watch ${label}`}
        className={`group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          watched
            ? "border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100/70 text-amber-900 shadow-sm"
            : "border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/40 hover:text-amber-800"
        }`}
      >
        <span className={`transition-transform ${watched ? "scale-110" : "group-hover:scale-110"}`}>
          <Icon name="star" size={14} filled={watched} />
        </span>
        {watched ? "Watching" : "Watch"}
      </button>
      {hint && !user && (
        <button
          type="button"
          onClick={() => { signIn(); setHint(false); }}
          className="text-xs text-slate-600 underline underline-offset-2 hover:text-slate-900"
        >
          Sign in to watch
        </button>
      )}
    </span>
  );
}
```

- [x] **Step 5: Run tests, verify pass**

Run: `npx vitest run tests/account/star-button.dom.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 6: Commit**

```bash
git add src/components/account/PreviewPill.tsx src/components/account/StarButton.tsx tests/account/star-button.dom.test.tsx
git commit -m "feat(account): PreviewPill + StarButton with filled-icon state"
```

---

## Task 10: SignInButton + NotificationBell + AccountMenu

**Files:**
- Create: `src/components/account/SignInButton.tsx`
- Create: `src/components/account/NotificationBell.tsx`
- Create: `src/components/account/AccountMenu.tsx`
- Test: `tests/account/header-chrome.dom.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/header-chrome.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { SignInButton } from "../../src/components/account/SignInButton";
import { AccountMenu } from "../../src/components/account/AccountMenu";
import { NotificationBell } from "../../src/components/account/NotificationBell";

describe("header chrome", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("SignInButton renders with Google label and demo tag", () => {
    render(<AuthProvider><SignInButton /></AuthProvider>);
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.getByText(/demo/i)).toBeInTheDocument();
  });

  it("AccountMenu hides when signed out, shows user when signed in", () => {
    const { rerender } = render(
      <MemoryRouter>
        <AuthProvider><AccountMenu /></AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /jordan/i })).not.toBeInTheDocument();
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    rerender(
      <MemoryRouter>
        <AuthProvider><AccountMenu /></AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /jordan/i })).toBeInTheDocument();
  });

  it("NotificationBell shows unread count badge when signed in with watchlist items", async () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    localStorage.setItem(
      "mcr.account.watchlist.v1",
      JSON.stringify({ parcels: ["304-78-386"], parties: ["wells-fargo"] }),
    );
    render(
      <MemoryRouter>
        <AuthProvider><NotificationBell /></AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /inbox/i })).toBeInTheDocument();
    // Should show a badge — the seeded notifications include unread items for these watched targets
    expect(screen.getByTestId("bell-badge")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/header-chrome.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement SignInButton**

```tsx
// src/components/account/SignInButton.tsx
import { useAuth } from "../../account/AuthContext";

// Google-style "G" mark, inline.
function GoogleG() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export function SignInButton() {
  const { signIn } = useAuth();
  return (
    <button
      type="button"
      onClick={signIn}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-all hover:border-slate-400 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
    >
      <GoogleG />
      Sign in with Google
      <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        Demo
      </span>
    </button>
  );
}
```

- [x] **Step 4: Implement NotificationBell**

```tsx
// src/components/account/NotificationBell.tsx
import { Link } from "react-router";
import { useAuth } from "../../account/AuthContext";
import { useNotifications } from "../../account/useNotifications";
import { useWatchlist } from "../../account/useWatchlist";
import { Icon } from "../ui/Icon";

export function NotificationBell() {
  const { user } = useAuth();
  const wl = useWatchlist();
  const { unreadCount } = useNotifications({
    watchedParcels: wl.parcels,
    watchedParties: wl.parties,
  });

  if (!user) return null;

  return (
    <Link
      to="/account/inbox"
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
      aria-label={`Inbox${unreadCount ? `, ${unreadCount} unread` : ""}`}
    >
      <Icon name="bell" size={18} />
      {unreadCount > 0 && (
        <span
          data-testid="bell-badge"
          className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
```

- [x] **Step 5: Implement AccountMenu**

```tsx
// src/components/account/AccountMenu.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../account/AuthContext";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../ui/Icon";

const ITEMS: Array<{ to: string; label: string; icon: Parameters<typeof Icon>[0]["name"] }> = [
  { to: "/account", label: "Dashboard", icon: "sparkle" },
  { to: "/account/watchlist", label: "Watchlist", icon: "star" },
  { to: "/account/inbox", label: "Inbox", icon: "inbox" },
  { to: "/account/notices", label: "Statutory notices", icon: "gavel" },
  { to: "/account/preferences", label: "Preferences", icon: "gear" },
  { to: "/account/records-request", label: "Records requests", icon: "file" },
  { to: "/account/commitments", label: "My commitments", icon: "building" },
];

export function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.display_name} size={28} />
        <span className="hidden sm:inline">{user.display_name.split(" ")[0]}</span>
        <svg viewBox="0 0 20 20" className="h-3 w-3 text-slate-500" aria-hidden>
          <path fill="currentColor" d="M5 8l5 5 5-5z" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-[slideUp_140ms_cubic-bezier(0.16,1,0.3,1)]"
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="text-sm font-semibold text-slate-900">{user.display_name}</div>
            <div className="text-xs text-slate-500">{user.email}</div>
          </div>
          <ul className="py-1">
            {ITEMS.map((it) => (
              <li key={it.to}>
                <Link
                  to={it.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className="text-slate-400"><Icon name={it.icon} size={16} /></span>
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full rounded-md px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 6: Run tests, verify pass**

Run: `npx vitest run tests/account/header-chrome.dom.test.tsx`
Expected: PASS, 3 tests.

- [x] **Step 7: Commit**

```bash
git add src/components/account/SignInButton.tsx src/components/account/NotificationBell.tsx src/components/account/AccountMenu.tsx tests/account/header-chrome.dom.test.tsx
git commit -m "feat(account): sign-in button (Google style), notification bell, account menu"
```

---

## Task 11: HeaderBar + Mount into RootLayout

**Files:**
- Create: `src/components/HeaderBar.tsx`
- Modify: `src/components/RootLayout.tsx`
- Test: `tests/account/header-bar.dom.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/header-bar.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { RootLayout } from "../../src/components/RootLayout";

vi.mock("react-map-gl/maplibre", () => ({
  default: () => null, Source: () => null, Layer: () => null, Marker: () => null,
}));

function mount(url: string) {
  const router = createMemoryRouter(
    [{
      element: <RootLayout />,
      children: [
        { path: "/", element: <div data-testid="outlet">PUBLIC</div> },
        { path: "account", element: <div>ACCOUNT</div> },
      ],
    }],
    { initialEntries: [url] },
  );
  return render(<RouterProvider router={router} />);
}

describe("HeaderBar in RootLayout", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("shows the sign-in button when signed out", () => {
    mount("/");
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
  });

  it("flips to avatar menu after sign-in", async () => {
    mount("/");
    await userEvent.click(screen.getByRole("button", { name: /sign in with google/i }));
    expect(screen.getByRole("button", { name: /jordan/i })).toBeInTheDocument();
  });

  it("preserves the existing PipelineBanner on public routes", () => {
    mount("/");
    expect(screen.getByRole("link", { name: /see pipeline/i })).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/header-bar.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement HeaderBar**

```tsx
// src/components/HeaderBar.tsx
import { Link } from "react-router";
import { useAuth } from "../account/AuthContext";
import { SignInButton } from "./account/SignInButton";
import { NotificationBell } from "./account/NotificationBell";
import { AccountMenu } from "./account/AccountMenu";

function Monogram() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-moat-600 to-moat-800 text-white font-bold text-[11px] shadow-sm ring-1 ring-white/30">
      MC
    </span>
  );
}

export function HeaderBar() {
  const { user } = useAuth();
  return (
    <header className="shrink-0 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="h-12 px-4 flex items-center justify-between">
        <Link to="/" className="group inline-flex items-center gap-2 focus-visible:outline-none">
          <Monogram />
          <span className="flex flex-col leading-none">
            <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
              Maricopa County
            </span>
            <span className="text-sm font-semibold text-recorder-900 group-hover:text-moat-800">
              Recorder
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <AccountMenu />
            </>
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </header>
  );
}
```

- [x] **Step 4: Modify RootLayout**

Open `src/components/RootLayout.tsx`. Replace the file with:

```tsx
// src/components/RootLayout.tsx
import { Outlet, useMatch } from "react-router";
import { PipelineBanner } from "./PipelineBanner";
import { HeaderBar } from "./HeaderBar";
import { AuthProvider } from "../account/AuthContext";
import { ToastProvider } from "./ui/Toast";

export function RootLayout() {
  const onStaff = useMatch("/staff/*") !== null;
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          <HeaderBar />
          {!onStaff && <PipelineBanner />}
          <div className="flex-1 min-h-0 overflow-auto">
            <Outlet />
          </div>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
```

- [x] **Step 5: Run tests, verify pass**

Run: `npx vitest run tests/account/header-bar.dom.test.tsx tests/root-layout.dom.test.tsx`
Expected: new tests PASS; pre-existing root-layout tests PASS.

- [x] **Step 6: Commit**

```bash
git add src/components/HeaderBar.tsx src/components/RootLayout.tsx tests/account/header-bar.dom.test.tsx
git commit -m "feat(account): sticky HeaderBar with monogram + AuthProvider/ToastProvider wrap"
```

---

## Task 12: AccountLayout Shell

**Files:**
- Create: `src/components/account/AccountLayout.tsx`
- Test: `tests/account/account-layout.dom.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/account-layout.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountLayout } from "../../src/components/account/AccountLayout";

function mount(signedIn: boolean) {
  if (signedIn) localStorage.setItem("mcr.account.signedIn.v1", "1");
  const router = createMemoryRouter(
    [{
      element: <AuthProvider><AccountLayout /></AuthProvider>,
      children: [{ path: "account", element: <div>DASH</div> }],
    }],
    { initialEntries: ["/account"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("AccountLayout", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("shows sign-in prompt when signed out", () => {
    mount(false);
    expect(screen.getByText(/sign in to access your account/i)).toBeInTheDocument();
  });

  it("renders the full nav when signed in", () => {
    mount(true);
    for (const name of ["Dashboard","Watchlist","Inbox","Statutory notices","Preferences","Records requests","My commitments"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/account-layout.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement AccountLayout**

```tsx
// src/components/account/AccountLayout.tsx
import { NavLink, Outlet } from "react-router";
import { useAuth } from "../../account/AuthContext";
import { SignInButton } from "./SignInButton";
import { Icon } from "../ui/Icon";
import { EmptyState } from "../ui/EmptyState";

const NAV: Array<{ to: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; end?: boolean }> = [
  { to: "/account", label: "Dashboard", icon: "sparkle", end: true },
  { to: "/account/watchlist", label: "Watchlist", icon: "star" },
  { to: "/account/inbox", label: "Inbox", icon: "inbox" },
  { to: "/account/notices", label: "Statutory notices", icon: "gavel" },
  { to: "/account/preferences", label: "Preferences", icon: "gear" },
  { to: "/account/records-request", label: "Records requests", icon: "file" },
  { to: "/account/commitments", label: "My commitments", icon: "building" },
];

export function AccountLayout() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <EmptyState
          icon="gear"
          title="Sign in to access your account"
          body="One-click demo sign-in, no password required. Your session persists in this browser."
          action={<SignInButton />}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex gap-8 px-6 py-8">
      <nav className="w-56 shrink-0">
        <div className="sticky top-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Account
          </p>
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors relative ${
                      isActive
                        ? "bg-moat-50 font-semibold text-moat-900"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-moat-600" />
                      )}
                      <span className={isActive ? "text-moat-700" : "text-slate-400 group-hover:text-slate-600"}>
                        <Icon name={item.icon} size={16} />
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/account-layout.dom.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/account/AccountLayout.tsx tests/account/account-layout.dom.test.tsx
git commit -m "feat(account): AccountLayout with sticky left-rail + active edge bar"
```

---

## Task 13: AccountDashboard

**Files:**
- Create: `src/components/account/AccountDashboard.tsx`
- Test: `tests/account/account-dashboard.dom.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/account-dashboard.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountDashboard } from "../../src/components/account/AccountDashboard";

function mount() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  return render(
    <MemoryRouter>
      <AuthProvider><AccountDashboard /></AuthProvider>
    </MemoryRouter>,
  );
}

describe("AccountDashboard", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("greets the user and shows metric cards", () => {
    mount();
    expect(screen.getByText(/welcome back, jordan/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /watchlist/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /inbox/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /statutory notices/i })).toBeInTheDocument();
  });

  it("renders at least one preview pill", () => {
    mount();
    expect(screen.getAllByText(/preview/i).length).toBeGreaterThan(0);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/account-dashboard.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement AccountDashboard**

```tsx
// src/components/account/AccountDashboard.tsx
import { Link } from "react-router";
import { useAuth } from "../../account/AuthContext";
import { useWatchlist } from "../../account/useWatchlist";
import { useNotifications } from "../../account/useNotifications";
import { useRecentlyViewed } from "../../account/useRecentlyViewed";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { Icon } from "../ui/Icon";
import { EmptyState } from "../ui/EmptyState";
import { PreviewPill } from "./PreviewPill";

function MetricCard({
  icon, title, metric, sub, to, tone,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  metric: string;
  sub: string;
  to: string;
  tone: "moat" | "amber" | "sky" | "violet";
}) {
  const toneBg: Record<typeof tone, string> = {
    moat: "from-moat-500/10 to-moat-500/0 text-moat-700",
    amber: "from-amber-500/10 to-amber-500/0 text-amber-700",
    sky: "from-sky-500/10 to-sky-500/0 text-sky-700",
    violet: "from-violet-500/10 to-violet-500/0 text-violet-700",
  };
  return (
    <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500 rounded-xl">
      <Card interactive>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${toneBg[tone]} ring-1 ring-inset ring-slate-200/60`}>
              <Icon name={icon} size={18} />
            </span>
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          </div>
          <Icon name="arrowRight" size={16} {...{ className: "text-slate-400" }} />
        </CardHeader>
        <CardBody>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">{metric}</div>
          <div className="mt-1 text-xs text-slate-500">{sub}</div>
        </CardBody>
      </Card>
    </Link>
  );
}

export function AccountDashboard() {
  const { user } = useAuth();
  const wl = useWatchlist();
  const { items, unreadCount } = useNotifications({
    watchedParcels: wl.parcels,
    watchedParties: wl.parties,
  });
  const recent = useRecentlyViewed();

  if (!user) return null;

  const noticesCount = items.filter((i) => i.kind === "statutory_notice").length;

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-moat-700">
            Account · Demo mode
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-recorder-900">
            Welcome back, {user.display_name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {wl.parcels.length} parcel{wl.parcels.length === 1 ? "" : "s"} · {wl.parties.length} part{wl.parties.length === 1 ? "y" : "ies"} watched
          </p>
        </div>
        <PreviewPill />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon="star" title="Watchlist" metric={String(wl.parcels.length + wl.parties.length)} sub="items watched" to="/account/watchlist" tone="amber" />
        <MetricCard icon="bell" title="Inbox" metric={String(unreadCount)} sub={unreadCount === 1 ? "unread notification" : "unread notifications"} to="/account/inbox" tone="moat" />
        <MetricCard icon="gavel" title="Statutory notices" metric={String(noticesCount)} sub="near watched parcels" to="/account/notices" tone="violet" />
        <MetricCard icon="file" title="Records requests" metric="0 open" sub="submit a new request" to="/account/records-request" tone="sky" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon name="sparkle" size={16} {...{ className: "text-slate-400" }} />
            <h2 className="text-sm font-semibold text-slate-800">Recent activity on your watchlist</h2>
          </div>
          <Chip tone="moat">Last 7 days</Chip>
        </CardHeader>
        <CardBody>
          {items.length === 0 ? (
            <EmptyState
              icon="bell"
              title="No activity yet"
              body="When a new document records against a parcel or party you're watching, it'll show up here — and in your inbox."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.slice(0, 4).map((n) => (
                <li key={n.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{n.title}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">{n.body}</div>
                  </div>
                  <time className="shrink-0 text-[11px] text-slate-400">
                    {new Date(n.recorded_at).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-800">Recently viewed</h2>
        </CardHeader>
        <CardBody>
          {recent.items.length === 0 ? (
            <p className="text-xs text-slate-500">As you browse parcels and parties, they'll appear here.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.items.map((r) => (
                <li key={`${r.kind}-${r.id}`} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Chip tone={r.kind === "parcel" ? "info" : "moat"}>{r.kind}</Chip>
                    <span className="truncate text-sm text-slate-800">{r.label}</span>
                  </div>
                  <Link
                    to={r.kind === "parcel" ? `/parcel/${r.id}` : `/party/${r.id}`}
                    className="text-xs text-moat-700 hover:underline"
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/account-dashboard.dom.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/account/AccountDashboard.tsx tests/account/account-dashboard.dom.test.tsx
git commit -m "feat(account): polished dashboard with metric cards + activity + recent"
```

---

## Task 14: AccountWatchlist

**Files:**
- Create: `src/components/account/AccountWatchlist.tsx`
- Test: `tests/account/account-watchlist.dom.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/account-watchlist.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountWatchlist } from "../../src/components/account/AccountWatchlist";

describe("AccountWatchlist", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("empty state when nothing watched", () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    render(<MemoryRouter><AuthProvider><AccountWatchlist /></AuthProvider></MemoryRouter>);
    expect(screen.getByText(/nothing watched yet/i)).toBeInTheDocument();
  });

  it("lists watched parcels and parties with deep links", () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    localStorage.setItem(
      "mcr.account.watchlist.v1",
      JSON.stringify({ parcels: ["304-78-386"], parties: ["wells-fargo"] }),
    );
    render(<MemoryRouter><AuthProvider><AccountWatchlist /></AuthProvider></MemoryRouter>);
    expect(screen.getByRole("link", { name: /304-78-386/i })).toHaveAttribute("href", "/parcel/304-78-386");
    expect(screen.getByRole("link", { name: /wells-fargo/i })).toHaveAttribute("href", "/party/wells-fargo");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/account-watchlist.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement AccountWatchlist**

```tsx
// src/components/account/AccountWatchlist.tsx
import { Link } from "react-router";
import { useWatchlist } from "../../account/useWatchlist";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";

export function AccountWatchlist() {
  const wl = useWatchlist();
  const total = wl.parcels.length + wl.parties.length;

  if (total === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold text-recorder-900">Watchlist</h1>
        <div className="mt-6">
          <EmptyState
            icon="star"
            title="Nothing watched yet"
            body="Star any parcel or party to add it here. You'll get notifications when anything new records against it."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-recorder-900">Watchlist</h1>
        <p className="mt-1 text-sm text-slate-600">{total} item{total === 1 ? "" : "s"}</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon name="building" size={16} {...{ className: "text-slate-400" }} />
            <h2 className="text-sm font-semibold text-slate-800">Parcels</h2>
          </div>
          <Chip tone="info">{wl.parcels.length}</Chip>
        </CardHeader>
        <CardBody>
          {wl.parcels.length === 0 ? (
            <p className="text-xs text-slate-500">No parcels watched.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {wl.parcels.map((apn) => (
                <li key={apn} className="flex items-center justify-between py-2">
                  <Link to={`/parcel/${apn}`} className="font-mono text-sm text-moat-700 hover:underline">
                    {apn}
                  </Link>
                  <button
                    type="button"
                    onClick={() => wl.toggleParcel(apn)}
                    className="text-xs text-slate-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon name="star" size={16} {...{ className: "text-slate-400" }} />
            <h2 className="text-sm font-semibold text-slate-800">Parties</h2>
          </div>
          <Chip tone="moat">{wl.parties.length}</Chip>
        </CardHeader>
        <CardBody>
          {wl.parties.length === 0 ? (
            <p className="text-xs text-slate-500">No parties watched.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {wl.parties.map((name) => (
                <li key={name} className="flex items-center justify-between py-2">
                  <Link to={`/party/${name}`} className="text-sm text-moat-700 hover:underline">
                    {name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => wl.toggleParty(name)}
                    className="text-xs text-slate-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/account-watchlist.dom.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/account/AccountWatchlist.tsx tests/account/account-watchlist.dom.test.tsx
git commit -m "feat(account): watchlist page with card-grouped parcels + parties"
```

---

## Task 15: AccountInbox

**Files:**
- Create: `src/components/account/AccountInbox.tsx`
- Test: `tests/account/account-inbox.dom.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/account-inbox.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountInbox } from "../../src/components/account/AccountInbox";

function mount() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  localStorage.setItem(
    "mcr.account.watchlist.v1",
    JSON.stringify({ parcels: ["304-78-386"], parties: ["wells-fargo"] }),
  );
  return render(<MemoryRouter><AuthProvider><AccountInbox /></AuthProvider></MemoryRouter>);
}

describe("AccountInbox", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("lists seeded notifications with a preview pill", () => {
    mount();
    expect(screen.getByText(/new instrument recorded/i)).toBeInTheDocument();
    expect(screen.getAllByText(/preview/i).length).toBeGreaterThan(0);
  });

  it("mark-all-read zeroes the unread count", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: /mark all read/i }));
    expect(screen.getByTestId("unread-count")).toHaveTextContent("0");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/account-inbox.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement AccountInbox**

```tsx
// src/components/account/AccountInbox.tsx
import { Link } from "react-router";
import { useWatchlist } from "../../account/useWatchlist";
import { useNotifications, type Notification } from "../../account/useNotifications";
import { Card, CardBody } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { PreviewPill } from "./PreviewPill";

const KIND_LABEL: Record<Notification["kind"], string> = {
  new_instrument: "New filing",
  watched_party: "Watched party",
  flag_response: "Flag response",
  statutory_notice: "Statutory notice",
  digest: "Digest",
};

const KIND_TONE: Record<Notification["kind"], React.ComponentProps<typeof Chip>["tone"]> = {
  new_instrument: "moat",
  watched_party: "info",
  flag_response: "success",
  statutory_notice: "warn",
  digest: "neutral",
};

export function AccountInbox() {
  const wl = useWatchlist();
  const { items, unreadCount, markRead, markAllRead } = useNotifications({
    watchedParcels: wl.parcels,
    watchedParties: wl.parties,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-recorder-900">Inbox</h1>
          <p className="mt-1 text-sm text-slate-600">
            <span data-testid="unread-count">{unreadCount}</span> unread · {items.length} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PreviewPill />
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
          >
            Mark all read
          </button>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Your inbox is empty"
          body="Add parcels and parties to your watchlist and activity will start appearing here."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`relative cursor-pointer px-5 py-3.5 transition-colors hover:bg-slate-50 ${
                    !n.read ? "bg-moat-50/30" : ""
                  }`}
                >
                  {!n.read && (
                    <span className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-moat-600" aria-label="unread" />
                  )}
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <Chip tone={KIND_TONE[n.kind]}>{KIND_LABEL[n.kind]}</Chip>
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{n.title}</h3>
                    </div>
                    <time className="shrink-0 text-[11px] text-slate-500">
                      {new Date(n.recorded_at).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {n.parcel_apn && (
                      <Link to={`/parcel/${n.parcel_apn}`} className="text-moat-700 hover:underline">
                        Open parcel {n.parcel_apn} →
                      </Link>
                    )}
                    {n.party_normalized && (
                      <Link to={`/party/${n.party_normalized}`} className="text-moat-700 hover:underline">
                        Open party →
                      </Link>
                    )}
                    {n.recording_number && (
                      <Link to={`/instrument/${n.recording_number}`} className="text-moat-700 hover:underline">
                        Open instrument {n.recording_number} →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/account-inbox.dom.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/account/AccountInbox.tsx tests/account/account-inbox.dom.test.tsx
git commit -m "feat(account): inbox with chip-labeled kinds + unread dot + mark-all-read"
```

---

## Task 16: AccountPreferences

**Files:**
- Create: `src/components/account/AccountPreferences.tsx`
- Test: `tests/account/account-preferences.dom.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/account-preferences.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountPreferences } from "../../src/components/account/AccountPreferences";

function mount() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  return render(<MemoryRouter><AuthProvider><AccountPreferences /></AuthProvider></MemoryRouter>);
}

describe("AccountPreferences", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("renders email and SMS switches", () => {
    mount();
    expect(screen.getByRole("switch", { name: /email notifications/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /sms notifications/i })).toBeInTheDocument();
  });

  it("persists toggle state", async () => {
    const { unmount } = mount();
    const sms = screen.getByRole("switch", { name: /sms notifications/i });
    await userEvent.click(sms);
    unmount();
    mount();
    expect(screen.getByRole("switch", { name: /sms notifications/i })).toHaveAttribute("aria-checked", "true");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/account-preferences.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement AccountPreferences**

```tsx
// src/components/account/AccountPreferences.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../account/AuthContext";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Switch } from "../ui/Switch";
import { PreviewPill } from "./PreviewPill";

const KEY = "mcr.account.preferences.v1";

interface Prefs {
  emailEnabled: boolean;
  smsEnabled: boolean;
  realTime: boolean;
  digestWeekly: boolean;
}

const DEFAULTS: Prefs = {
  emailEnabled: true,
  smsEnabled: false,
  realTime: true,
  digestWeekly: true,
};

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

export function AccountPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(() => readPrefs());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* noop */ }
  }, [prefs]);

  if (!user) return null;

  const toggle = (k: keyof Prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-recorder-900">Preferences</h1>
          <p className="mt-1 text-sm text-slate-600">Configure how and when the portal reaches you.</p>
        </div>
        <PreviewPill productionNote="production sends real email + SMS via the county notification service" />
      </header>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-800">Delivery channels</h2>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100">
          <Switch
            id="email"
            label="Email notifications"
            sub={user.email}
            checked={prefs.emailEnabled}
            onChange={() => toggle("emailEnabled")}
          />
          <Switch
            id="sms"
            label="SMS notifications"
            sub={user.phone_masked}
            checked={prefs.smsEnabled}
            onChange={() => toggle("smsEnabled")}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-800">Frequency</h2>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100">
          <Switch
            id="realtime"
            label="Real-time alerts"
            sub="Send as soon as a recording matches your watchlist"
            checked={prefs.realTime}
            onChange={() => toggle("realTime")}
          />
          <Switch
            id="digest"
            label="Weekly digest"
            sub="Summary of activity every Monday morning"
            checked={prefs.digestWeekly}
            onChange={() => toggle("digestWeekly")}
          />
        </CardBody>
      </Card>
    </div>
  );
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/account-preferences.dom.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/account/AccountPreferences.tsx tests/account/account-preferences.dom.test.tsx
git commit -m "feat(account): preferences with custom Switch primitive + cards"
```

---

## Task 17: AccountStatutoryNotices + Fixture

**Files:**
- Create: `src/data/account/seed-statutory-notices.json`
- Create: `src/components/account/AccountStatutoryNotices.tsx`
- Test: `tests/account/account-statutory-notices.dom.test.tsx`

- [x] **Step 1: Create the fixture**

File: `src/data/account/seed-statutory-notices.json`.

```json
{
  "note": "Pre-seeded statutory notices. In production these come from the recorder's legally-mandated notice-publication stream.",
  "items": [
    {
      "id": "sn-001",
      "kind": "tax_sale",
      "parcel_apn": "304-78-406",
      "neighbor_of": ["304-78-386"],
      "published_at": "2026-04-10",
      "deadline_at": "2026-05-15",
      "title": "Notice of tax sale — 3690 E Palmer St",
      "body": "Maricopa County Treasurer has issued a notice of tax sale for parcel 304-78-406 in Seville Parcel 3. Redemption deadline: May 15, 2026."
    },
    {
      "id": "sn-002",
      "kind": "probate",
      "parcel_apn": "304-77-689",
      "published_at": "2026-03-22",
      "title": "Probate notice — Hogue estate",
      "body": "Publication of probate notice for estate affecting parcel 304-77-689. Creditors must file within 4 months."
    },
    {
      "id": "sn-003",
      "kind": "lis_pendens",
      "parcel_apn": "304-78-408",
      "neighbor_of": ["304-78-386"],
      "published_at": "2026-02-14",
      "title": "Lis pendens — 2720 E Palmer St",
      "body": "Civil action affecting title filed in Maricopa Superior Court. Case number CV2026-001420."
    }
  ]
}
```

- [x] **Step 2: Write the failing test**

```tsx
// tests/account/account-statutory-notices.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountStatutoryNotices } from "../../src/components/account/AccountStatutoryNotices";

function mount(watched: { parcels: string[]; parties: string[] }) {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  localStorage.setItem("mcr.account.watchlist.v1", JSON.stringify(watched));
  return render(<MemoryRouter><AuthProvider><AccountStatutoryNotices /></AuthProvider></MemoryRouter>);
}

describe("AccountStatutoryNotices", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("shows the moat explainer on every visit", () => {
    mount({ parcels: [], parties: [] });
    expect(screen.getByText(/only the county publishes statutory notice/i)).toBeInTheDocument();
  });

  it("filters to notices on or near watched parcels", () => {
    mount({ parcels: ["304-78-386"], parties: [] });
    expect(screen.getByText(/3690 e palmer st/i)).toBeInTheDocument();
    expect(screen.getByText(/2720 e palmer st/i)).toBeInTheDocument();
    expect(screen.queryByText(/hogue estate/i)).not.toBeInTheDocument();
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/account/account-statutory-notices.dom.test.tsx`
Expected: FAIL.

- [x] **Step 4: Implement AccountStatutoryNotices**

```tsx
// src/components/account/AccountStatutoryNotices.tsx
import { Link } from "react-router";
import { useWatchlist } from "../../account/useWatchlist";
import { Card, CardBody } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { PreviewPill } from "./PreviewPill";
import seed from "../../data/account/seed-statutory-notices.json";

interface Notice {
  id: string;
  kind: "tax_sale" | "probate" | "lis_pendens";
  parcel_apn: string;
  neighbor_of?: string[];
  published_at: string;
  deadline_at?: string;
  title: string;
  body: string;
}

const KIND_LABEL: Record<Notice["kind"], string> = {
  tax_sale: "Tax sale",
  probate: "Probate",
  lis_pendens: "Lis pendens",
};

export function AccountStatutoryNotices() {
  const wl = useWatchlist();
  const watched = new Set(wl.parcels);

  const filtered = (seed.items as Notice[]).filter(
    (n) => watched.has(n.parcel_apn) || (n.neighbor_of ?? []).some((apn) => watched.has(apn)),
  );

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-recorder-900">Statutory notices</h1>
          <p className="mt-1 text-sm text-slate-600">
            Legally-published notices on or near parcels you watch.
          </p>
        </div>
        <PreviewPill productionNote="production pulls from the recorder's notice-publication stream" />
      </header>

      <Card>
        <CardBody>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-moat-50 text-moat-700 ring-1 ring-moat-200">
              <Icon name="gavel" size={16} />
            </span>
            <div className="text-xs leading-relaxed text-slate-700">
              <p className="font-semibold text-slate-900">Why this only exists here</p>
              <p className="mt-1">
                Only the county publishes statutory notice (tax sales, probate, lis pendens) —
                this is a legal function of the recorder's office. Title plants resell search
                results and cannot aggregate notice by your watchlist. Production adds
                legally-required acknowledgement and a timestamped receipt.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon="gavel"
          title="No active statutory notices near your watched parcels"
          body="When a tax sale, probate publication, or lis pendens is filed on or adjacent to a watched parcel, it will appear here."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {filtered.map((n) => (
                <li key={n.id} className="p-5">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="flex items-baseline gap-2">
                      <Chip tone="warn">{KIND_LABEL[n.kind]}</Chip>
                      <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
                    </div>
                    <time className="text-[11px] text-slate-500">Published {n.published_at}</time>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                  {n.deadline_at && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-red-200">
                      Deadline: {n.deadline_at}
                    </p>
                  )}
                  <Link
                    to={`/parcel/${n.parcel_apn}`}
                    className="mt-2 inline-block text-xs text-moat-700 hover:underline"
                  >
                    Open parcel {n.parcel_apn} →
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
```

- [x] **Step 5: Run tests, verify pass**

Run: `npx vitest run tests/account/account-statutory-notices.dom.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 6: Commit**

```bash
git add src/data/account/seed-statutory-notices.json src/components/account/AccountStatutoryNotices.tsx tests/account/account-statutory-notices.dom.test.tsx
git commit -m "feat(account): statutory notices with moat explainer + neighbor filter"
```

---

## Task 18: AccountRecordsRequest

**Files:**
- Create: `src/components/account/AccountRecordsRequest.tsx`
- Test: `tests/account/account-records-request.dom.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/account-records-request.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { ToastProvider } from "../../src/components/ui/Toast";
import { AccountRecordsRequest } from "../../src/components/account/AccountRecordsRequest";

function mount() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <AccountRecordsRequest />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AccountRecordsRequest", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("renders the form", () => {
    mount();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/details/i)).toBeInTheDocument();
  });

  it("submits and shows the returned reference in the history list", async () => {
    mount();
    await userEvent.type(screen.getByLabelText(/subject/i), "Copy of plat");
    await userEvent.type(screen.getByLabelText(/details/i), "Seville master plat");
    await userEvent.click(screen.getByRole("button", { name: /submit request/i }));
    expect(await screen.findByText(/MCR-FOIA-\d{4}-\d{5}/)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/account-records-request.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement AccountRecordsRequest**

```tsx
// src/components/account/AccountRecordsRequest.tsx
import { useState } from "react";
import { useRecordsRequests } from "../../account/useRecordsRequests";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { useToast } from "../ui/Toast";
import { PreviewPill } from "./PreviewPill";

export function AccountRecordsRequest() {
  const { items, submit } = useRecordsRequests();
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const toast = useToast();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !details.trim()) return;
    const entry = submit({ subject: subject.trim(), details: details.trim() });
    toast.show({ tone: "success", title: "Request submitted", body: entry.ref });
    setSubject("");
    setDetails("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-recorder-900">Records requests</h1>
          <p className="mt-1 text-sm text-slate-600">
            Public-records requests the county is legally required to fulfill.
          </p>
        </div>
        <PreviewPill productionNote="production routes to the county records office with statutory deadlines" />
      </header>

      <Card>
        <CardBody>
          <p className="text-xs leading-relaxed text-slate-700">
            Only the county fulfills a public-records request. Title plants cannot. Submissions
            here generate a reference number, appear in your history, and route to the staff
            queue.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-800">Submit a new request</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Subject
              </label>
              <input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Copy of plat Book 553 Page 15"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
              />
            </div>
            <div>
              <label htmlFor="details" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Details
              </label>
              <textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder="Recording numbers, date ranges, parcel APNs — anything that helps the office locate the records."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-moat-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-moat-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
              >
                Submit request
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-800">Your requests</h2>
            <Chip>{items.length}</Chip>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {items.map((r) => (
                <li key={r.id} className="px-5 py-3.5">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{r.subject}</span>
                    <span className="font-mono text-[11px] text-slate-500">{r.ref}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{r.details}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <time className="text-[11px] text-slate-500">
                      {new Date(r.requested_at).toLocaleDateString()}
                    </time>
                    <Chip tone={r.status === "fulfilled" ? "success" : "info"}>
                      {r.status.replace("_", " ")}
                    </Chip>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/account-records-request.dom.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/account/AccountRecordsRequest.tsx tests/account/account-records-request.dom.test.tsx
git commit -m "feat(account): records-request form with toast confirmation + history"
```

---

## Task 19: AccountCommitments

**Files:**
- Create: `src/components/account/AccountCommitments.tsx`
- Test: `tests/account/account-commitments.dom.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/account-commitments.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { AccountCommitments } from "../../src/components/account/AccountCommitments";

describe("AccountCommitments", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("shows the empty state when nothing exported", () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    render(<MemoryRouter><AuthProvider><AccountCommitments /></AuthProvider></MemoryRouter>);
    expect(screen.getByText(/no commitments exported yet/i)).toBeInTheDocument();
  });

  it("lists past exports with a re-export link", () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    localStorage.setItem(
      "mcr.account.commitmentHistory.v1",
      JSON.stringify([{
        id: "x",
        parcel_apn: "304-78-386",
        exported_at: "2026-04-17T10:00:00Z",
        instrument_count: 12,
        open_encumbrance_count: 2,
      }]),
    );
    render(<MemoryRouter><AuthProvider><AccountCommitments /></AuthProvider></MemoryRouter>);
    expect(screen.getByText(/304-78-386/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /re-export/i })).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/account-commitments.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement AccountCommitments**

```tsx
// src/components/account/AccountCommitments.tsx
import { Link } from "react-router";
import { useCommitmentHistory } from "../../account/useCommitmentHistory";
import { Card, CardBody } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";

export function AccountCommitments() {
  const { items } = useCommitmentHistory();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-recorder-900">My commitments</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every commitment PDF you've exported from a parcel page.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon="file"
          title="No commitments exported yet"
          body="Open any parcel and click Export Commitment. The PDF appears here with a re-export link."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {items.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <Link to={`/parcel/${c.parcel_apn}`} className="font-mono text-sm text-moat-700 hover:underline">
                      {c.parcel_apn}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <time>{new Date(c.exported_at).toLocaleString()}</time>
                      <Chip tone="neutral">{c.instrument_count} instruments</Chip>
                      {c.open_encumbrance_count > 0 && (
                        <Chip tone="warn">{c.open_encumbrance_count} open</Chip>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/parcel/${c.parcel_apn}/commitment/new`}
                    className="shrink-0 text-xs font-medium text-moat-700 hover:underline"
                  >
                    Re-export →
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/account-commitments.dom.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/account/AccountCommitments.tsx tests/account/account-commitments.dom.test.tsx
git commit -m "feat(account): commitments history with chips + re-export links"
```

---

## Task 20: FlagInstrumentButton + ProofDrawer integration

**Files:**
- Create: `src/components/account/FlagInstrumentButton.tsx`
- Modify: `src/components/ProofDrawer.tsx`
- Test: `tests/account/flag-instrument-button.dom.test.tsx`

> **Parallel-agent safety note:** The Live AI Extract agent may also be editing `ProofDrawer.tsx`. To avoid a conflict, add the `<FlagInstrumentButton/>` exactly at the *end* of the existing drawer header action row (after any "Copy citation" / close affordances). A single additive node. Do not restructure surrounding markup.

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/flag-instrument-button.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { ToastProvider } from "../../src/components/ui/Toast";
import { FlagInstrumentButton } from "../../src/components/account/FlagInstrumentButton";

function mountSignedIn() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <FlagInstrumentButton instrumentNumber="20210075858" parcelApn="304-78-386" />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("FlagInstrumentButton", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("opens a dialog with reason + note fields", async () => {
    mountSignedIn();
    await userEvent.click(screen.getByRole("button", { name: /report an issue/i }));
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/note/i)).toBeInTheDocument();
  });

  it("submits and shows a reference number receipt", async () => {
    mountSignedIn();
    await userEvent.click(screen.getByRole("button", { name: /report an issue/i }));
    await userEvent.selectOptions(screen.getByLabelText(/reason/i), "wrong_party_name");
    await userEvent.type(screen.getByLabelText(/note/i), "The grantor has a typo.");
    await userEvent.click(screen.getByRole("button", { name: /submit flag/i }));
    expect(await screen.findByText(/MCR-REPORT-\d{4}-\d{5}/)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/flag-instrument-button.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement FlagInstrumentButton**

```tsx
// src/components/account/FlagInstrumentButton.tsx
import { useState } from "react";
import { useAuth } from "../../account/AuthContext";
import { useFlaggedItems } from "../../account/useFlaggedItems";
import { Dialog } from "../ui/Dialog";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";

const REASONS = [
  { value: "wrong_party_name", label: "Wrong party name" },
  { value: "wrong_date", label: "Wrong recording date" },
  { value: "wrong_document_type", label: "Wrong document type" },
  { value: "missing_instrument", label: "Missing instrument" },
  { value: "other", label: "Other" },
];

export function FlagInstrumentButton({
  instrumentNumber,
  parcelApn,
}: {
  instrumentNumber: string;
  parcelApn?: string;
}) {
  const { user, signIn } = useAuth();
  const { submit } = useFlaggedItems();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0].value);
  const [note, setNote] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const onTrigger = () => {
    if (!user) { signIn(); return; }
    setOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = submit({ instrument_number: instrumentNumber, parcel_apn: parcelApn, reason, note: note.trim() });
    setSubmittedRef(entry.ref);
    toast.show({ tone: "success", title: "Flag received", body: entry.ref });
  };

  const close = () => {
    setOpen(false);
    setReason(REASONS[0].value);
    setNote("");
    setSubmittedRef(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={onTrigger}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded px-1"
      >
        <Icon name="flag" size={13} />
        Report an issue
      </button>

      <Dialog open={open} onClose={close} title="Report an issue" size="sm">
        {submittedRef ? (
          <div className="space-y-3 text-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <Icon name="check" size={20} />
            </div>
            <p className="text-slate-700">
              Report received. Reference number:
              <span className="mt-1 block font-mono font-semibold text-slate-900">{submittedRef}</span>
            </p>
            <p className="text-xs text-slate-500">
              A curator will review. You'll see the response in your inbox.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-lg bg-moat-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-moat-800"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-xs text-slate-500">
              Instrument <span className="font-mono">{instrumentNumber}</span>
            </p>
            <div>
              <label htmlFor="reason" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reason
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="note" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Note (optional)
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
              >
                Submit flag
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
```

- [x] **Step 4: Modify ProofDrawer**

Open `src/components/ProofDrawer.tsx`. Find the drawer's *top action row* (the header area that contains the close button and any citation-copy affordance). Add one import at the top:

```tsx
import { FlagInstrumentButton } from "./account/FlagInstrumentButton";
```

Inside the header action row, as the *last* item, insert:

```tsx
<FlagInstrumentButton
  instrumentNumber={instrument.instrument_number}
  parcelApn={parcel.apn}
/>
```

Do not move, rename, or restructure any other elements. If the row uses dot separators between items, leave that style in place.

- [x] **Step 5: Run tests, verify pass**

Run: `npx vitest run tests/account/flag-instrument-button.dom.test.tsx tests/proof-drawer-synthetic-pill.dom.test.tsx`
Expected: new test PASS; pre-existing drawer test unchanged.

- [x] **Step 6: Commit**

```bash
git add src/components/account/FlagInstrumentButton.tsx src/components/ProofDrawer.tsx tests/account/flag-instrument-button.dom.test.tsx
git commit -m "feat(account): FlagInstrumentButton on ProofDrawer with ref-number receipt"
```

---

## Task 21: CorrectionRequestButton + Parcel/Party Header Wiring

**Files:**
- Create: `src/components/account/CorrectionRequestButton.tsx`
- Modify: `src/components/ChainOfTitle.tsx`
- Modify: `src/components/PartyPage.tsx`
- Test: `tests/account/correction-request-button.dom.test.tsx`

> **Parallel-agent safety note:** The Party Search Hero agent may also be editing `PartyPage.tsx`. To avoid a conflict, add only a single `<StarButton/>` as a sibling of the party name heading. Do not restructure surrounding markup.

- [x] **Step 1: Write the failing test**

```tsx
// tests/account/correction-request-button.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { ToastProvider } from "../../src/components/ui/Toast";
import { CorrectionRequestButton } from "../../src/components/account/CorrectionRequestButton";

function mount() {
  localStorage.setItem("mcr.account.signedIn.v1", "1");
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <CorrectionRequestButton parcelApn="304-78-386" />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("CorrectionRequestButton", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("submits a correction and returns a ref", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: /request correction/i }));
    await userEvent.type(screen.getByLabelText(/claim/i), "I am the record owner.");
    await userEvent.type(screen.getByLabelText(/correction/i), "Name typo.");
    await userEvent.click(screen.getByRole("button", { name: /submit correction/i }));
    expect(await screen.findByText(/MCR-CORR-\d{4}-\d{5}/)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/correction-request-button.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement CorrectionRequestButton**

```tsx
// src/components/account/CorrectionRequestButton.tsx
import { useState } from "react";
import { useAuth } from "../../account/AuthContext";
import { useCorrectionRequests } from "../../account/useCorrectionRequests";
import { Dialog } from "../ui/Dialog";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";

export function CorrectionRequestButton({ parcelApn }: { parcelApn: string }) {
  const { user, signIn } = useAuth();
  const { submit } = useCorrectionRequests();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [claim, setClaim] = useState("");
  const [correction, setCorrection] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const onTrigger = () => {
    if (!user) { signIn(); return; }
    setOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.trim() || !correction.trim()) return;
    const entry = submit({ parcel_apn: parcelApn, claim: claim.trim(), correction: correction.trim() });
    setSubmittedRef(entry.ref);
    toast.show({ tone: "success", title: "Correction requested", body: entry.ref });
  };

  const close = () => {
    setOpen(false);
    setClaim("");
    setCorrection("");
    setSubmittedRef(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={onTrigger}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-moat-400 hover:bg-moat-50 hover:text-moat-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
      >
        <Icon name="gavel" size={13} />
        This is me · request correction
      </button>

      <Dialog open={open} onClose={close} title={`Request correction on ${parcelApn}`} size="sm">
        {submittedRef ? (
          <div className="space-y-3 text-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <Icon name="check" size={20} />
            </div>
            <p className="text-slate-700">
              Correction requested. Reference:
              <span className="mt-1 block font-mono font-semibold text-slate-900">{submittedRef}</span>
            </p>
            <p className="text-xs text-slate-500">
              A county records specialist will review. Only the custodian can adjudicate corrections to the public record.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-lg bg-moat-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-moat-800"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="claim" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Your claim
              </label>
              <textarea
                id="claim"
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                rows={2}
                placeholder="e.g. I am the record owner of this parcel."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
              />
            </div>
            <div>
              <label htmlFor="correction" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Requested correction
              </label>
              <textarea
                id="correction"
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                rows={3}
                placeholder="Describe what should be corrected in the record."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-moat-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-moat-800"
              >
                Submit correction
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
```

- [x] **Step 4: Wire StarButton + CorrectionRequestButton into ChainOfTitle header**

Open `src/components/ChainOfTitle.tsx`. At the top of the component's rendered markup, find the *parcel header* area (the element displaying address / APN / owner). Add two imports:

```tsx
import { StarButton } from "./account/StarButton";
import { CorrectionRequestButton } from "./account/CorrectionRequestButton";
```

Inside the header's rightmost column — or at the end of the header if it is a single row — add:

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <StarButton kind="parcel" id={parcel.apn} label={parcel.apn} />
  <CorrectionRequestButton parcelApn={parcel.apn} />
</div>
```

Additive only. Do not reorder existing header content.

- [x] **Step 5: Wire StarButton into PartyPage header**

Open `src/components/PartyPage.tsx`. Locate the heading that displays the party's display name and normalized name (near the top of the rendered output; `normalizedName` is available from the route params, `hit.display_name` from `findPartyByNormalizedName`). Add one import:

```tsx
import { StarButton } from "./account/StarButton";
```

Next to the party name heading, add:

```tsx
<StarButton kind="party" id={normalizedName!} label={hit.display_name ?? normalizedName!} />
```

Single additive node. Do not restructure.

- [x] **Step 6: Run tests, verify all pass**

Run: `npx vitest run tests/account/correction-request-button.dom.test.tsx tests/ChainOfTitle.test.tsx tests/PartyPage.test.tsx`
Expected: new test PASS; pre-existing ChainOfTitle + PartyPage tests unchanged.

- [x] **Step 7: Commit**

```bash
git add src/components/account/CorrectionRequestButton.tsx src/components/ChainOfTitle.tsx src/components/PartyPage.tsx tests/account/correction-request-button.dom.test.tsx
git commit -m "feat(account): CorrectionRequestButton + Star affordances on parcel/party headers"
```

---

## Task 22: Wire /account/* Routes

**Files:**
- Modify: `src/router.tsx`
- Test: `tests/account/account-routes.test.ts`

- [x] **Step 1: Write the failing test**

```ts
// tests/account/account-routes.test.ts
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
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/account-routes.test.ts`
Expected: FAIL.

- [x] **Step 3: Modify src/router.tsx**

Open `src/router.tsx`. Near the existing component imports (around line 17-38), add:

```tsx
import { AccountLayout } from "./components/account/AccountLayout";
import { AccountDashboard } from "./components/account/AccountDashboard";
import { AccountWatchlist } from "./components/account/AccountWatchlist";
import { AccountInbox } from "./components/account/AccountInbox";
import { AccountPreferences } from "./components/account/AccountPreferences";
import { AccountStatutoryNotices } from "./components/account/AccountStatutoryNotices";
import { AccountRecordsRequest } from "./components/account/AccountRecordsRequest";
import { AccountCommitments } from "./components/account/AccountCommitments";
```

Inside the `<AppShell/>` children array in the `routes` export, insert this entry BEFORE the existing `{ id: "not-found", path: "*", ... }` catch-all:

```tsx
{
  id: "account",
  path: "account",
  element: <AccountLayout />,
  children: [
    { index: true, element: <AccountDashboard /> },
    { path: "watchlist", element: <AccountWatchlist /> },
    { path: "inbox", element: <AccountInbox /> },
    { path: "preferences", element: <AccountPreferences /> },
    { path: "notices", element: <AccountStatutoryNotices /> },
    { path: "records-request", element: <AccountRecordsRequest /> },
    { path: "commitments", element: <AccountCommitments /> },
  ],
},
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run tests/account/account-routes.test.ts tests/routing.test.ts`
Expected: new test PASS; pre-existing routing tests unchanged.

- [x] **Step 5: Commit**

```bash
git add src/router.tsx tests/account/account-routes.test.ts
git commit -m "feat(account): wire /account/* route subtree"
```

---

## Task 23: Curator Queue Bridge + /subscribe Gateway

**Files:**
- Modify: `src/components/CuratorQueue.tsx`
- Modify: `src/components/SubscribePlaceholder.tsx`
- Test: `tests/account/curator-queue-bridge.dom.test.tsx`
- Test: `tests/account/subscribe-placeholder.dom.test.tsx`

- [x] **Step 1: Write the curator-queue bridge test**

```tsx
// tests/account/curator-queue-bridge.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { CuratorQueue } from "../../src/components/CuratorQueue";

describe("CuratorQueue — user-filed flag bridge", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("renders user-filed flags from localStorage alongside seeded anomalies", () => {
    localStorage.setItem(
      "mcr.account.flaggedItems.v1",
      JSON.stringify([{
        id: "x",
        ref: "MCR-REPORT-2026-00001",
        instrument_number: "20210075858",
        parcel_apn: "304-78-386",
        reason: "wrong_party_name",
        note: "typo in grantor",
        submitted_at: "2026-04-18T00:00:00Z",
        status: "pending",
      }]),
    );
    render(<MemoryRouter><CuratorQueue /></MemoryRouter>);
    expect(screen.getByText(/MCR-REPORT-2026-00001/)).toBeInTheDocument();
    expect(screen.getByText(/typo in grantor/i)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/account/curator-queue-bridge.dom.test.tsx`
Expected: FAIL.

- [x] **Step 3: Modify CuratorQueue**

Open `src/components/CuratorQueue.tsx`. Add import at top:

```tsx
import { readAllFlaggedItemsFromStorage } from "../account/useFlaggedItems";
import { Card, CardBody, CardHeader } from "./ui/Card";
import { Chip } from "./ui/Chip";
```

Inside the `CuratorQueue` function body, right after the existing `const visible = all.filter(...)` line, add:

```tsx
const userFlags = readAllFlaggedItemsFromStorage();
```

Inside the `<StaffPageFrame>` JSX, as the *first* child (BEFORE the existing `visible.length === 0 ? ...` conditional), add:

```tsx
{userFlags.length > 0 && (
  <Card className="mb-4">
    <CardHeader>
      <h2 className="text-sm font-semibold text-slate-800">User-filed issue reports</h2>
      <Chip tone="info">{userFlags.length}</Chip>
    </CardHeader>
    <CardBody className="p-0">
      <ul className="divide-y divide-slate-100">
        {userFlags.map((f) => (
          <li key={f.id} className="px-5 py-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-slate-500">{f.ref}</span>
                <span className="font-semibold text-slate-900">{f.reason.replace(/_/g, " ")}</span>
              </div>
              <time className="text-[11px] text-slate-500">
                {new Date(f.submitted_at).toLocaleDateString()}
              </time>
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Instrument <span className="font-mono">{f.instrument_number}</span>
              {f.parcel_apn && <> · Parcel <span className="font-mono">{f.parcel_apn}</span></>}
            </div>
            {f.note && <p className="mt-1 text-sm text-slate-700">{f.note}</p>}
          </li>
        ))}
      </ul>
    </CardBody>
  </Card>
)}
```

- [x] **Step 4: Run the bridge test, verify pass**

Run: `npx vitest run tests/account/curator-queue-bridge.dom.test.tsx tests/curator-queue.dom.test.tsx`
Expected: both PASS.

- [x] **Step 5: Write the subscribe-gateway test**

```tsx
// tests/account/subscribe-placeholder.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../../src/account/AuthContext";
import { SubscribePlaceholder } from "../../src/components/SubscribePlaceholder";

describe("SubscribePlaceholder", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("signed-out shows sign-in copy", () => {
    render(
      <MemoryRouter initialEntries={["/subscribe?apn=304-78-386"]}>
        <AuthProvider><SubscribePlaceholder /></AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/sign in to subscribe/i)).toBeInTheDocument();
  });

  it("signed-in links into watchlist and preferences", () => {
    localStorage.setItem("mcr.account.signedIn.v1", "1");
    render(
      <MemoryRouter initialEntries={["/subscribe?apn=304-78-386"]}>
        <AuthProvider><SubscribePlaceholder /></AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /open watchlist/i })).toHaveAttribute("href", "/account/watchlist");
    expect(screen.getByRole("link", { name: /notification preferences/i })).toHaveAttribute("href", "/account/preferences");
  });
});
```

- [x] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/account/subscribe-placeholder.dom.test.tsx`
Expected: FAIL.

- [x] **Step 7: Replace SubscribePlaceholder**

Open `src/components/SubscribePlaceholder.tsx`. Replace entire file:

```tsx
// src/components/SubscribePlaceholder.tsx
import { Link, useSearchParams } from "react-router";
import { useAuth } from "../account/AuthContext";
import { SignInButton } from "./account/SignInButton";
import { Card, CardBody } from "./ui/Card";
import { PreviewPill } from "./account/PreviewPill";

export function SubscribePlaceholder() {
  const [params] = useSearchParams();
  const apn = params.get("apn");
  const { user } = useAuth();

  const title = `Subscribe to new filings${apn ? ` for parcel ${apn}` : ""}`;

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-6 py-12 space-y-5">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-recorder-900">{title}</h1>
          <PreviewPill />
        </header>
        <Card>
          <CardBody>
            <p className="text-sm leading-relaxed text-slate-700">
              Sign in to subscribe. The county portal notifies you the same day a new document records
              against a parcel you're watching — no third-party plant, no lag.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Title-plant vendors batch their updates every 4–7 days. The county can offer this because
              the county owns the recording pipeline.
            </p>
            <div className="mt-4">
              <SignInButton />
            </div>
          </CardBody>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-12 space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold text-recorder-900">{title}</h1>
        <PreviewPill />
      </header>
      <Card>
        <CardBody>
          <p className="text-sm text-slate-700">Use your account to watch parcels and tune delivery.</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/account/watchlist" className="text-moat-700 hover:underline">Open watchlist →</Link></li>
            <li><Link to="/account/preferences" className="text-moat-700 hover:underline">Notification preferences →</Link></li>
            {apn && <li><Link to={`/parcel/${apn}`} className="text-moat-700 hover:underline">Open parcel {apn} →</Link></li>}
          </ul>
        </CardBody>
      </Card>
    </main>
  );
}
```

- [x] **Step 8: Run tests, verify pass**

Run: `npx vitest run tests/account/subscribe-placeholder.dom.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 9: Commit**

```bash
git add src/components/CuratorQueue.tsx src/components/SubscribePlaceholder.tsx tests/account/curator-queue-bridge.dom.test.tsx tests/account/subscribe-placeholder.dom.test.tsx
git commit -m "feat(account): curator-queue bridge + /subscribe gateway into /account"
```

---

## Task 24: Provenance Doc

**Files:**
- Create: `docs/account-portal-demo.md`

- [x] **Step 1: Write the provenance doc**

```markdown
# Demo Account Portal — Provenance & Scope

This document records which portal surfaces are real vs demo-only so a
reviewer is never surprised during the demo.

## Real behavior

- Watchlist state (parcels + parties) — localStorage, persists across reload.
- Notification read/unread — localStorage.
- Flag submissions — localStorage; visible to `/staff/queue` in-session.
- Correction requests, records requests, commitment exports — localStorage.
- Recently-viewed list — localStorage, 8-item rolling dedup.

## Faked (labeled `<PreviewPill/>` in the UI)

- Sign-in — one-click hardcoded demo user (`src/data/account/demo-user.json`).
  No OAuth, no password, no session crypto.
- Email/SMS delivery — preference toggles persist to localStorage. No real
  email or SMS is sent.
- Notification seed — pre-generated fixtures in
  `src/data/account/seed-notifications.json`, filtered at render time by the
  user's watchlist. In production these come from a live events stream.
- Statutory notices — seeded from
  `src/data/account/seed-statutory-notices.json`, filtered by watched-parcel
  APN + neighbor relationships.

## Not implemented, deliberately

- Multi-user / teams / role-based permissions.
- Real OAuth (Google/Microsoft) — the demo button maps to a fixed user.
- Billing / paid tiers — different pitch, different demo.
- 2FA, password reset, session management — no passwords exist here.

## Moat-relevant account features

Three surfaces are structurally county-only and cannot be replicated by any
title plant:

1. **Statutory notice inbox** (`/account/notices`) — only the custodian
   publishes tax sales, probate notices, lis pendens.
2. **Correction requests** (parcel-page button) — only the custodian can
   adjudicate corrections to the public record.
3. **Records requests / FOIA** (`/account/records-request`) — only the
   custodian fulfills public-records requests under state law.

Each surface frames this custodian-only role inline so a reviewer understands
why the feature cannot exist on a title plant.
```

- [x] **Step 2: Commit**

```bash
git add docs/account-portal-demo.md
git commit -m "docs(account): demo-vs-real provenance and moat mapping"
```

---

## Task 25: End-to-End Smoke Test + Final Verification

**Files:**
- Test: `tests/account/portal-smoke.dom.test.tsx`

- [x] **Step 1: Write the smoke test**

```tsx
// tests/account/portal-smoke.dom.test.tsx
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../../src/router";

vi.mock("react-map-gl/maplibre", () => ({
  default: () => null, Source: () => null, Layer: () => null, Marker: () => null,
}));

describe("portal smoke", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("signs in → dashboard → watchlist → inbox → preferences → signs out", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/"] });
    render(<RouterProvider router={router} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in with google/i }));
    await userEvent.click(screen.getByRole("button", { name: /jordan/i }));
    await userEvent.click(screen.getByRole("link", { name: /dashboard/i }));

    expect(screen.getByText(/welcome back, jordan/i)).toBeInTheDocument();

    router.navigate("/account/watchlist");
    expect(await screen.findByText(/nothing watched yet/i)).toBeInTheDocument();

    router.navigate("/account/inbox");
    expect(await screen.findByRole("heading", { name: /inbox/i })).toBeInTheDocument();

    router.navigate("/account/preferences");
    expect(await screen.findByRole("switch", { name: /email notifications/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /jordan/i }));
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run the smoke test**

Run: `npx vitest run tests/account/portal-smoke.dom.test.tsx`
Expected: PASS.

If it fails, the failure pinpoints a real bug in an earlier task — fix the root cause, don't weaken the test.

- [x] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all tests pass. Pre-existing suites should not regress — AuthProvider and HeaderBar are additive.

If any pre-existing test breaks, diagnose and fix the root cause. Common issues:
- A pre-existing test mounts `<RootLayout/>` without `<MemoryRouter/>` — the test must now include a router since `HeaderBar` uses `<Link/>`. Wrap in `<MemoryRouter/>` if needed.
- A snapshot test relied on a specific DOM shape — regenerate the snapshot only after visually confirming the new output is correct.

- [x] **Step 4: Run the production build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors. If a type error surfaces, fix it — do not `any`-cast around it.

- [x] **Step 5: Commit**

```bash
git add tests/account/portal-smoke.dom.test.tsx
git commit -m "test(account): end-to-end smoke for the full portal flow"
```

- [x] **Step 6: Post-work summary**

Post a short summary to the user, then stop. Do not open a PR or merge. Suggested summary:

```
Portal plan complete on branch feat/demo-account-portal.
25 tasks shipped, 25 commits. Full test suite green, production build green.

New surfaces: /account (dashboard), /account/watchlist, /account/inbox,
/account/preferences, /account/notices, /account/records-request,
/account/commitments.

Cross-surface affordances: <StarButton/> on parcel + party headers,
<CorrectionRequestButton/> on parcel header, <FlagInstrumentButton/> in
ProofDrawer, curator queue now shows user-filed flags.

All demo-only surfaces are labeled <PreviewPill/>. Provenance documented
in docs/account-portal-demo.md.

Ready for integration once the other three agents land.
```

---

## Self-Review

**Spec coverage:**
- Sign in / avatar / menu / bell → Tasks 10, 11.
- Bookmark parcels + parties → Tasks 3, 9, 14, 21.
- Notifications inbox + bell → Tasks 5, 10, 15.
- Email/SMS preferences → Task 16.
- Flag issues → Tasks 6, 20.
- Staff-queue response loop → Task 23.
- Statutory notices → Task 17.
- Correction requests → Tasks 7, 21.
- Records requests / FOIA → Tasks 7, 18.
- Commitments history → Tasks 8, 19.
- Recently viewed → Tasks 4, 13.
- Activity digest on dashboard → Task 13.
- /subscribe gateway → Task 23.
- Preview badges on every faked surface → Tasks 9 (pill), 13, 15, 16, 17, 18.
- Provenance doc → Task 24.
- Smoke test + full-suite + build verification → Task 25.

**Placeholder scan:** No TBDs. Every step contains code or exact modification instructions.

**Type consistency:**
- `MCR-REPORT-YYYY-NNNNN`, `MCR-CORR-YYYY-NNNNN`, `MCR-FOIA-YYYY-NNNNN` all generated by structurally identical `makeRef` helpers (Tasks 6, 7).
- `Notification.kind` defined once (Task 5), consumed in Task 10 (bell) and Task 15 (inbox).
- `Icon` name union defined once (Task 1), used everywhere.
- `useWatchlist` returns `{ parcels, parties, toggleParcel, toggleParty, isParcelWatched, isPartyWatched }` — consumed identically in Tasks 9, 10, 11, 13, 14.
- Fixtures' JSON shapes match TypeScript `interface`s declared alongside their consumers.

**Parallel-agent merge risks:**
- `RootLayout.tsx` (Task 11) — Live AI and other agents may also touch. Our change wraps children in `<AuthProvider>` + `<ToastProvider>` and adds `<HeaderBar/>` above `<PipelineBanner/>`; additive. Merge by keeping both.
- `ProofDrawer.tsx` (Task 20) — Live AI may add an extraction panel in the drawer body. Our change adds one node at the end of the header action row. Merge by keeping both regions.
- `ChainOfTitle.tsx`, `PartyPage.tsx` (Task 21) — Party Search Hero may add adjacent affordances. Our changes are two single-node additions. Merge by keeping all added nodes.
- `LandingPage.tsx` — not touched by this plan at all.

**Known scope limits (intentional):**
- No real OAuth, no real email/SMS delivery — labeled `<PreviewPill/>` everywhere.
- No cross-session sync. localStorage only.
- `useRecentlyViewed.record()` is defined but not auto-called from parcel/party routes. Integration into `ChainRouteInner`/`PartyPage` is a follow-up — the dashboard renders whatever gets recorded, so wiring can land post-integration without breaking the demo.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-demo-account-portal.md`.

**For the terminal agent running this plan:** you are already inside the worktree per the handoff section at the top. Work task-by-task. After each task: write the failing test, implement, run the task's tests, commit with the task's commit message. Do not skip steps. Do not batch commits. When all 25 tasks are checked, run the final full suite and build, then post the summary and stop.

**For the human sprint owner:** two execution options if you'd rather run this in-session:

1. **Subagent-Driven (recommended in-session)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints for review.

Which approach?

