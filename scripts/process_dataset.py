"""Process cars-dataset.csv: keep selected columns and companies, write CSV and JSON outputs.

Usage: python scripts/process_dataset.py
"""
import csv
import json
import os
import re
import difflib

from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
INPUT_CSV = ROOT / 'cars-dataset.csv'
OUT_DIR = ROOT / 'data' / 'processed'
OUT_CSV = OUT_DIR / 'processed-dataset.csv'
OUT_JSON = OUT_DIR / 'processed-dataset.json'

# Columns the user wants to keep (in this order)
DESIRED_COLUMNS = [
    'Model', 'Serie', 'Company', 'Body style', 'Production Years', 'Cylinders',
    'Fuel', 'Fuel System', 'Fuel Capacity', 'Top Speed', 'Acceleration 0-62 Mph (0-100kph)',
    'Gearbox', 'Drive Type', 'Power(HP)', 'Torque(lb-ft)', 'Torque(Nm)',
    'Length', 'Width', 'Height', 'City mpg', 'Highway mpg', 'Combined mpg', 'Specification summary'
]

ALLOWED_COMPANIES = [
    'Alfa romeo', 'Aston martin', 'Audi', 'BMW', 'Chevrolet', 'Citroen', 'Cupra', 'Dacia',
    'Dodge', 'Ford', 'Geely', 'GMC', 'Honda', 'Hyundai', 'Isuzu', 'KIA', 'Land rover',
    'Mahindra', 'Mercedez BENZ', 'Mercedes-AMG', 'Nissan', 'Opel', 'Peugeot', 'Renault',
    'SEAT', 'Skoda', 'Suzuki', 'Toyota', 'Volkswagen', 'Volvo'
]

# Normalization helpers
def norm(s: str) -> str:
    if s is None:
        return ''
    return re.sub(r'[^a-z0-9]', '', s.lower())

ALLOWED_NORM = [norm(c) for c in ALLOWED_COMPANIES]

# Debug: path info
print(f'ROOT = {ROOT}')
print(f'INPUT_CSV (initial) = {INPUT_CSV} (exists={INPUT_CSV.exists()})')
print(f'CWD = {Path.cwd()}')
# fallback location
if not INPUT_CSV.exists():
    alt = ROOT / 'data' / 'raw' / 'cars-dataset.csv'
    print(f'Trying fallback: {alt} (exists={alt.exists()})')
    if alt.exists():
        INPUT_CSV = alt

# Read input
with open(INPUT_CSV, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames or []

    # Build mapping from normalized header -> actual header
    header_norm = {norm(h): h for h in fieldnames}

    # Try to match desired columns to actual CSV headers
    chosen_headers = []
    missing = []
    for dc in DESIRED_COLUMNS:
        n = norm(dc)
        if n in header_norm:
            chosen_headers.append(header_norm[n])
        else:
            # Try fuzzy match among headers
            close = difflib.get_close_matches(n, list(header_norm.keys()), n=1, cutoff=0.8)
            if close:
                chosen_headers.append(header_norm[close[0]])
            else:
                # Not found: will still create an empty column named as desired
                chosen_headers.append(dc)
                missing.append(dc)

    # Process rows
    kept = []
    total = 0
    kept_companies = set()

with open(INPUT_CSV, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        total += 1
        comp_raw = (row.get('Company') or '').strip()
        comp_n = norm(comp_raw)
        keep = False
        if comp_n:
            # direct exact match
            for an in ALLOWED_NORM:
                if comp_n == an:
                    keep = True
                    break
                # allow substring matching only for strings >= 3 chars to avoid accidental matches like 'ac' -> 'dacia'
                if len(comp_n) >= 3 and (an in comp_n or comp_n in an):
                    keep = True
                    break
            # fuzzy match (fallback)
            if not keep:
                close = difflib.get_close_matches(comp_n, ALLOWED_NORM, n=1, cutoff=0.85)
                if close:
                    keep = True
        if keep:
            kept_companies.add(comp_raw)
            # build output row: use chosen_headers list; if header not in original row, get ''
            out_row = {col: row.get(col, '') for col in chosen_headers}
            # If chosen header was one of the DESIRED_COLUMNS that wasn't found (we added the desired name), out_row will be '' and ok
            kept.append(out_row)

# Ensure output directory exists
os.makedirs(OUT_DIR, exist_ok=True)

# Write CSV
with open(OUT_CSV, 'w', newline='', encoding='utf-8') as f:
    # Use DESIRED_COLUMNS as output headers (user-facing)
    writer = csv.DictWriter(f, fieldnames=DESIRED_COLUMNS, extrasaction='ignore')
    writer.writeheader()
    for r in kept:
        # Map r keys (which are actual CSV headers) to desired header names where possible
        out = {}
        for desired, chosen in zip(DESIRED_COLUMNS, chosen_headers):
            out[desired] = r.get(chosen, '')
        writer.writerow(out)

# Write JSON
with open(OUT_JSON, 'w', encoding='utf-8') as f:
    # Create JSON objects using DESIRED_COLUMNS
    json_rows = []
    for r in kept:
        obj = {desired: r.get(chosen, '') for desired, chosen in zip(DESIRED_COLUMNS, chosen_headers)}
        json_rows.append(obj)
    json.dump(json_rows, f, indent=2, ensure_ascii=False)

# Print summary
print(f'Total rows read: {total}')
print(f'Rows kept: {len(kept)}')
print(f'Unique companies kept (sample): {sorted(list(kept_companies))[:20]}')
if missing:
    print('Warning: the following desired columns were not found in the CSV and will be empty:', missing)

print(f'Wrote {OUT_CSV} and {OUT_JSON}')
