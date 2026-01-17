import requests
import json

# Test search endpoint
r = requests.get('http://localhost:5000/api/v1/cars/search?q=Audi')
data = r.json()

print('=== SEARCH ENDPOINT TEST ===')
print(f'Query: Audi')
print(f'Results found: {data["count"]}\n')
print('First 5 results (with car IDs):')
for car in data['cars'][:5]:
    print(f'  ID: {car["id"]} - {car["spec"].get("Model")}')
