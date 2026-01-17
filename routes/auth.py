from flask import Blueprint, request, jsonify
from models import db
from services.auth_service import create_user, authenticate_user
from flask_jwt_extended import create_access_token

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user
    ---
    tags:
      - Auth
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - name: body
        in: body
        required: true
        description: User registration data
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
              description: Username for the account
              example: john_doe
            password:
              type: string
              description: Password for the account
              example: securepassword123
            is_admin:
              type: boolean
              description: Admin flag (optional, defaults to false)
              default: false
    responses:
      201:
        description: User created successfully
      400:
        description: Invalid input or user already exists
      500:
        description: Server error
    """
    data = request.get_json() or {}
    if not all(k in data for k in ('username','password')):
        return jsonify({'error':'username and password required'}), 400
    try:
        user = create_user(data['username'], data['password'], is_admin=data.get('is_admin', False))
        return jsonify({'message':'User created','user':user.to_dict()}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login - Get JWT access token
    ---
    tags:
      - Auth
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - name: body
        in: body
        required: true
        description: Login credentials
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
              description: Your username
              example: john_doe
            password:
              type: string
              description: Your password
              example: securepassword123
    responses:
      200:
        description: Login successful, returns JWT access token
      401:
        description: Invalid credentials
      400:
        description: Missing username or password
    """
    data = request.get_json() or {}
    if not all(k in data for k in ('username','password')):
        return jsonify({'error':'username and password required'}), 400
    user = authenticate_user(data['username'], data['password'])
    if not user:
        return jsonify({'error':'Invalid credentials'}), 401
    access_token = create_access_token(identity=str(user.id), additional_claims={'username': user.username, 'is_admin': user.is_admin})
    return jsonify({'access_token': access_token}), 200