import { Popup } from "react-map-gl/maplibre";
import type { AssessorParcel } from "../../logic/assessor-parcel";
import { assembleAddress } from "../../logic/assessor-parcel";

interface Props {
  polygon: AssessorParcel;
  longitude: number;
  latitude: number;
}

export function AssessorOnlyPopup({ polygon, longitude, latitude }: Props) {
  return (
    <Popup longitude={longitude} latitude={latitude} anchor="bottom" closeButton={false} closeOnClick={false}>
      <div className="min-w-[180px] text-xs">
        <div className="font-semibold text-recorder-900">{polygon.OWNER_NAME ?? "—"}</div>
        <div className="text-slate-600 font-mono">{polygon.APN_DASH}</div>
        <div className="text-slate-600">{assembleAddress(polygon)}</div>
        <div className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">Assessor · public GIS</div>
      </div>
    </Popup>
  );
}
