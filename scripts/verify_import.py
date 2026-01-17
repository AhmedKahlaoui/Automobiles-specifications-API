import sys
import os
import json
# ensure project root is importable
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
from app import create_app

app = create_app()
with app.test_client() as c:
    r = c.get('/api/v1/cars/stats')
    print('STATUS /api/v1/cars/stats:', r.status_code)
    try:
        stats = r.get_json()
        print('total_cars:', stats.get('total_cars'))
        print('average_combined_mpg:', stats.get('average_combined_mpg'))
        print('brands:', stats.get('brands'))
    except Exception as e:
        print('failed to parse stats json', e)

    r2 = c.get('/api/v1/cars')
    print('\nSTATUS /api/v1/cars (raw default):', r2.status_code)
    try:
        data = r2.get_json()
        cars = data.get('cars') or data
        print('first car (raw snippet):')
        print(json.dumps(cars[0], indent=2)[:800])
    except Exception as e:
        print('failed to parse cars json', e)
