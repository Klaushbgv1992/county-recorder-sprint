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
