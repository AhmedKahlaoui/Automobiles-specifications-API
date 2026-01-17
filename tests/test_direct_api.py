import requests

response = requests.get('http://localhost:5000/api/v1/cars/search?q=BMW')
data = response.json()

print(f'Status Code: {response.status_code}')
print(f'Results found: {data.get("count", 0)}')

if data.get('cars'):
    first = data['cars'][0]
    print(f'First car ID: {first.get("id")}')
    print(f'First car Model: {first.get("spec", {}).get("Model")}')
else:
    print('ERROR: No cars returned in response')
    print(f'Response: {data}')
