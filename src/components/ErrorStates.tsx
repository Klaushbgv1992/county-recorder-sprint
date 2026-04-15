import { Link } from "react-router";

function AlertIcon() {
  return (
    <svg aria-hidden="true" className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  );
}

interface ErrorStateProps {
  title: string;
  body: string;
  cta?: { label: string; to: string };
}

function ErrorStateShell({ title, body, cta }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3">
      <AlertIcon />
      <p className="font-semibold text-red-700">{title}</p>
      <p className="text-sm text-gray-500 max-w-xs">{body}</p>
      {cta && (
        <Link to={cta.to} className="text-sm text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function GISFetchFailure({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 space-y-3">
      <AlertIcon />
      <p className="text-sm font-medium text-red-700">Map tiles unavailable</p>
      <p className="text-xs text-gray-500">GIS data could not be loaded. The parcel boundary may not display.</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500">
          Retry
        </button>
      )}
    </div>
  );
}

export function InvalidAPN({ apn }: { apn?: string }) {
  return (
    <ErrorStateShell
      title="Invalid APN"
      body={apn ? `"${apn}" is not a recognized Maricopa County APN format.` : "The APN format is not recognized."}
      cta={{ label: "← Back to search", to: "/" }}
    />
  );
}

export function CorpusLoadError({ error }: { error?: string }) {
  return (
    <ErrorStateShell
      title="Corpus load error"
      body={error ?? "The data corpus could not be loaded. Check the console for details."}
      cta={{ label: "← Back to search", to: "/" }}
    />
  );
}
