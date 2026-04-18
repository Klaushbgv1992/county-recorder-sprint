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
