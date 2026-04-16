import { Link } from "react-router";

// ---- inline SVG icons ----
function SearchOffIcon() {
  return (
    <svg aria-hidden="true" className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zM9 9l6 6" />
    </svg>
  );
}

function FileOffIcon() {
  return (
    <svg aria-hidden="true" className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 13h6m-3-3v6M3 17V7a2 2 0 0 1 2-2h6l2 2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body: string;
  cta?: { label: string; to: string };
}

function EmptyStateShell({ icon, title, body, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
      {icon}
      <p className="font-semibold text-gray-700">{title}</p>
      <p className="text-sm text-gray-500 max-w-xs">{body}</p>
      {cta && (
        <Link to={cta.to} className="text-sm text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

// Replaces the inline NotFoundPanel in router.tsx
export function NotInCorpusParcel({
  title = "Not in this corpus",
  message,
  backLink = "/",
}: {
  title?: string;
  message?: string;
  backLink?: string;
}) {
  return (
    <EmptyStateShell
      icon={<FileOffIcon />}
      title={title}
      body={message ?? "This parcel or instrument is not in the curated demo corpus."}
      cta={{ label: "← Back to search", to: backLink }}
    />
  );
}

export function NoSearchResults({ query }: { query?: string }) {
  return (
    <EmptyStateShell
      icon={<SearchOffIcon />}
      title="No results found"
      body={query ? `No instruments or parcels matched "${query}".` : "Try a different APN or name."}
      cta={{ label: "Back to search", to: "/" }}
    />
  );
}

export function NoAnomaliesFound() {
  return (
    <EmptyStateShell
      title="No anomalies detected"
      body="The automated rules found no flagged conditions in the current chain."
    />
  );
}

export function NoLifecyclesOpen() {
  return (
    <EmptyStateShell
      title="No open encumbrances"
      body="All recorded encumbrances in this corpus have been released or terminated."
    />
  );
}
