import json
import sys
sys.path.insert(0, '.')

from app import create_app
from threading import Thread
import time
import urllib.request

app = create_app()

def run_server():
    app.run(debug=False, host='127.0.0.1', port=5003, use_reloader=False, threaded=True)

server_thread = Thread(target=run_server, daemon=True)
server_thread.start()
time.sleep(3)

# Test login
try:
    url = 'http://localhost:5003/api/v1/auth/login'
    data = json.dumps({'username': 'testadmin', 'password': 'password123'}).encode()
    req = urllib.request.Request(url, data=data, method='POST', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read())
        print("LOGIN RESPONSE:")
        print(json.dumps(result, indent=2))
        access_token = result.get('access_token', '')
        print(f'\nAccess token captured: {len(access_token)} chars')
        
        # Now test admin create car endpoint
        print("\n\nTesting Admin Create Car endpoint...")
        admin_url = 'http://localhost:5003/api/v1/admin/cars'
        car_data = json.dumps({
            'brand': 'TestBrand',
            'model': 'TestModel',
            'year': 2024,
            'price': 50000
        }).encode()
        admin_req = urllib.request.Request(
            admin_url, 
            data=car_data, 
            method='POST', 
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}'
            }
        )
        with urllib.request.urlopen(admin_req) as admin_response:
            admin_result = json.loads(admin_response.read())
            print("ADMIN CREATE CAR RESPONSE:")
            print(json.dumps(admin_result, indent=2))
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
