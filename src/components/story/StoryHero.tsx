import type { StoryPageData } from "../../narrative/types";

export function StoryHero({ data }: { data: StoryPageData }) {
  return (
    <section aria-labelledby="story-hero">
      <h1 id="story-hero" className="text-3xl md:text-4xl font-semibold text-recorder-900 leading-tight">
        {data.hero.oneLiner}
      </h1>
      <p className="mt-2 text-xs text-slate-500">
        APN <span className="font-mono">{data.parcel.apn}</span>
        {data.parcel.subdivision ? ` · ${data.parcel.subdivision}` : null}
      </p>
    </section>
  );
}
