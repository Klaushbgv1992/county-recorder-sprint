import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { InstrumentFile, ParcelFile, ParcelsFile, LinksFile } from "../src/schemas";

const INSTRUMENTS_DIR = "src/data/instruments";
const PARCELS_PATH = "src/data/parcels.json";
const PARCEL_LEGACY_PATH = "src/data/parcel.json";
const LINKS_PATH = "src/data/links.json";

let errors: string[] = [];
let warnings: string[] = [];

// -- Load and validate parcels (new array file) or legacy single-parcel file --

if (existsSync(PARCELS_PATH)) {
  console.log("=== Validating parcels.json ===");
  const parcelsRaw = JSON.parse(readFileSync(PARCELS_PATH, "utf8"));
  const parcelsResult = ParcelsFile.safeParse(parcelsRaw);
  if (!parcelsResult.success) {
    errors.push(`parcels.json: ${parcelsResult.error.message}`);
    console.log("  FAIL:", parcelsResult.error.message);
  } else {
    console.log(`  PASS (${parcelsResult.data.length} parcels)`);
    for (const p of parcelsResult.data) {
      console.log(`    - ${p.apn} ${p.address} (${(p.instrument_numbers ?? []).length} instruments)`);
    }
  }
} else {
  console.log("=== Validating parcel.json (legacy) ===");
  const parcelRaw = JSON.parse(readFileSync(PARCEL_LEGACY_PATH, "utf8"));
  const parcelResult = ParcelFile.safeParse(parcelRaw);
  if (!parcelResult.success) {
    errors.push(`parcel.json: ${parcelResult.error.message}`);
    console.log("  FAIL:", parcelResult.error.message);
  } else {
    console.log("  PASS");
  }
}

// -- Load and validate instruments --

console.log("\n=== Validating instruments ===");
const instrumentFiles = readdirSync(INSTRUMENTS_DIR).filter((f) =>
  f.endsWith(".json")
);
const instruments: Map<string, any> = new Map();

for (const file of instrumentFiles) {
  const path = join(INSTRUMENTS_DIR, file);
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const result = InstrumentFile.safeParse(raw);
  if (!result.success) {
    errors.push(`${file}: Schema validation failed — ${result.error.message}`);
    console.log(`  ${file}: FAIL — ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  } else {
    console.log(`  ${file}: PASS`);
    instruments.set(result.data.instrument_number, result.data);
  }
}

// -- Structural integrity checks --

console.log("\n=== Structural integrity checks ===");

// Rule A: release_of links must target deed_of_trust or heloc_dot
if (instruments.size > 0) {
  for (const [id, inst] of instruments) {
    if (inst.back_references) {
      for (const ref of inst.back_references) {
        const target = instruments.get(ref);
        if (
          inst.document_type === "full_reconveyance" &&
          target &&
          target.document_type !== "deed_of_trust" &&
          target.document_type !== "heloc_dot"
        ) {
          errors.push(
            `Rule A: ${id} (full_reconveyance) back-references ${ref} which is ${target.document_type}, not deed_of_trust or heloc_dot`
          );
          console.log(`  Rule A FAIL: ${id} → ${ref} (${target.document_type})`);
        }
      }
    }
  }
  console.log("  Rule A (release targets DOT): checked");
}

// Rule B: same_day_group members must share recording_date
for (const [id, inst] of instruments) {
  if (inst.same_day_group) {
    for (const groupId of inst.same_day_group) {
      const other = instruments.get(groupId);
      if (other && other.recording_date !== inst.recording_date) {
        errors.push(
          `Rule B: ${id} (${inst.recording_date}) and same_day_group member ${groupId} (${other.recording_date}) have different recording dates`
        );
        console.log(
          `  Rule B FAIL: ${id} (${inst.recording_date}) ≠ ${groupId} (${other.recording_date})`
        );
      }
    }
  }
}
console.log("  Rule B (same-day groups): checked");

// Rule C: nominee_for must reference an existing party in the same instrument
for (const [id, inst] of instruments) {
  for (const party of inst.parties) {
    if (party.nominee_for) {
      const match = inst.parties.find(
        (p: any) =>
          p.name === party.nominee_for.party_name &&
          p.role === party.nominee_for.party_role
      );
      if (!match) {
        errors.push(
          `Rule C: ${id} party "${party.name}" has nominee_for "${party.nominee_for.party_name}" (${party.nominee_for.party_role}) but no matching party found in same instrument`
        );
        console.log(
          `  Rule C FAIL: ${id} — nominee_for ${party.nominee_for.party_name} not found`
        );
      }
    }
  }
}
console.log("  Rule C (nominee_for references): checked");

// Rule D: raw_api_response.recordingNumber must match instrument_number
for (const [id, inst] of instruments) {
  if (inst.raw_api_response.recordingNumber !== inst.instrument_number) {
    errors.push(
      `Rule D: ${id} instrument_number ≠ raw_api_response.recordingNumber (${inst.raw_api_response.recordingNumber})`
    );
    console.log(
      `  Rule D FAIL: ${id} ≠ ${inst.raw_api_response.recordingNumber}`
    );
  }
}
console.log("  Rule D (recording number match): checked");

// -- Auto-populate provenance_summary --

console.log("\n=== Populating provenance_summary ===");

for (const file of instrumentFiles) {
  const path = join(INSTRUMENTS_DIR, file);
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const result = InstrumentFile.safeParse(raw);
  if (!result.success) continue;

  const inst = result.data;
  let publicApiCount = 0;
  let ocrCount = 0;
  let manualEntryCount = 0;

  // Count API-derived top-level fields:
  // instrument_number (from recordingNumber), recording_date (from recordingDate),
  // document_type_raw (from documentCodes[0]), page_count (from pageAmount)
  publicApiCount += 4;

  // bundled_document_types presence (from documentCodes beyond index 0)
  if (inst.bundled_document_types.length > 0) {
    publicApiCount++;
  }

  // affidavitPresent if true (surfaced in raw_api_response)
  if (inst.raw_api_response.affidavitPresent) {
    publicApiCount++;
  }

  // Count provenance on parties
  for (const party of inst.parties) {
    switch (party.provenance) {
      case "public_api": publicApiCount++; break;
      case "ocr": ocrCount++; break;
      case "manual_entry": manualEntryCount++; break;
    }
  }

  // Count provenance on extracted_fields
  for (const field of Object.values(inst.extracted_fields)) {
    switch (field.provenance) {
      case "public_api": publicApiCount++; break;
      case "ocr": ocrCount++; break;
      case "manual_entry": manualEntryCount++; break;
    }
  }

  // Count provenance on legal_description
  if (inst.legal_description) {
    switch (inst.legal_description.provenance) {
      case "public_api": publicApiCount++; break;
      case "ocr": ocrCount++; break;
      case "manual_entry": manualEntryCount++; break;
    }
  }

  raw.provenance_summary = {
    public_api_count: publicApiCount,
    ocr_count: ocrCount,
    manual_entry_count: manualEntryCount,
  };

  writeFileSync(path, JSON.stringify(raw, null, 2) + "\n");
  console.log(
    `  ${file}: public_api=${publicApiCount}, ocr=${ocrCount}, manual_entry=${manualEntryCount}`
  );
}

// -- Re-validate after provenance_summary injection --

console.log("\n=== Re-validating after provenance_summary ===");
for (const file of instrumentFiles) {
  const path = join(INSTRUMENTS_DIR, file);
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const result = InstrumentFile.safeParse(raw);
  if (!result.success) {
    errors.push(`${file} (post-summary): ${result.error.message}`);
    console.log(`  ${file}: FAIL`);
  } else {
    console.log(`  ${file}: PASS`);
  }
}

// -- Summary --

console.log("\n=== SUMMARY ===");
console.log(`Instruments validated: ${instruments.size}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.log("\nERRORS:");
  for (const e of errors) {
    console.log(`  - ${e}`);
  }
  process.exit(1);
} else {
  console.log("\nALL CHECKS PASSED");
  process.exit(0);
}
