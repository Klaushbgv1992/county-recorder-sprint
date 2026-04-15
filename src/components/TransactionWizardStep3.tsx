import type { BIItem } from "../types/commitment";

interface Step3Props {
  items: BIItem[];
  expandedItemIds: Set<string>;
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TransactionWizardStep3({
  items,
  expandedItemIds,
  onToggle,
  onBack,
  onNext,
}: Step3Props) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Schedule B-I Requirements ({items.length} items)
      </h2>
      <ol className="space-y-3 mb-6">
        {items.map((item, idx) => {
          const expanded = expandedItemIds.has(item.item_id);
          const origin =
            item.origin_anomaly_id ?? item.origin_lifecycle_id ?? "—";
          return (
            <li
              key={item.item_id}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-gray-500 mt-0.5">
                  {idx + 1}.
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{item.text}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onToggle(item.item_id)}
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >
                      {expanded ? "Hide why" : "Why this item"}
                    </button>
                    <span className="text-[11px] text-gray-400">
                      {item.template_id} · origin: {origin}
                    </span>
                  </div>
                  {expanded && (
                    <p className="mt-3 px-3 py-2 text-xs text-gray-700 bg-gray-50 border-l-4 border-amber-400 rounded">
                      {item.why}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </section>
  );
}
