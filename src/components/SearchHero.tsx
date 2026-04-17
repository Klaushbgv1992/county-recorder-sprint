import type { Searchable } from "../logic/searchable-index";

interface Props {
  value: string;
  onChange: (v: string) => void;
  searchables: Searchable[];
  onSelectCurated: (apn: string, instrumentNumber?: string) => void;
  onSelectDrawer: (apn: string) => void;
  onSelectInstrument: (apn: string, instrumentNumber: string) => void;
}

export function SearchHero({ value, onChange }: Props) {
  return (
    <section className="bg-white border-b border-slate-200 px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search APN, address, owner, subdivision, or 11-digit instrument"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-recorder-500 focus:border-transparent"
        />
      </div>
    </section>
  );
}
