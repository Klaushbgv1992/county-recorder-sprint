import { Link } from "react-router";
import { useCommitmentHistory } from "../../account/useCommitmentHistory";
import { Card, CardBody } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";

export function AccountCommitments() {
  const { items } = useCommitmentHistory();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-recorder-900">My commitments</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every commitment PDF you've exported from a parcel page.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon="file"
          title="No commitments exported yet"
          body="Open any parcel and click Export Commitment. The PDF appears here with a re-export link."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {items.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <Link to={`/parcel/${c.parcel_apn}`} className="font-mono text-sm text-moat-700 hover:underline">
                      {c.parcel_apn}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <time>{new Date(c.exported_at).toLocaleString()}</time>
                      <Chip tone="neutral">{c.instrument_count} instruments</Chip>
                      {c.open_encumbrance_count > 0 && (
                        <Chip tone="warn">{c.open_encumbrance_count} open</Chip>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/parcel/${c.parcel_apn}/commitment/new`}
                    className="shrink-0 text-xs font-medium text-moat-700 hover:underline"
                  >
                    Re-export →
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
