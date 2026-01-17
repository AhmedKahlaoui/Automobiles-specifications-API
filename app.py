from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flasgger import Swagger
from config import config
from models import db
from routes import api
import os
from collections import OrderedDict

def create_app(config_name='default'):
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Enable CORS
    CORS(app)

    # Initialize JWT
    JWTManager(app)

    # Initialize Swagger UI (set host so UI fetches spec from the right origin)
    swagger_host = os.environ.get('SWAGGER_HOST') or app.config.get('SWAGGER_HOST') or '127.0.0.1:5000'
    # Add bearer auth definition so Swagger UI shows an Authorize dialog
    swagger_template = {
        'host': swagger_host,
        'securityDefinitions': {
            'bearerAuth': {
                'type': 'apiKey',
                'name': 'Authorization',
                'in': 'header',
                'description': "JWT Authorization header using the Bearer scheme. Example: 'Authorization: Bearer {token}'"
            }
        },
        'security': [
            {'bearerAuth': []}
        ],
        'definitions': {
            'CarInput': {
                'type': 'object',
                'required': ['brand', 'model', 'year'],
                'properties': OrderedDict([
                    ('brand', {'type': 'string', 'description': 'Car brand (e.g. BMW, Audi)'}),
                    ('model', {'type': 'string', 'description': 'Car model (e.g. 3 Series, A4)'}),
                    ('year', {'type': 'integer', 'description': 'Production year'}),
                    ('cylinders', {'type': 'integer', 'description': 'Number of cylinders'}),
                    ('engine_type', {'type': 'string', 'description': 'Engine type (e.g. Gasoline, Diesel, Electric)'}),
                    ('horsepower', {'type': 'integer', 'description': 'Engine horsepower'}),
                    ('fuel_type', {'type': 'string', 'description': 'Fuel type'}),
                    ('transmission', {'type': 'string', 'description': 'Transmission type (e.g. Automatic, Manual)'}),
                    ('acceleration_0_100', {'type': 'number', 'description': 'Acceleration 0-100 km/h in seconds'}),
                    ('vitesse_max', {'type': 'integer', 'description': 'Maximum speed in km/h'}),
                    ('drive_type', {'type': 'string', 'description': 'Drive type (AWD, RWD, FWD)'}),
                    ('city_mpg', {'type': 'number', 'description': 'City MPG fuel efficiency'}),
                    ('highway_mpg', {'type': 'number', 'description': 'Highway MPG fuel efficiency'}),
                    ('combined_mpg', {'type': 'number', 'description': 'Combined MPG fuel efficiency'}),
                    ('torque_nm', {'type': 'integer', 'description': 'Torque in Newton-meters'}),
                    ('length', {'type': 'string', 'description': 'Vehicle length'}),
                    ('width', {'type': 'string', 'description': 'Vehicle width'}),
                    ('height', {'type': 'string', 'description': 'Vehicle height'}),
                    ('raw_spec', {'type': 'string', 'description': 'Raw JSON spec data'})
                ]),
                'example': OrderedDict([
                    ('brand', ''),
                    ('model', ''),
                    ('year', 0),
                    ('cylinders', 0),
                    ('engine_type', ''),
                    ('horsepower', 0),
                    ('fuel_type', ''),
                    ('transmission', ''),
                    ('acceleration_0_100', 0),
                    ('vitesse_max', 0),
                    ('drive_type', ''),
                    ('city_mpg', 0),
                    ('highway_mpg', 0),
                    ('combined_mpg', 0),
                    ('torque_nm', 0),
                    ('length', ''),
                    ('width', ''),
                    ('height', ''),
                    ('raw_spec', '')
                ])
            }
        }
    }
    Swagger(app, template=swagger_template)
    
    # Initialize database
    db.init_app(app)
    
    # Register blueprints
    app.register_blueprint(api)
    
    # Create tables
    with app.app_context():
        db.create_all()
        # Optionally create an initial admin user from environment variables
        admin_username = os.environ.get('ADMIN_USER')
        admin_password = os.environ.get('ADMIN_PASSWORD')
        if admin_username and admin_password:
            from models import User
            if not User.query.filter_by(username=admin_username).first():
                u = User(username=admin_username, is_admin=True)
                u.set_password(admin_password)
                db.session.add(u)
                db.session.commit()
    
    # Root endpoint
    @app.route('/')
    def index():
        return {
            'message': 'Car Specifications API',
            'version': '1.0',
            'endpoints': {
                'cars': '/api/v1/cars',
                'create_car': 'POST /api/v1/cars',
                'get_car': 'GET /api/v1/cars/<id>',
                'update_car': 'PUT /api/v1/cars/<id>',
                'delete_car': 'DELETE /api/v1/cars/<id>',
                'search': 'GET /api/v1/cars/search?q=<query>',
                'stats': 'GET /api/v1/cars/stats'
            }
        }
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Resource not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500
    
    return app

if __name__ == '__main__':
    env = os.environ.get('FLASK_ENV', 'development')
    app = create_app(env)
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)