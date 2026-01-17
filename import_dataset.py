import json
import re
from app import create_app
from models import db, Car

app = create_app()

def extract_int(val):
    if val is None:
        return None
    s = str(val)
    m = re.search(r"(\d+)", s)
    return int(m.group(1)) if m else None

def extract_float(val):
    if val is None:
        return None
    s = str(val).replace(',', '.')
    m = re.search(r"(\d+\.?\d*)", s)
    return float(m.group(1)) if m else None

def import_data(path='data/processed/processed-dataset.json', limit=None):
    with app.app_context():
        # Load dataset
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Ensure new columns exist in the existing SQLite table (lightweight migration)
        conn = db.engine.raw_connection()
        cur = conn.cursor()
        cur.execute("PRAGMA table_info('cars')")
        existing_cols = {row[1] for row in cur.fetchall()}

        # Desired new columns and SQL types (SQLite) — only processed dataset fields
        new_cols = {
            'cylinders': 'INTEGER',
            'acceleration_0_100': 'REAL',
            'vitesse_max': 'INTEGER',
            'drive_type': 'TEXT',
            'city_mpg': 'REAL',
            'highway_mpg': 'REAL',
            'combined_mpg': 'REAL',
            'torque_nm': 'INTEGER',
            'length': 'TEXT',
            'width': 'TEXT',
            'height': 'TEXT',
            'raw_spec': 'TEXT'
        }
        for col, col_type in new_cols.items():
            if col not in existing_cols:
                try:
                    cur.execute(f"ALTER TABLE cars ADD COLUMN {col} {col_type}")
                    print(f"Added missing column to cars: {col} {col_type}")
                except Exception as e:
                    print(f"Failed to add column {col}: {e}")
        conn.commit()

        added = 0
        rows = data if limit is None else data[:limit]
        for rec in rows:
            # Processed dataset mapping (we no longer support the legacy mock schema)
            brand = rec.get('Company') or rec.get('brand')
            model = rec.get('Model') or rec.get('model') or rec.get('Serie')

            # Production Years can be a range or a list; take the latest year if present
            years = re.findall(r"(\d{4})", rec.get('Production Years') or '')
            year = int(min(years)) if years else 2024

            price = 0.0
            engine_type = rec.get('Fuel') or rec.get('Fuel System')
            horsepower = extract_int(rec.get('Power(HP)'))
            fuel_type = rec.get('Fuel')
            transmission = rec.get('Gearbox')

            # Parse cylinders (e.g. 'L4' -> 4)
            cylinders = extract_int(rec.get('Cylinders'))
            acceleration_0_100 = extract_float(rec.get('Acceleration 0-62 Mph (0-100kph)'))
            vitesse_max = extract_int(rec.get('Top Speed'))

            combined = rec.get('Combined mpg') or ''

            # Additional processed dataset fields
            drive_type = rec.get('Drive Type')
            city_mpg = extract_float(rec.get('City mpg'))
            highway_mpg = extract_float(rec.get('Highway mpg'))
            combined_mpg = None
            # Try to extract an mpg value (e.g. '30.5 mpg US')
            m2 = re.search(r"([\d\.]+)\s*mpg", combined, re.I)
            if m2:
                try:
                    combined_mpg = float(m2.group(1))
                except ValueError:
                    combined_mpg = None

            torque_nm = extract_int(rec.get('Torque(Nm)'))
            length = rec.get('Length')
            width = rec.get('Width')
            height = rec.get('Height')
            raw_spec = json.dumps(rec, ensure_ascii=False)

            # Skip if a similar car already exists (brand+model+year)
            exists = Car.query.filter_by(brand=brand, model=model, year=year).first()
            if exists:
                print(f"Skipping existing car: {brand} {model} ({year})")
                continue

            car = Car(
                brand=brand,
                model=model,
                year=year,
                price=price,
                engine_type=engine_type,
                horsepower=horsepower,
                fuel_type=fuel_type,
                transmission=transmission,
                color=None,
                mileage=0,
                # Processed dataset fields
                cylinders=cylinders,
                acceleration_0_100=acceleration_0_100,
                vitesse_max=vitesse_max,
                drive_type=locals().get('drive_type'),
                city_mpg=locals().get('city_mpg'),
                highway_mpg=locals().get('highway_mpg'),
                combined_mpg=locals().get('combined_mpg'),
                torque_nm=locals().get('torque_nm'),
                length=locals().get('length'),
                width=locals().get('width'),
                height=locals().get('height'),
                raw_spec=locals().get('raw_spec')
            )
            db.session.add(car)
            added += 1
        db.session.commit()
        print(f"Imported {added} new cars into DB from {path}: {app.config['SQLALCHEMY_DATABASE_URI']} (skipped {len(data)-added} duplicates)")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Import cars dataset into DB')
    parser.add_argument('--path', help='Path to JSON dataset', default='data/processed/processed-dataset.json')
    parser.add_argument('--limit', help='Limit number of rows to import (for testing)', type=int)
    args = parser.parse_args()
    import_data(path=args.path, limit=args.limit)