import type { StoryPageData } from "../../narrative/types";

export function StoryWhatThisMeans({ data }: { data: StoryPageData }) {
  return (
    <section aria-labelledby="story-what-this-means" className="rounded-md bg-recorder-50 border border-recorder-100 p-4">
      <h2 id="story-what-this-means" className="text-base font-semibold text-recorder-900">
        What this means for you
      </h2>
      <p className="mt-2 text-sm text-slate-700 max-w-prose">{data.whatThisMeans}</p>
    </section>
  );
}
