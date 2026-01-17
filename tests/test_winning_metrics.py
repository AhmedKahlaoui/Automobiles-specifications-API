import sys
sys.path.insert(0, '.')
from app import create_app
from services.car_service import compare_by_serie
import json

app = create_app()

with app.app_context():
    result = compare_by_serie('Golf')
    print('=== GOLF COMPARISON RESPONSE ===')
    print('Total cars:', result.get('total_cars'))
    print('Cars in response:', len(result.get('cars', [])))
    
    # Show first car with winning metrics
    if result.get('cars'):
        car = result['cars'][0]
        print('\nFirst car (ID', car['id'], '):')
        print('  Model:', car['spec'].get('Model'))
        if 'winning_metrics' in car:
            print('  WINNING METRICS:')
            for m in car['winning_metrics']:
                print('    -', m['metric_display'], ':', m['value'])
        else:
            print('  (No winning metrics)')
    
    # Show all cars with winning metrics
    print('\n=== ALL CARS WITH WINNING METRICS ===')
    winner_count = 0
    for car in result['cars']:
        if 'winning_metrics' in car:
            winner_count += 1
            metrics_list = ', '.join([m['metric_display'] for m in car['winning_metrics']])
            print(f"Car {car['id']}: {metrics_list}")
    
    print(f'\nTotal cars with winning metrics: {winner_count}/{len(result.get("cars", []))}')
    
    # Show comparison winners summary
    print('\n=== COMPARISON WINNERS SUMMARY ===')
    for metric, winner in result['comparison_winners'].items():
        print(winner['metric_display'], ':', winner['car_id'], '-', winner['value'])
