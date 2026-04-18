import { useState } from "react";
import { useAuth } from "../../account/AuthContext";
import { useWatchlist } from "../../account/useWatchlist";
import { Icon } from "../ui/Icon";

interface Props {
  kind: "parcel" | "party";
  id: string;
  label: string;
}

export function StarButton({ kind, id, label }: Props) {
  const { user, signIn } = useAuth();
  const wl = useWatchlist();
  const [hint, setHint] = useState(false);

  const watched = kind === "parcel" ? wl.isParcelWatched(id) : wl.isPartyWatched(id);

  const onClick = () => {
    if (!user) { setHint(true); return; }
    (kind === "parcel" ? wl.toggleParcel : wl.toggleParty)(id);
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={watched}
        title={watched ? `Watching ${label}` : `Watch ${label}`}
        className={`group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          watched
            ? "border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100/70 text-amber-900 shadow-sm"
            : "border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/40 hover:text-amber-800"
        }`}
      >
        <span className={`transition-transform ${watched ? "scale-110" : "group-hover:scale-110"}`}>
          <Icon name="star" size={14} filled={watched} />
        </span>
        {watched ? "Watching" : "Watch"}
      </button>
      {hint && !user && (
        <button
          type="button"
          onClick={() => { signIn(); setHint(false); }}
          className="text-xs text-slate-600 underline underline-offset-2 hover:text-slate-900"
        >
          Sign in to watch
        </button>
      )}
    </span>
  );
}
