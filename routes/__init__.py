from flask import Blueprint

api = Blueprint('api', __name__, url_prefix='/api/v1')

# Register sub-blueprints
from .auth import auth_bp
from .admin import admin_bp
from .attendee import attendee_bp

api.register_blueprint(auth_bp)
api.register_blueprint(admin_bp)
api.register_blueprint(attendee_bp)