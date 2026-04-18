import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useParams, Link } from "react-router";
import type { BIItem, TransactionInputs, TransactionType } from "../types/commitment";
import { loadParcelDataByApn, type ParcelData } from "../data-loader";
import { detectAnomalies } from "../logic/anomaly-detector";
import { generateScheduleBI } from "../logic/schedule-bi-generator";
import { TransactionWizardStep3 } from "./TransactionWizardStep3";
import { ExportCommitmentButton } from "./ExportCommitmentButton";
import { useWalkthrough } from "../walkthrough/useWalkthrough";

type Step = 1 | 2 | 3 | 4;

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: "purchase", label: "Purchase" },
  { value: "refinance", label: "Refinance" },
  { value: "second_dot", label: "2nd Deed of Trust" },
  { value: "heloc", label: "HELOC" },
  { value: "cash_sale", label: "Cash Sale" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function NotInCorpus({ apn }: { apn: string | undefined }) {
  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        Not in this corpus
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        {apn ? `APN ${apn} is not in the curated set.` : "Missing APN."}
      </p>
      <Link to="/" className="text-blue-600 hover:text-blue-800 hover:underline">
        Return to search
      </Link>
    </div>
  );
}

function StepPills({ step }: { step: Step }) {
  const steps = [
    { n: 1 as Step, label: "Type" },
    { n: 2 as Step, label: "Details" },
    { n: 3 as Step, label: "Review" },
    { n: 4 as Step, label: "Export" },
  ];

  // Track previous step value so we can detect the *just-completed* pill
  // and fire a one-shot pulse on that specific circle only.
  const prevStepRef = useRef<Step>(step);
  const [justCompleted, setJustCompleted] = useState<Step | null>(null);
  const [justFilledConnector, setJustFilledConnector] = useState<Step | null>(null);

  useEffect(() => {
    const prev = prevStepRef.current;
    if (step > prev) {
      // advanced from prev -> step: prev is the just-completed pill,
      // and the connector after prev is the just-filled connector.
      setJustCompleted(prev);
      setJustFilledConnector(prev);
      const t = window.setTimeout(() => {
        setJustCompleted(null);
        setJustFilledConnector(null);
      }, 650);
      prevStepRef.current = step;
      return () => window.clearTimeout(t);
    }
    prevStepRef.current = step;
  }, [step]);

  return (
    <ol aria-label="Progress" className="flex items-start mb-6">
      {steps.map(({ n, label }, idx) => {
        const active = n === step;
        const done = n < step;
        const pulseOnce = justCompleted === n;
        const connectorFilled = done;
        const connectorJustFilled = justFilledConnector === n;
        return (
          <li
            key={n}
            className="flex items-start animate-fade-in-up"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <span className="flex flex-col items-center">
              <span
                className={`relative w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold select-none transition-colors ${
                  done
                    ? "bg-blue-600 text-white"
                    : active
                      ? "border-2 border-blue-600 text-blue-700 bg-white ring-2 ring-blue-400"
                      : "border border-gray-300 text-gray-400 bg-white"
                } ${pulseOnce ? "animate-pulse-once" : ""}`}
              >
                {done ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline
                      points="5,12 10,17 19,7"
                      strokeDasharray={24}
                      strokeDashoffset={pulseOnce ? 24 : 0}
                      className={pulseOnce ? "animate-checkmark-draw" : ""}
                    />
                  </svg>
                ) : (
                  n
                )}
              </span>
              <span
                className={`mt-1 text-xs whitespace-nowrap ${
                  done
                    ? "text-blue-700"
                    : active
                      ? "text-blue-700 font-semibold"
                      : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </span>
            {idx < steps.length - 1 && (
              <span
                className="relative block w-8 h-px mt-3 mx-1 flex-shrink-0 bg-gray-200 overflow-hidden"
                aria-hidden="true"
              >
                {connectorFilled && (
                  <span
                    className={`absolute inset-0 origin-left bg-moat-500 ${
                      connectorJustFilled ? "animate-track-grow" : ""
                    }`}
                  />
                )}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface Step1Props {
  value: TransactionType | undefined;
  onSelect: (t: TransactionType) => void;
  onNext: () => void;
}

function Step1({ value, onSelect, onNext }: Step1Props) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Transaction type
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {TRANSACTION_TYPES.map((t) => {
          const selected = value === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onSelect(t.value)}
              className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                selected
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-gray-200 bg-white text-gray-800 hover:border-gray-300"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!value}
          onClick={onNext}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </section>
  );
}

interface Step2Props {
  inputs: Partial<TransactionInputs>;
  setInputs: (patch: Partial<TransactionInputs>) => void;
  onBack: () => void;
  onNext: () => void;
}

function Step2({ inputs, setInputs, onBack, onNext }: Step2Props) {
  const isCash = inputs.transaction_type === "cash_sale";
  const effective = inputs.effective_date ?? "";
  const buyer = inputs.buyer_or_borrower ?? "";
  const lender = inputs.new_lender ?? "";
  const lenderOk = isCash ? true : lender.trim().length > 0;
  const canContinue = effective.trim().length > 0 && buyer.trim().length > 0 && lenderOk;

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Transaction details
      </h2>
      <div className="space-y-4 mb-6">
        <div>
          <label
            htmlFor="tw-effective-date"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Effective date
          </label>
          <input
            id="tw-effective-date"
            type="date"
            value={effective}
            onChange={(e) => setInputs({ effective_date: e.target.value })}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-moat-500"
          />
        </div>
        <div>
          <label
            htmlFor="tw-buyer"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Buyer or borrower
          </label>
          <input
            id="tw-buyer"
            type="text"
            value={buyer}
            onChange={(e) => setInputs({ buyer_or_borrower: e.target.value })}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-moat-500"
          />
        </div>
        <div>
          <label
            htmlFor="tw-lender"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            New lender {isCash && <span className="text-gray-400">(optional for cash sale)</span>}
          </label>
          {/* TODO: autocomplete lender names from corpus (deferred, optional). */}
          <input
            id="tw-lender"
            type="text"
            value={lender}
            onChange={(e) => setInputs({ new_lender: e.target.value })}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-moat-500"
          />
        </div>
      </div>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onNext}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </section>
  );
}

interface Step4Props {
  inputs: TransactionInputs;
  itemCount: number;
  data: ParcelData;
  biItems: BIItem[];
  onBack: () => void;
}

function Step4({ inputs, itemCount, data, biItems, onBack }: Step4Props) {
  const typeLabel =
    TRANSACTION_TYPES.find((t) => t.value === inputs.transaction_type)?.label ??
    inputs.transaction_type;

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Export commitment
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6 text-sm bg-gray-50 border border-gray-200 rounded-lg p-4">
        <dt className="text-xs font-medium text-gray-500">Transaction type</dt>
        <dd className="text-gray-800">{typeLabel}</dd>
        <dt className="text-xs font-medium text-gray-500">Effective date</dt>
        <dd className="text-gray-800">{inputs.effective_date}</dd>
        <dt className="text-xs font-medium text-gray-500">Buyer / borrower</dt>
        <dd className="text-gray-800">{inputs.buyer_or_borrower}</dd>
        <dt className="text-xs font-medium text-gray-500">New lender</dt>
        <dd className="text-gray-800">{inputs.new_lender ?? "—"}</dd>
        <dt className="text-xs font-medium text-gray-500">B-I items</dt>
        <dd className="text-gray-800">{itemCount}</dd>
      </dl>
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
        >
          Back
        </button>
        <ExportCommitmentButton
          parcel={data.parcel}
          instruments={data.instruments}
          links={data.links}
          lifecycles={data.lifecycles}
          pipelineStatus={data.pipelineStatus}
          biItems={biItems}
          transactionInputs={inputs}
          label="Export Commitment PDF"
        />
      </div>
    </section>
  );
}

export function TransactionWizard(): ReactElement {
  const { apn } = useParams();

  let data: ParcelData | null = null;
  try {
    data = apn ? loadParcelDataByApn(apn) : null;
  } catch {
    data = null;
  }

  const anomalies = useMemo(
    () => (apn && data ? detectAnomalies(apn) : []),
    [apn, data],
  );

  const { currentStep: walkthroughStep } = useWalkthrough();
  const onWalkthrough = walkthroughStep?.step === 5;

  const [step, setStep] = useState<Step>(1);
  // When the examiner walkthrough lands on this wizard as step 5, pre-select
  // a transaction type so the reviewer can advance without guessing. The
  // wizard still walks through all four steps — the default just unblocks
  // the Next button on step 1 so the 60-second script keeps moving.
  const [inputs, setInputsState] = useState<Partial<TransactionInputs>>(
    () => (onWalkthrough ? { transaction_type: "purchase" } : {}),
  );
  const [biItems, setBiItems] = useState<BIItem[]>([]);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(
    () => new Set(),
  );

  if (!data) {
    return <NotInCorpus apn={apn} />;
  }

  const setInputs = (patch: Partial<TransactionInputs>) =>
    setInputsState((prev) => ({ ...prev, ...patch }));

  const enterStep2 = () => {
    // Provide defaults once when entering step 2.
    setInputsState((prev) => ({
      effective_date: prev.effective_date ?? todayISO(),
      buyer_or_borrower: prev.buyer_or_borrower ?? data!.parcel.current_owner,
      new_lender: prev.new_lender ?? "",
      ...prev,
      transaction_type: prev.transaction_type,
    }));
    setStep(2);
  };

  const enterStep3 = () => {
    const full: TransactionInputs = {
      transaction_type: inputs.transaction_type!,
      effective_date: inputs.effective_date!,
      buyer_or_borrower: inputs.buyer_or_borrower!,
      new_lender:
        inputs.transaction_type === "cash_sale"
          ? (inputs.new_lender?.trim() ? inputs.new_lender : null)
          : (inputs.new_lender ?? ""),
    };
    const items = generateScheduleBI({
      apn: apn!,
      lifecycles: data!.lifecycles,
      anomalies,
      instruments: data!.instruments,
      parcel: data!.parcel,
      inputs: full,
    });
    setBiItems(items);
    setExpandedItemIds(new Set());
    setStep(3);
  };

  const toggleExpanded = (id: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-6">
        <p className="text-xs text-gray-500 mb-1">
          APN {data.parcel.apn} · {data.parcel.address}, {data.parcel.city}
        </p>
        <h1 className="text-xl font-semibold text-gray-900">
          New commitment
        </h1>
        {onWalkthrough && (
          <p className="mt-2 text-[13px] leading-snug text-slate-700 bg-moat-50 border border-moat-200 rounded px-3 py-2">
            This is what turns the abstract into a real title commitment.
            Schedule B-I (what must happen at closing) is generated from the
            transaction you scope below; Schedule B-II (what the buyer takes
            subject to) already came out of the chain review.
          </p>
        )}
      </header>
      <StepPills step={step} />
      {step === 1 && (
        <Step1
          value={inputs.transaction_type}
          onSelect={(t) => setInputs({ transaction_type: t })}
          onNext={enterStep2}
        />
      )}
      {step === 2 && (
        <Step2
          inputs={inputs}
          setInputs={setInputs}
          onBack={() => setStep(1)}
          onNext={enterStep3}
        />
      )}
      {step === 3 && (
        <TransactionWizardStep3
          items={biItems}
          expandedItemIds={expandedItemIds}
          onToggle={toggleExpanded}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}
      {step === 4 && (
        <Step4
          inputs={inputs as TransactionInputs}
          itemCount={biItems.length}
          data={data}
          biItems={biItems}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  );
}

export default TransactionWizard;
