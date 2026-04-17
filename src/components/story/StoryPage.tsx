import { useParams } from "react-router";
import { useStoryData } from "../../hooks/useStoryData";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { NotInCorpusParcel } from "../EmptyStates";

export function StoryPage() {
  const { apn } = useParams();
  const data = useStoryData(apn ?? "");

  useDocumentMeta({
    title: data
      ? `${data.parcel.address} — Ownership Story | Maricopa County Recorder`
      : "Parcel not in this corpus | Maricopa County Recorder",
    description: data ? data.hero.metaDescription : "",
    ogImage: "/og-default.png",
    ogUrl: typeof window !== "undefined"
      ? `${window.location.origin}/parcel/${apn}/story`
      : undefined,
  });

  if (!data) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-8">
        <NotInCorpusParcel
          title="Parcel not in this corpus"
          message={apn ? `APN ${apn} is not in the curated or cached set.` : undefined}
        />
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 space-y-10">
      <h1 className="text-3xl font-semibold text-recorder-900 leading-tight">
        {data.hero.oneLiner}
      </h1>
      {/* Tasks 12–16 add the remaining sections here. */}
    </main>
  );
}
