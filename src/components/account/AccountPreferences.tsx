import { useEffect, useState } from "react";
import { useAuth } from "../../account/AuthContext";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Switch } from "../ui/Switch";
import { PreviewPill } from "./PreviewPill";

const KEY = "mcr.account.preferences.v1";

interface Prefs {
  emailEnabled: boolean;
  smsEnabled: boolean;
  realTime: boolean;
  digestWeekly: boolean;
}

const DEFAULTS: Prefs = {
  emailEnabled: true,
  smsEnabled: false,
  realTime: true,
  digestWeekly: true,
};

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

export function AccountPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(() => readPrefs());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* noop */ }
  }, [prefs]);

  if (!user) return null;

  const toggle = (k: keyof Prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-recorder-900">Preferences</h1>
          <p className="mt-1 text-sm text-slate-600">Configure how and when the portal reaches you.</p>
        </div>
        <PreviewPill productionNote="production sends real email + SMS via the county notification service" />
      </header>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-800">Delivery channels</h2>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100">
          <Switch
            id="email"
            label="Email notifications"
            sub={user.email}
            checked={prefs.emailEnabled}
            onChange={() => toggle("emailEnabled")}
          />
          <Switch
            id="sms"
            label="SMS notifications"
            sub={user.phone_masked}
            checked={prefs.smsEnabled}
            onChange={() => toggle("smsEnabled")}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-800">Frequency</h2>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100">
          <Switch
            id="realtime"
            label="Real-time alerts"
            sub="Send as soon as a recording matches your watchlist"
            checked={prefs.realTime}
            onChange={() => toggle("realTime")}
          />
          <Switch
            id="digest"
            label="Weekly digest"
            sub="Summary of activity every Monday morning"
            checked={prefs.digestWeekly}
            onChange={() => toggle("digestWeekly")}
          />
        </CardBody>
      </Card>
    </div>
  );
}
