import { registerOverlay } from "./overlays";
import popham from "../data/narratives/304-78-386.json";
import hogue from "../data/narratives/304-77-689.json";
import warner from "../data/narratives/304-78-374.json";
import lowry from "../data/narratives/304-78-383.json";
import seville from "../data/narratives/304-78-409.json";

registerOverlay("304-78-386", popham);
registerOverlay("304-77-689", hogue);
registerOverlay("304-78-374", warner);
registerOverlay("304-78-383", lowry);
registerOverlay("304-78-409", seville);
