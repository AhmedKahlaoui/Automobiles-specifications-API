import sys
sys.path.insert(0, '.')
from app import create_app
from services.car_service import search_cars
import json

app = create_app()

with app.app_context():
    # Test search
    cars = search_cars('BMW')
    print(f'Found {len(cars)} BMW cars')
    
    if cars:
        car = cars[0]
        print(f'\nFirst car:')
        print(f'  ID: {car.id}')
        print(f'  Brand: {car.brand}')
        print(f'  Model: {car.model}')
        
        # Test the response format
        spec = json.loads(car.raw_spec) if car.raw_spec else {}
        response_item = {'id': car.id, 'spec': spec}
        print(f'\nResponse format test:')
        print(f'  Has id: {"id" in response_item}')
        print(f'  Has spec: {"spec" in response_item}')
        print(f'  ID value: {response_item["id"]}')
        print(f'  Spec keys: {list(response_item["spec"].keys())[:5]}...')
