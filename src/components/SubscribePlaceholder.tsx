import { Link, useSearchParams } from "react-router";
import { useAuth } from "../account/AuthContext";
import { SignInButton } from "./account/SignInButton";
import { Card, CardBody } from "./ui/Card";
import { PreviewPill } from "./account/PreviewPill";

export function SubscribePlaceholder() {
  const [params] = useSearchParams();
  const apn = params.get("apn");
  const { user } = useAuth();

  const title = `Subscribe to new filings${apn ? ` for parcel ${apn}` : ""}`;

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-6 py-12 space-y-5">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-recorder-900">{title}</h1>
          <PreviewPill />
        </header>
        <Card>
          <CardBody>
            <p className="text-sm leading-relaxed text-slate-700">
              Sign in to subscribe. The county portal notifies you the same day a new document records
              against a parcel you're watching — no third-party plant, no lag.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Title-plant vendors batch their updates every 4–7 days. The county can offer this because
              the county owns the recording pipeline.
            </p>
            <div className="mt-4">
              <SignInButton />
            </div>
          </CardBody>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-12 space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold text-recorder-900">{title}</h1>
        <PreviewPill />
      </header>
      <Card>
        <CardBody>
          <p className="text-sm text-slate-700">Use your account to watch parcels and tune delivery.</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/account/watchlist" className="text-moat-700 hover:underline">Open watchlist →</Link></li>
            <li><Link to="/account/preferences" className="text-moat-700 hover:underline">Notification preferences →</Link></li>
            {apn && <li><Link to={`/parcel/${apn}`} className="text-moat-700 hover:underline">Open parcel {apn} →</Link></li>}
          </ul>
        </CardBody>
      </Card>
    </main>
  );
}
