import type { LifecycleStatus } from "../types";
import { useTerminology } from "../terminology/TerminologyContext";

const STATUS_CONFIG: Record<
  LifecycleStatus,
  { label: string; bg: string; text: string }
> = {
  open: { label: "Open", bg: "bg-red-100", text: "text-red-800" },
  released: { label: "Released", bg: "bg-green-100", text: "text-green-800" },
  unresolved: {
    label: "Unresolved",
    bg: "bg-amber-100",
    text: "text-amber-800",
  },
  possible_match: {
    label: "Possible Match",
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
};

interface Props {
  status: LifecycleStatus;
  overridden?: boolean;
}

export function StatusBadge({ status, overridden }: Props) {
  const { t } = useTerminology();
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {t(config.label)}
      {overridden && (
        <span className="text-[10px] opacity-70" title="Examiner override">
          ({t("override")})
        </span>
      )}
    </span>
  );
}
