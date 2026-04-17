import type { StoryPageData } from "../../narrative/types";

export function StoryCurrentClaims({ data }: { data: StoryPageData }) {
  const heading = "Currently open claims";
  if (data.mode === "partial") {
    return (
      <section aria-labelledby="story-current">
        <h2 id="story-current" className="text-lg font-semibold text-recorder-900">{heading}</h2>
        <p className="mt-2 text-sm text-slate-700 max-w-prose">
          We don't have enough documents on file for this parcel to determine which claims are currently open. A title examiner would request older records from the county archive — the county has them.
        </p>
      </section>
    );
  }
  if (data.currentlyOpen.length === 0) {
    return (
      <section aria-labelledby="story-current">
        <h2 id="story-current" className="text-lg font-semibold text-recorder-900">{heading}</h2>
        <p className="mt-2 text-sm text-slate-700 max-w-prose">
          No claims are currently open against this property.
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="story-current">
      <h2 id="story-current" className="text-lg font-semibold text-recorder-900">{heading}</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-700 max-w-prose">
        {data.currentlyOpen.map((c) => (
          <li key={c.lifecycle_id}>{c.summary}</li>
        ))}
      </ul>
    </section>
  );
}
