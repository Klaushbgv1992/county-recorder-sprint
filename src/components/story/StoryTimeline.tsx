import type { StoryPageData } from "../../narrative/types";

export function StoryTimeline({ data }: { data: StoryPageData }) {
  return (
    <section aria-labelledby="story-timeline">
      <h2 id="story-timeline" className="text-lg font-semibold text-recorder-900">
        Ownership history
      </h2>
      <div className="mt-3 space-y-4 max-w-prose">
        {data.timelineBlocks.map((block, i) => (
          <div key={`${block.pattern_id}-${i}`}>
            <p className="text-[15px] leading-relaxed text-slate-800">{block.prose}</p>
            {block.callouts.map((c, j) => (
              <aside
                key={j}
                className="mt-2 pl-3 border-l-2 border-moat-300 text-sm text-slate-600"
              >
                {c}
              </aside>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
