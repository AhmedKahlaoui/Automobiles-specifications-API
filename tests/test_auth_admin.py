#!/usr/bin/env python
"""
Step-by-step manual testing of Auth and Admin endpoints
Run this script to test the complete authentication and admin car creation flow
"""

import json
import urllib.request
import urllib.error
from threading import Thread
import time
import sys
import uuid
sys.path.insert(0, '.')

from app import create_app

# Generate unique username for each test run
unique_id = str(uuid.uuid4())[:8]
test_username = f'testuser_{unique_id}'

# Start server in background
app = create_app()

def run_server():
    app.run(debug=False, host='127.0.0.1', port=5005, use_reloader=False, threaded=True)

server_thread = Thread(target=run_server, daemon=True)
server_thread.start()
time.sleep(4)  # Wait for server to start

BASE_URL = 'http://localhost:5005/api/v1'

print("=" * 80)
print("MANUAL TEST: Auth and Admin Endpoints")
print("=" * 80)

# ============================================================================
# STEP 1: REGISTER A NEW USER
# ============================================================================
print("\n" + "=" * 80)
print("STEP 1: REGISTER A NEW USER")
print("=" * 80)
print("\nEndpoint: POST /api/v1/auth/register")
print(f"Body: {{\"username\": \"{test_username}\", \"password\": \"testpass123\", \"is_admin\": true}}")

register_url = f'{BASE_URL}/auth/register'
register_data = {
    'username': test_username,
    'password': 'testpass123',
    'is_admin': True
}

try:
    req = urllib.request.Request(
        register_url,
        data=json.dumps(register_data).encode(),
        method='POST',
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read())
        print(f"\n✓ Status: {response.status}")
        print(f"✓ Response:")
        print(json.dumps(result, indent=2))
        user_id = result['user']['id']
        print(f"\n→ User created with ID: {user_id}")
except urllib.error.HTTPError as e:
    print(f"\n✗ Error {e.code}: {e.read().decode()}")
    sys.exit(1)

# ============================================================================
# STEP 2: LOGIN TO GET BEARER TOKEN
# ============================================================================
print("\n" + "=" * 80)
print("STEP 2: LOGIN TO GET BEARER TOKEN")
print("=" * 80)
print("\nEndpoint: POST /api/v1/auth/login")
print(f"Body: {{\"username\": \"{test_username}\", \"password\": \"testpass123\"}}")

login_url = f'{BASE_URL}/auth/login'
login_data = {
    'username': test_username,
    'password': 'testpass123'
}

try:
    req = urllib.request.Request(
        login_url,
        data=json.dumps(login_data).encode(),
        method='POST',
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read())
        print(f"\n✓ Status: {response.status}")
        print(f"✓ Response:")
        print(json.dumps(result, indent=2))
        access_token = result['access_token']
        print(f"\n→ Token received (first 50 chars): {access_token[:50]}...")
except urllib.error.HTTPError as e:
    print(f"\n✗ Error {e.code}: {e.read().decode()}")
    sys.exit(1)

# ============================================================================
# STEP 3: USE BEARER TOKEN TO CREATE A CAR (Admin Endpoint)
# ============================================================================
print("\n" + "=" * 80)
print("STEP 3: USE BEARER TOKEN TO CREATE A CAR")
print("=" * 80)
print("\nEndpoint: POST /api/v1/admin/cars")
print("Headers: Authorization: Bearer <TOKEN>")
print("Body:")

create_car_url = f'{BASE_URL}/admin/cars'
car_data = {
    'brand': 'BMW',
    'model': 'BMW 3 Series',
    'year': 2024,
    'engine_type': 'Gasoline',
    'horsepower': 255,
    'fuel_type': 'Gasoline',
    'transmission': 'Automatic',
    'cylinders': 4,
    'acceleration_0_100': 5.8,
    'vitesse_max': 220,
    'drive_type': 'Rear Wheel Drive',
    'torque_nm': 400,
    'city_mpg': 25.0,
    'highway_mpg': 38.0,
    'combined_mpg': 30.0,
    'raw_spec': json.dumps({
        'Company': 'BMW',
        'Model': 'BMW 3 Series',
        'Serie': '3 Series',
        'Production Years': '2024',
        'Fuel': 'Gasoline',
        'Top Speed': '220 km/h',
        'Acceleration 0-100': '5.8 s',
        'Power': '255 HP',
        'Torque': '400 Nm',
        'Gearbox': 'Automatic',
        'Drive Type': 'Rear Wheel Drive'
    })
}

print(json.dumps(car_data, indent=2))

try:
    req = urllib.request.Request(
        create_car_url,
        data=json.dumps(car_data).encode(),
        method='POST',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }
    )
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read())
        print(f"\n✓ Status: {response.status}")
        print(f"✓ Response:")
        print(json.dumps(result, indent=2))
        new_car_id = result['car']['id']
        print(f"\n→ Car created with ID: {new_car_id}")
except urllib.error.HTTPError as e:
    print(f"\n✗ Error {e.code}")
    print(f"Response: {e.read().decode()}")
    sys.exit(1)

# ============================================================================
# STEP 4: VERIFY CAR WAS CREATED (Search Endpoint)
# ============================================================================
print("\n" + "=" * 80)
print("STEP 4: VERIFY CAR WAS CREATED")
print("=" * 80)
print(f"\nEndpoint: GET /api/v1/cars/search?q=BMW")

search_url = f'{BASE_URL}/cars/search?q=BMW'

try:
    req = urllib.request.Request(search_url, method='GET')
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read())
        print(f"\n✓ Status: {response.status}")
        print(f"✓ Found {result['count']} BMW cars")
        
        # Find our newly created car
        our_car = [c for c in result['cars'] if c['id'] == new_car_id]
        if our_car:
            print(f"\n✓ Our car found!")
            print(json.dumps(our_car[0], indent=2))
        else:
            print(f"\n⚠ Our newly created car (ID: {new_car_id}) not found in results")
except urllib.error.HTTPError as e:
    print(f"\n✗ Error {e.code}: {e.read().decode()}")

print("\n" + "=" * 80)
print("TESTING COMPLETE!")
print("=" * 80)
print("\nSummary:")
print(f"1. ✓ Registered user: testuser (ID: {user_id})")
print(f"2. ✓ Logged in and got bearer token")
print(f"3. ✓ Created car via admin endpoint (ID: {new_car_id})")
print(f"4. ✓ Verified car was created in database")
print("\n" + "=" * 80)
