#!/usr/bin/env python3
"""
run-extraction.py — Hybrid-replay OCR extraction trace generator.

Given a scanned PDF, render each page to an image, run Tesseract OCR,
then apply deterministic post-processing rules (regex + keyword proximity)
to extract structured fields with confidence scores and source snippets.

Output: src/data/extraction-traces/{instrument_number}.trace.json
This trace file is the "replay tape" — the UI reads it at demo time
instead of running OCR live.

Usage:
    python scripts/run-extraction.py <pdf_path> <instrument_number>

Example:
    python scripts/run-extraction.py data/raw/R-003/pdfs/20130183449.pdf 20130183449

Requirements:
    pip install pytesseract pypdfium2 pillow
    Plus a Tesseract binary on PATH or at TESSERACT_CMD env var.

Environment overrides:
    TESSERACT_CMD  — absolute path to tesseract.exe
    TESSDATA_PREFIX — absolute path to tessdata directory containing eng.traineddata

Notes:
- PDF pages are rendered at 300 DPI for OCR legibility on scanned deeds.
- Extraction rules are explicit code, not hand-waved. See extract_* functions.
- If a field cannot be recovered, it is recorded as value=None with a note
  explaining why. No fabrication.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import pypdfium2 as pdfium
import pytesseract
from PIL import Image


# ---------------------------------------------------------------------------
# Tesseract bootstrap
# ---------------------------------------------------------------------------

def configure_tesseract() -> str:
    """Resolve the tesseract executable and return its version string."""
    cmd = os.environ.get("TESSERACT_CMD")
    if not cmd:
        # Try common Windows install locations before failing.
        candidates = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            r"C:\temp\tesseract-portable\tesseract.exe",
        ]
        for c in candidates:
            if os.path.exists(c):
                cmd = c
                break
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd

    # Ensure TESSDATA_PREFIX points at a dir containing eng.traineddata
    if "TESSDATA_PREFIX" not in os.environ and cmd:
        candidate_tessdata = os.path.join(os.path.dirname(cmd), "tessdata")
        if os.path.exists(os.path.join(candidate_tessdata, "eng.traineddata")):
            os.environ["TESSDATA_PREFIX"] = candidate_tessdata

    result = subprocess.run(
        [pytesseract.pytesseract.tesseract_cmd, "--version"],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"tesseract --version failed: {result.stderr}")
    # Version string is the first line, e.g. "tesseract 4.1.1"
    first_line = result.stdout.strip().splitlines()[0]
    return first_line


# ---------------------------------------------------------------------------
# PDF → text
# ---------------------------------------------------------------------------

def ocr_pdf(pdf_path: Path, dpi: int = 300) -> list[dict]:
    """Render each page of the PDF to PIL, OCR it, return per-page records."""
    pages: list[dict] = []
    pdf = pdfium.PdfDocument(str(pdf_path))
    try:
        n = len(pdf)
        for i in range(n):
            page = pdf[i]
            # 72 DPI is the PDF default; scale accordingly.
            scale = dpi / 72.0
            bitmap = page.render(scale=scale)
            pil_img = bitmap.to_pil()
            # Convert to grayscale — faster OCR with minimal accuracy loss on text scans.
            if pil_img.mode != "L":
                pil_img = pil_img.convert("L")
            text = pytesseract.image_to_string(pil_img, lang="eng")
            pages.append({
                "page": i + 1,
                "raw_text": text,
                "word_count": len(text.split()),
            })
    finally:
        pdf.close()
    return pages


# ---------------------------------------------------------------------------
# Extraction rules
# ---------------------------------------------------------------------------

@dataclass
class Extraction:
    field: str
    value: Optional[str]
    confidence: float
    provenance: str
    source_page: Optional[int]
    source_snippet: Optional[str]
    extraction_method: str
    note: Optional[str] = None


def _find_snippet(text: str, match_start: int, match_end: int, radius: int = 40) -> str:
    """Return ~80-char window around the match for provenance display."""
    start = max(0, match_start - radius)
    end = min(len(text), match_end + radius)
    snippet = text[start:end]
    # Collapse whitespace/newlines for a one-line snippet.
    return re.sub(r"\s+", " ", snippet).strip()


def extract_legal_description(pages: list[dict]) -> Extraction:
    """
    Legal description extraction rule:
    1. Find a "Lot <N>" anchor on any page.
    2. Greedily extend through the subdivision name up to "Book N ... Page N"
       or "per plat" or end-of-paragraph.
    Real Maricopa deeds show: "Lot 46, SEVILLE PARCEL 3 ... Book 554 of Maps, Page 19"
    """
    # Pattern: Lot <digits> ... Book <digits> of Maps ... Page <digits>
    # We allow OCR noise (including newlines) between elements — up to ~300 chars — but
    # require all three anchors (Lot, Book, Page). DOTALL makes '.' match '\n'.
    pattern = re.compile(
        r"Lot\s+(\d+)[,.\s]+[^.]{0,300}?Book\s+(\d+)\s+of\s+(?:Maps?|MAPS|Plats?|PLATS)[,\s]+Page\s+(\d+)",
        re.IGNORECASE | re.DOTALL,
    )
    for page in pages:
        text = page["raw_text"]
        m = pattern.search(text)
        if m:
            value = re.sub(r"\s+", " ", m.group(0)).strip()
            snippet = _find_snippet(text, m.start(), m.end())
            return Extraction(
                field="legal_description",
                value=value,
                # High confidence: all three anchor tokens present.
                confidence=0.88,
                provenance="ocr",
                source_page=page["page"],
                source_snippet=snippet,
                extraction_method="regex-rule: Lot N ... Book N of Maps, Page N anchor pattern",
            )

    # Fallback: just find a Lot + subdivision-name fragment.
    loose = re.compile(r"Lot\s+(\d+)[^\n.]{0,200}", re.IGNORECASE)
    for page in pages:
        m = loose.search(page["raw_text"])
        if m:
            value = re.sub(r"\s+", " ", m.group(0)).strip()
            snippet = _find_snippet(page["raw_text"], m.start(), m.end())
            return Extraction(
                field="legal_description",
                value=value,
                confidence=0.55,  # No Book/Page anchors — weaker.
                provenance="ocr",
                source_page=page["page"],
                source_snippet=snippet,
                extraction_method="regex-rule: loose 'Lot N ...' fragment (no Book/Page anchors found)",
                note="Book/Page plat reference not matched — legal description may be truncated.",
            )

    return Extraction(
        field="legal_description",
        value=None,
        confidence=0.0,
        provenance="ocr",
        source_page=None,
        source_snippet=None,
        extraction_method="regex-rule: Lot N ... Book N of Maps, Page N (no match)",
        note="No 'Lot <number>' anchor found anywhere in OCR output.",
    )


def extract_trust_name(pages: list[dict]) -> Extraction:
    """
    Trust/grantor-entity name extraction rule:
    Find "<NAME> LIVING TRUST" or "<NAME> REVOCABLE TRUST" or "<NAME> TRUST DATED".
    Optional "dated <month> <day>, <year>" suffix is captured if adjacent.
    """
    # Primary: ALL CAPS trust name, optionally prefixed with "the", ending in
    # "(LIVING|REVOCABLE|FAMILY|IRREVOCABLE) TRUST" with an optional
    # ", dated <Month> <D>, <YYYY>" tail.
    # NOTE: case-sensitive — trust names are always ALL CAPS on Maricopa deeds,
    # and requiring uppercase prevents greedy matches into preamble text.
    primary = re.compile(
        r"(?:the\s+)?([A-Z][A-Z.\s&,]{5,120}?\s+(?:LIVING|REVOCABLE|FAMILY|IRREVOCABLE)\s+TRUST)"
        r"(?:,?\s*dated\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4}))?",
        # case-sensitive on purpose
    )
    best: Optional[tuple[int, re.Match, int]] = None  # (page_num, match, score)
    for page in pages:
        text = page["raw_text"]
        for m in primary.finditer(text):
            name_part = m.group(1)
            # Score: longer name + bonus when the "dated" date tail captured.
            score = len(name_part) + (100 if m.group(2) else 0)
            if not best or score > best[2]:
                best = (page["page"], m, score)

    if best:
        page_num, m, _ = best
        name_part = re.sub(r"\s+", " ", m.group(1)).strip().strip(",").strip()
        date_part = m.group(2)
        if date_part:
            value = f"{name_part}, dated {date_part.strip()}"
        else:
            value = name_part
        page_text = next(p["raw_text"] for p in pages if p["page"] == page_num)
        snippet = _find_snippet(page_text, m.start(), m.end())
        return Extraction(
            field="trust_name",
            value=value,
            confidence=0.92 if date_part else 0.78,
            provenance="ocr",
            source_page=page_num,
            source_snippet=snippet,
            extraction_method=(
                "regex-rule: ALL-CAPS '<NAME> (LIVING|REVOCABLE|FAMILY|IRREVOCABLE) TRUST"
                " [, dated <Month> <D>, <YYYY>]' pattern"
            ),
        )

    return Extraction(
        field="trust_name",
        value=None,
        confidence=0.0,
        provenance="ocr",
        source_page=None,
        source_snippet=None,
        extraction_method="regex-rule: '...TRUST[, dated ...]' (no match)",
        note="No 'TRUST' entity name recognizable in OCR output.",
    )


def extract_deed_date(pages: list[dict]) -> Extraction:
    """
    Deed date extraction rule:
    Look for the execution date phrase "dated this <ordinal> day of <month>, <year>"
    OR a date line adjacent to "made this ... day of ...".
    This is the date on the deed body, distinct from the county's recording stamp.
    """
    pattern = re.compile(
        r"(?:made|dated)\s+this\s+([A-Za-z0-9]+(?:st|nd|rd|th)?)\s+day\s+of\s+([A-Za-z]+)[,\s]+(\d{4})",
        re.IGNORECASE,
    )
    for page in pages:
        text = page["raw_text"]
        m = pattern.search(text)
        if m:
            value = re.sub(r"\s+", " ", m.group(0)).strip()
            snippet = _find_snippet(text, m.start(), m.end())
            return Extraction(
                field="deed_date",
                value=value,
                confidence=0.85,
                provenance="ocr",
                source_page=page["page"],
                source_snippet=snippet,
                extraction_method="regex-rule: 'made|dated this <ordinal> day of <Month>, <YYYY>' pattern",
            )

    # Secondary: "Dated[:] <MM/DD/YYYY>" OR "Dated[:] <Month> <D>, <YYYY>"
    # — common short-forms on AZ warranty deed signature lines.
    dated_short = re.compile(
        r"\bDated[:\s]+((?:\d{1,2}/\d{1,2}/\d{4})|(?:[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}))",
    )
    for page in pages:
        text = page["raw_text"]
        m = dated_short.search(text)
        if m:
            value = m.group(0).strip()
            snippet = _find_snippet(text, m.start(), m.end())
            return Extraction(
                field="deed_date",
                value=value,
                confidence=0.82,
                provenance="ocr",
                source_page=page["page"],
                source_snippet=snippet,
                extraction_method="regex-rule: 'Dated[:] <MM/DD/YYYY>' or 'Dated[:] <Month> <D>, <YYYY>' signature-line pattern",
            )

    # Tertiary: "Date: Month D, YYYY" header (often on trust certifications, not the deed).
    alt = re.compile(
        r"Date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})",
        re.IGNORECASE,
    )
    for page in pages:
        text = page["raw_text"]
        m = alt.search(text)
        if m:
            value = m.group(0).strip()
            snippet = _find_snippet(text, m.start(), m.end())
            return Extraction(
                field="deed_date",
                value=value,
                confidence=0.55,
                provenance="ocr",
                source_page=page["page"],
                source_snippet=snippet,
                extraction_method="regex-rule: 'Date: <Month> <D>, <YYYY>' header fallback",
                note="Matched a 'Date:' header (often on an attached trust certification), not the deed body.",
            )

    return Extraction(
        field="deed_date",
        value=None,
        confidence=0.0,
        provenance="ocr",
        source_page=None,
        source_snippet=None,
        extraction_method="regex-rule: deed execution date (no match)",
        note="Neither 'made/dated this Nth day of Month, YYYY' nor 'Date: Month D, YYYY' matched.",
    )


def extract_escrow_number(pages: list[dict]) -> Extraction:
    """
    Escrow number extraction rule:
    Maricopa title companies print "Escrow No.: <id>" or "Escrow #: <id>" in
    the upper recording block. Pattern looks for that label with keyword proximity.
    """
    # Allow OCR-introduced spaces around hyphens in the escrow number. Normalize after capture.
    pattern = re.compile(
        r"Escrow\s*(?:No\.?|Number|#)?\s*[:.]\s*([A-Z0-9][A-Z0-9\-\s]{3,40}?)(?=\s*(?:SPACE|\n\n|$))",
        re.IGNORECASE,
    )
    simple_pattern = re.compile(
        r"Escrow\s*(?:No\.?|Number|#)?\s*[:.]\s*([A-Z0-9\-]{4,32})",
        re.IGNORECASE,
    )
    for page in pages:
        text = page["raw_text"]
        m = pattern.search(text) or simple_pattern.search(text)
        if m:
            # Normalize: collapse whitespace around hyphens so "63150745 - 063 - JBB" → "63150745-063-JBB"
            value = re.sub(r"\s*-\s*", "-", m.group(1)).strip()
            value = re.sub(r"\s+", "", value)  # drop any remaining whitespace
            value = value.strip("-")  # trim stray trailing/leading hyphens from OCR
            # Filter obvious junk — require >=1 digit and reasonable length.
            if not re.search(r"\d", value) or len(value) < 4:
                continue
            snippet = _find_snippet(text, m.start(), m.end())
            return Extraction(
                field="escrow_number",
                value=value,
                confidence=0.80,
                provenance="ocr",
                source_page=page["page"],
                source_snippet=snippet,
                extraction_method="keyword-proximity: 'Escrow (No.|#)?: <alnum[-alnum]*>' label pattern; hyphen-normalized",
            )

    return Extraction(
        field="escrow_number",
        value=None,
        confidence=0.0,
        provenance="ocr",
        source_page=None,
        source_snippet=None,
        extraction_method="keyword-proximity: 'Escrow (No.|#)?: <alnum>' (no match)",
        note="No 'Escrow No./#' label found — this deed may not have had a title-company escrow, or the label is outside OCR confidence.",
    )


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run(pdf_path: Path, instrument_number: str, out_path: Path) -> dict:
    version_string = configure_tesseract()
    print(f"[run-extraction] Tesseract: {version_string}")
    print(f"[run-extraction] OCR'ing {pdf_path}...")
    pages = ocr_pdf(pdf_path)
    total_words = sum(p["word_count"] for p in pages)
    print(f"[run-extraction] Extracted {total_words} words across {len(pages)} pages.")

    extractions = [
        extract_legal_description(pages),
        extract_trust_name(pages),
        extract_deed_date(pages),
        extract_escrow_number(pages),
    ]

    # Build notes collecting any per-field notes for easy scan.
    missing = [e for e in extractions if e.value is None]
    if missing:
        notes = "Missing fields: " + "; ".join(
            f"{e.field} ({e.note})" for e in missing if e.note
        )
    else:
        notes = "All target fields recovered."

    trace = {
        "instrument_number": instrument_number,
        "source_pdf": str(pdf_path).replace("\\", "/"),
        "ocr_engine": "tesseract",
        "ocr_version": version_string,
        "extracted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "pages": pages,
        "extractions": [asdict(e) for e in extractions],
        "notes": notes,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(trace, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[run-extraction] Wrote trace: {out_path}")
    print(f"[run-extraction] Summary:")
    for e in extractions:
        flag = "OK" if e.value else "MISS"
        val = (e.value or "")[:80]
        print(f"  [{flag}] {e.field}: conf={e.confidence:.2f} page={e.source_page} value={val!r}")
    return trace


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(__doc__)
        return 2
    pdf_path = Path(argv[1])
    instrument_number = argv[2]
    if not pdf_path.exists():
        print(f"ERROR: PDF not found: {pdf_path}", file=sys.stderr)
        return 1
    # Output path mirrors the sprint's data-layout convention.
    out_path = Path("src") / "data" / "extraction-traces" / f"{instrument_number}.trace.json"
    run(pdf_path, instrument_number, out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
