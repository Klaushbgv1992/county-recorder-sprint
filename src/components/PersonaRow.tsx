import { useNavigate } from "react-router";
import { useTerminology } from "../terminology/TerminologyContext";

const PILL_BASE =
  "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500";

const PILL_CLASS = `${PILL_BASE} bg-white text-recorder-700 border-recorder-200 hover:bg-recorder-50 hover:border-recorder-300`;

export function PersonaRow() {
  const navigate = useNavigate();
  const { setMode } = useTerminology();

  const goHomeowner = () => {
    setMode("plain");
    navigate("/parcel/304-78-386/story");
  };
  const goTitlePro = () => {
    setMode("professional");
    navigate("/parcel/304-78-386/encumbrances");
  };
  const goStaff = () => {
    navigate("/staff");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs text-slate-500 mr-1">Quick start:</span>
      <button
        type="button"
        onClick={goHomeowner}
        className={PILL_CLASS}
        aria-label="For homeowners — read this parcel's ownership story"
      >
        For homeowners
      </button>
      <button
        type="button"
        onClick={goTitlePro}
        className={PILL_CLASS}
        aria-label="For title professionals — open encumbrance lifecycle in professional terminology"
      >
        For title professionals
      </button>
      <button
        type="button"
        onClick={goStaff}
        className={PILL_CLASS}
        aria-label="For county staff — open staff workbench"
      >
        For county staff
      </button>
    </div>
  );
}
