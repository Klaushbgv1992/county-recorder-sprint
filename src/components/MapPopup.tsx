import { Popup } from "react-map-gl/maplibre";
import { Term, TermSection } from "../terminology/Term";
import type { PopupData } from "../logic/popup-data";

export interface MapPopupProps {
  data: PopupData;
  longitude: number;
  latitude: number;
}

function ResidentialBody({ data }: { data: PopupData }) {
  const { owner, apn, address, openLifecycleCount, lastRecordingDate } = data;
  const isOpen = openLifecycleCount > 0;
  const lifecycleWord = openLifecycleCount === 1 ? "lifecycle" : "lifecycles";
  const countClass = isOpen
    ? "text-amber-700 font-medium"
    : "text-slate-500";

  return (
    <TermSection id={`popup-${apn}`}>
      <p className="text-sm font-medium text-slate-900 truncate" title={owner}>
        {owner}
      </p>
      <p className="text-xs text-slate-600 truncate">
        <span className="font-mono">{apn}</span> &middot; {address}
      </p>
      <p className="text-xs mt-1">
        <span className={countClass}>
          {openLifecycleCount} open <Term professional={lifecycleWord} />
        </span>
        {lastRecordingDate && (
          <>
            <span className="text-slate-400"> &middot; </span>
            <span className="text-slate-600">
              last filed <span className="font-mono">{lastRecordingDate}</span>
            </span>
          </>
        )}
      </p>
      <p className="text-xs mt-2 text-moat-700 font-medium">
        &rarr; Open <Term professional="chain of title" />
      </p>
    </TermSection>
  );
}

function SubdivisionCommonBody({ data }: { data: PopupData }) {
  return (
    <TermSection id={`popup-${data.apn}`}>
      <p className="text-sm font-medium text-slate-900">
        Subdivision common area
      </p>
      <p className="text-xs text-slate-600 truncate">
        <span className="font-mono">{data.apn}</span> &middot; {data.address}
      </p>
      <p className="text-xs mt-1 text-slate-600">
        Holds plat <Term professional="encumbrances" /> (lc-004)
      </p>
      <p className="text-xs mt-2 text-moat-700 font-medium">
        &rarr; Open parcel record
      </p>
    </TermSection>
  );
}

export function MapPopup({ data, longitude, latitude }: MapPopupProps) {
  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      closeButton={false}
      closeOnClick={false}
      anchor="bottom"
      offset={12}
      maxWidth="220px"
      className="county-recorder-map-popup"
    >
      <div className="w-[200px] py-1 px-1 pointer-events-none">
        {data.type === "subdivision_common" ? (
          <SubdivisionCommonBody data={data} />
        ) : (
          <ResidentialBody data={data} />
        )}
      </div>
    </Popup>
  );
}
