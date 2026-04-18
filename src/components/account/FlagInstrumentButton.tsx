import { useState } from "react";
import { useAuth } from "../../account/AuthContext";
import { useFlaggedItems } from "../../account/useFlaggedItems";
import { Dialog } from "../ui/Dialog";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";

const REASONS = [
  { value: "wrong_party_name", label: "Wrong party name" },
  { value: "wrong_date", label: "Wrong recording date" },
  { value: "wrong_document_type", label: "Wrong document type" },
  { value: "missing_instrument", label: "Missing instrument" },
  { value: "other", label: "Other" },
];

export function FlagInstrumentButton({
  instrumentNumber,
  parcelApn,
}: {
  instrumentNumber: string;
  parcelApn?: string;
}) {
  const { user, signIn } = useAuth();
  const { submit } = useFlaggedItems();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0].value);
  const [note, setNote] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const onTrigger = () => {
    if (!user) { signIn(); return; }
    setOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = submit({ instrument_number: instrumentNumber, parcel_apn: parcelApn, reason, note: note.trim() });
    setSubmittedRef(entry.ref);
    toast.show({ tone: "success", title: "Flag received", body: entry.ref });
  };

  const close = () => {
    setOpen(false);
    setReason(REASONS[0].value);
    setNote("");
    setSubmittedRef(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={onTrigger}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded px-1"
      >
        <Icon name="flag" size={13} />
        Report an issue
      </button>

      <Dialog open={open} onClose={close} title="Report an issue" size="sm">
        {submittedRef ? (
          <div className="space-y-3 text-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <Icon name="check" size={20} />
            </div>
            <p className="text-slate-700">
              Report received. Reference number:
              <span className="mt-1 block font-mono font-semibold text-slate-900">{submittedRef}</span>
            </p>
            <p className="text-xs text-slate-500">
              A curator will review. You'll see the response in your inbox.
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
            <p className="text-xs text-slate-500">
              Instrument <span className="font-mono">{instrumentNumber}</span>
            </p>
            <div>
              <label htmlFor="reason" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reason
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="note" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Note (optional)
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
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
                className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
              >
                Submit flag
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
