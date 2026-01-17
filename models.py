from flask_sqlalchemy import SQLAlchemy
import json
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class Car(db.Model):
    """Car model for storing car specifications"""
    __tablename__ = 'cars'
    
    id = db.Column(db.Integer, primary_key=True)
    brand = db.Column(db.String(100), nullable=False, index=True)
    model = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False, index=True)
    price = db.Column(db.Float, nullable=False)
    
    # Additional specifications
    engine_type = db.Column(db.String(50))
    horsepower = db.Column(db.Integer)
    fuel_type = db.Column(db.String(50))
    transmission = db.Column(db.String(50))
    color = db.Column(db.String(50))
    mileage = db.Column(db.Integer)

    # Fields aligned with processed dataset (legacy mock columns removed)
    # `cylinders` stores the numeric cylinder count parsed from the dataset (e.g. 'L4' -> 4)
    cylinders = db.Column(db.Integer)
    acceleration_0_100 = db.Column(db.Float)
    vitesse_max = db.Column(db.Integer)

    # MPG & performance
    city_mpg = db.Column(db.Float)
    highway_mpg = db.Column(db.Float)
    combined_mpg = db.Column(db.Float)
    torque_nm = db.Column(db.Integer)

    # Dimensions & raw JSON
    length = db.Column(db.String(100))
    width = db.Column(db.String(100))
    height = db.Column(db.String(100))
    drive_type = db.Column(db.String(50))
    raw_spec = db.Column(db.Text)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert model instance to dictionary with a readable field order.

        Fields include both the legacy mock-style fields and the processed dataset fields.
        """
        return {
            'id': self.id,
            'brand': self.brand,
            'model': self.model,
            'price': self.price,
            'year': self.year,

            # Processed dataset fields
            'cylinders': self.cylinders,
            'engine_type': self.engine_type,
            'horsepower': self.horsepower,
            'fuel_type': self.fuel_type,
            'transmission': self.transmission,
            'acceleration_0_100': self.acceleration_0_100,
            'vitesse_max': self.vitesse_max,
            'drive_type': self.drive_type,
            'city_mpg': self.city_mpg,
            'highway_mpg': self.highway_mpg,
            'combined_mpg': self.combined_mpg,
            'torque_nm': self.torque_nm,
            'length': self.length,
            'width': self.width,
            'height': self.height,

            # Raw JSON for unstructured attributes
            'raw_spec': json.loads(self.raw_spec) if self.raw_spec else None,

            # Appearance & meta
            'color': self.color,
            'mileage': self.mileage,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Car {self.brand} {self.model} ({self.year})>'


class User(db.Model):
    """User model for authentication"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }