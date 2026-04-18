import { Link } from "react-router";
import { useWatchlist } from "../../account/useWatchlist";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";

export function AccountWatchlist() {
  const wl = useWatchlist();
  const total = wl.parcels.length + wl.parties.length;

  if (total === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold text-recorder-900">Watchlist</h1>
        <div className="mt-6">
          <EmptyState
            icon="star"
            title="Nothing watched yet"
            body="Star any parcel or party to add it here. You'll get notifications when anything new records against it."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-recorder-900">Watchlist</h1>
        <p className="mt-1 text-sm text-slate-600">{total} item{total === 1 ? "" : "s"}</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon name="building" size={16} {...{ className: "text-slate-400" }} />
            <h2 className="text-sm font-semibold text-slate-800">Parcels</h2>
          </div>
          <Chip tone="info">{wl.parcels.length}</Chip>
        </CardHeader>
        <CardBody>
          {wl.parcels.length === 0 ? (
            <p className="text-xs text-slate-500">No parcels watched.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {wl.parcels.map((apn) => (
                <li key={apn} className="flex items-center justify-between py-2">
                  <Link to={`/parcel/${apn}`} className="font-mono text-sm text-moat-700 hover:underline">
                    {apn}
                  </Link>
                  <button
                    type="button"
                    onClick={() => wl.toggleParcel(apn)}
                    className="text-xs text-slate-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon name="star" size={16} {...{ className: "text-slate-400" }} />
            <h2 className="text-sm font-semibold text-slate-800">Parties</h2>
          </div>
          <Chip tone="moat">{wl.parties.length}</Chip>
        </CardHeader>
        <CardBody>
          {wl.parties.length === 0 ? (
            <p className="text-xs text-slate-500">No parties watched.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {wl.parties.map((name) => (
                <li key={name} className="flex items-center justify-between py-2">
                  <Link to={`/party/${name}`} className="text-sm text-moat-700 hover:underline">
                    {name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => wl.toggleParty(name)}
                    className="text-xs text-slate-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
