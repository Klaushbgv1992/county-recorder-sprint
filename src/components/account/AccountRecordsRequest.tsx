import { useState } from "react";
import { useRecordsRequests } from "../../account/useRecordsRequests";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { useToast } from "../ui/Toast";
import { PreviewPill } from "./PreviewPill";

export function AccountRecordsRequest() {
  const { items, submit } = useRecordsRequests();
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const toast = useToast();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !details.trim()) return;
    const entry = submit({ subject: subject.trim(), details: details.trim() });
    toast.show({ tone: "success", title: "Request submitted", body: entry.ref });
    setSubject("");
    setDetails("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-recorder-900">Records requests</h1>
          <p className="mt-1 text-sm text-slate-600">
            Public-records requests the county is legally required to fulfill.
          </p>
        </div>
        <PreviewPill productionNote="production routes to the county records office with statutory deadlines" />
      </header>

      <Card>
        <CardBody>
          <p className="text-xs leading-relaxed text-slate-700">
            Only the county fulfills a public-records request. Title plants cannot. Submissions
            here generate a reference number, appear in your history, and route to the staff
            queue.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-800">Submit a new request</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Subject
              </label>
              <input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Copy of plat Book 553 Page 15"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
              />
            </div>
            <div>
              <label htmlFor="details" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Details
              </label>
              <textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder="Recording numbers, date ranges, parcel APNs — anything that helps the office locate the records."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-moat-500 focus:outline-none focus:ring-2 focus:ring-moat-500/30"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-moat-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-moat-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
              >
                Submit request
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-800">Your requests</h2>
            <Chip>{items.length}</Chip>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {items.map((r) => (
                <li key={r.id} className="px-5 py-3.5">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{r.subject}</span>
                    <span className="font-mono text-[11px] text-slate-500">{r.ref}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{r.details}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <time className="text-[11px] text-slate-500">
                      {new Date(r.requested_at).toLocaleDateString()}
                    </time>
                    <Chip tone={r.status === "fulfilled" ? "success" : "info"}>
                      {r.status.replace("_", " ")}
                    </Chip>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
