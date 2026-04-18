import { useState } from "react";
import { useAuth } from "../../account/AuthContext";
import { useCorrectionRequests } from "../../account/useCorrectionRequests";
import { Dialog } from "../ui/Dialog";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";

export function CorrectionRequestButton({ parcelApn }: { parcelApn: string }) {
  const { user, signIn } = useAuth();
  const { submit } = useCorrectionRequests();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [claim, setClaim] = useState("");
  const [correction, setCorrection] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const onTrigger = () => {
    if (!user) { signIn(); return; }
    setOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.trim() || !correction.trim()) return;
    const entry = submit({ parcel_apn: parcelApn, claim: claim.trim(), correction: correction.trim() });
    setSubmittedRef(entry.ref);
    toast.show({ tone: "success", title: "Correction requested", body: entry.ref });
  };

  const close = () => {
    setOpen(false);
    setClaim("");
    setCorrection("");
    setSubmittedRef(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={onTrigger}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-moat-400 hover:bg-moat-50 hover:text-moat-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
      >
        <Icon name="gavel" size={13} />
        This is me · request correction
      </button>

      <Dialog open={open} onClose={close} title={`Request correction on ${parcelApn}`} size="sm">
        {submittedRef ? (
          <div className="space-y-3 text-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <Icon name="check" size={20} />
            </div>
            <p className="text-slate-700">
              Correction requested. Reference:
              <span className="mt-1 block font-mono font-semibold text-slate-900">{submittedRef}</span>
            </p>
            <p className="text-xs text-slate-500">
              A county records specialist will review. Only the custodian can adjudicate corrections to the public record.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-lg bg-moat-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-moat-800"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="claim" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Your claim
              </label>
              <textarea
                id="claim"
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                rows={2}
                placeholder="e.g. I am the record owner of this parcel."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
              />
            </div>
            <div>
              <label htmlFor="correction" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Requested correction
              </label>
              <textarea
                id="correction"
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                rows={3}
                placeholder="Describe what should be corrected in the record."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-moat-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-moat-800"
              >
                Submit correction
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
