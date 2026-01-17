from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from services.car_service import create_car, update_car, delete_car, get_car
from models import db
from functools import wraps

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if not claims or not claims.get('is_admin'):
            return jsonify({'error':'Admin privileges required'}), 403
        return fn(*args, **kwargs)
    return wrapper


@admin_bp.route('/cars', methods=['POST'])
@admin_required
def create_car_route():
    """Create a new car (admin)
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - brand
            - model
            - year
          properties:
            brand: {type: string, description: "Car brand (e.g. BMW, Audi)"}
            model: {type: string, description: "Car model (e.g. 3 Series, A4)"}
            year: {type: integer, description: "Production year"}
            cylinders: {type: integer, description: "Number of cylinders"}
            engine_type: {type: string, description: "Engine type (e.g. Gasoline, Diesel, Electric)"}
            horsepower: {type: integer, description: "Engine horsepower"}
            fuel_type: {type: string, description: "Fuel type"}
            transmission: {type: string, description: "Transmission type (e.g. Automatic, Manual)"}
            acceleration_0_100: {type: number, description: "Acceleration 0-100 km/h in seconds"}
            vitesse_max: {type: integer, description: "Maximum speed in km/h"}
            drive_type: {type: string, description: "Drive type (AWD, RWD, FWD)"}
            city_mpg: {type: number, description: "City MPG fuel efficiency"}
            highway_mpg: {type: number, description: "Highway MPG fuel efficiency"}
            combined_mpg: {type: number, description: "Combined MPG fuel efficiency"}
            torque_nm: {type: integer, description: "Torque in Newton-meters"}
            length: {type: string, description: "Vehicle length"}
            width: {type: string, description: "Vehicle width"}
            height: {type: string, description: "Vehicle height"}
            raw_spec: {type: string, description: "Raw JSON spec data"}
    responses:
      201:
        description: Car created successfully
      403:
        description: Admin privileges required
      400:
        description: Missing required fields
    """
    data = request.get_json() or {}
    required_fields = ['brand','model','year']
    if not all(field in data for field in required_fields):
        return jsonify({'error':'Missing required fields: brand, model, year'}), 400
    try:
        car = create_car(data)
        return jsonify({'message':'Car created successfully','car':car.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error':str(e)}), 500


@admin_bp.route('/cars/<int:car_id>', methods=['PUT'])
@admin_required
def update_car_route(car_id):
    """
    Update a car (admin)
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: path
        name: car_id
        schema:
          type: integer
        required: true
        description: ID of the car to update
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            brand: {type: string}
            model: {type: string}
            year: {type: integer}
            price: {type: number}
    responses:
      200:
        description: Car updated
      404:
        description: Car not found
      403:
        description: Admin privileges required
      400:
        description: Invalid or missing JSON body
    """
    car = get_car(car_id)
    if not car:
        return jsonify({'error':'Car not found'}), 404
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data:
        return jsonify({'error': 'JSON body required', 'hint': 'Send Content-Type: application/json with fields to update'}), 400
    try:
        updated = update_car(car, data)
        return jsonify({'message':'Car updated','car':updated.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error':str(e)}), 500


@admin_bp.route('/cars/<int:car_id>', methods=['DELETE'])
@admin_required
def delete_car_route(car_id):
    """
    Delete a car (admin)
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: car_id
        schema:
          type: integer
        required: true
        description: ID of the car to delete
    responses:
      200:
        description: Car deleted
      404:
        description: Car not found
      403:
        description: Admin privileges required
    """
    car = get_car(car_id)
    if not car:
        return jsonify({'error':'Car not found'}), 404
    try:
        delete_car(car)
        return jsonify({'message':'Car deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error':str(e)}), 500