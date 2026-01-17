from flask import Blueprint, request, jsonify, Response
from collections import OrderedDict
from services.car_service import (
    get_cars, get_car, search_cars, get_stats,
    get_cars_by_brand, get_cars_by_serie, get_cars_by_year,
    get_brands, get_models_by_brand, get_years,
    reorder_car_spec, compare_cars, compare_by_serie, compare_by_brand, 
    compare_by_year, get_top_cars, get_similar_cars,
    get_available_metrics, get_available_series, get_available_brands, get_available_years
)
import json

attendee_bp = Blueprint('attendee', __name__, url_prefix='')


def _safe_raw_spec(raw_spec: str | None):
  if not raw_spec:
    return {}
  try:
    return json.loads(raw_spec)
  except Exception:
    # Some legacy rows may contain non-JSON strings in raw_spec.
    return {}


def _strip_keys(spec: dict, keys: list[str]) -> dict:
  for k in keys:
    spec.pop(k, None)
  return spec


def _merge_spec_with_canonical(car) -> dict:
  base = _safe_raw_spec(getattr(car, 'raw_spec', None))
  if not isinstance(base, dict):
    base = {}

  merged: dict = dict(base)

  # Never expose these legacy/mock fields in attendee outputs.
  _strip_keys(
    merged,
    [
      'price', 'Price',
      'color', 'Color',
      'created_at', 'createdAt', 'Created At', 'Created',
      'updated_at', 'updatedAt', 'Updated At', 'Updated',
    ],
  )

  def set_field(key: str, value, aliases: list[str]):
    if value is None:
      return
    if isinstance(value, str) and not value.strip():
      return
    # Many dataset rows use 0 as a placeholder for "unknown" numeric values.
    # Do not surface those in attendee-visible specs.
    if isinstance(value, (int, float)) and value <= 0:
      return
    # Remove potential duplicates from raw spec before setting canonical field.
    _strip_keys(merged, aliases)
    merged[key] = value

  # Put canonical fields first (frontend renders in insertion order).
  ordered = OrderedDict()

  # Identity-like fields (use the dataset/raw_spec naming)
  brand = getattr(car, 'brand', None)
  model = getattr(car, 'model', None)
  year = getattr(car, 'year', None)
  set_field('Company', brand, ['brand', 'Brand', 'Company'])
  set_field('Model', model, ['model', 'Model'])
  set_field('Production Years', str(year) if year is not None else None, ['year', 'Year', 'Production Years'])

  # Canonical processed fields mapped to raw_spec-style labels
  set_field('Cylinders', getattr(car, 'cylinders', None), ['cylinders', 'Cylinders'])
  set_field('Fuel', getattr(car, 'fuel_type', None), ['fuel_type', 'Fuel Type', 'Fuel'])
  set_field('Gearbox', getattr(car, 'transmission', None), ['transmission', 'Transmission', 'Gearbox'])
  set_field('Drive Type', getattr(car, 'drive_type', None), ['drive_type', 'Drive type', 'Drive Type', 'Drive'])
  set_field('Top Speed', getattr(car, 'vitesse_max', None), ['vitesse_max', 'Top Speed', 'Vitesse Max', 'Vitesse max'])

  # The dataset uses a slightly odd key (sometimes with a trailing newline).
  set_field('Power(HP)', getattr(car, 'horsepower', None), ['horsepower', 'Horsepower', 'Power(HP)', 'Power(HP)\n', 'Power(HP)\r\n'])
  set_field('Torque(Nm)', getattr(car, 'torque_nm', None), ['torque_nm', 'Torque', 'Torque (Nm)', 'Torque Nm', 'Torque(Nm)'])
  set_field(
    'Acceleration 0-62 Mph (0-100kph)',
    getattr(car, 'acceleration_0_100', None),
    [
      'acceleration_0_100',
      'Acceleration 0-100',
      'Acceleration 0-62 Mph (0-100kph)',
      '0-100',
      '0-100 km/h',
      '0-100km/h',
    ],
  )

  set_field('Length', getattr(car, 'length', None), ['length', 'Length'])
  set_field('Width', getattr(car, 'width', None), ['width', 'Width'])
  set_field('Height', getattr(car, 'height', None), ['height', 'Height'])
  set_field('City mpg', getattr(car, 'city_mpg', None), ['city_mpg', 'City MPG', 'City mpg'])
  set_field('Highway mpg', getattr(car, 'highway_mpg', None), ['highway_mpg', 'Highway MPG', 'Highway mpg'])
  set_field('Combined mpg', getattr(car, 'combined_mpg', None), ['combined_mpg', 'Combined MPG', 'Combined mpg'])

  # Materialize the ordered-first fields.
  for k in list(merged.keys()):
    # preserve any base keys that were not overwritten
    pass
  # Insert canonical keys first in stable order.
  for key in [
    'Company','Model','Production Years',
    'Cylinders','Fuel','Gearbox','Drive Type',
    'Power(HP)','Torque(Nm)','Acceleration 0-62 Mph (0-100kph)','Top Speed',
    'Length','Width','Height',
    'City mpg','Highway mpg','Combined mpg',
  ]:
    if key in merged:
      ordered[key] = merged[key]

  # Append the remaining raw-spec fields (already de-duped).
  for k, v in merged.items():
    if k not in ordered:
      ordered[k] = v

  return dict(ordered)


@attendee_bp.route('/cars', methods=['GET'])
def get_cars_route():
    """
    List cars with optional filters
    ---
    tags:
      - Cars
    parameters:
      - in: query
        name: brand
        schema:
          type: string
      - in: query
        name: model
        schema:
          type: string
      - in: query
        name: min_year
        schema:
          type: integer
      - in: query
        name: max_year
        schema:
          type: integer
      - in: query
        name: page
        schema:
          type: integer
    responses:
      200:
        description: A list of cars. Returns the original source dataset objects (raw dataset JSON) by default.
        content:
          application/json:
            schema:
              type: object
              properties:
                cars:
                  type: array
                  items:
                    type: object
                total: {type: integer}
                page: {type: integer}
                per_page: {type: integer}
                pages: {type: integer}
    """
    filters = {
      'q': request.args.get('q'),
      'brand': request.args.get('brand'),
      'model': request.args.get('model'),
      'min_year': request.args.get('min_year'),
      'max_year': request.args.get('max_year'),
      'min_price': request.args.get('min_price'),
      'max_price': request.args.get('max_price'),
      'fuel_type': request.args.get('fuel_type'),
      'transmission': request.args.get('transmission'),
      'drive_type': request.args.get('drive_type'),
      'cylinders': request.args.get('cylinders'),
      'min_horsepower': request.args.get('min_horsepower'),
      'max_horsepower': request.args.get('max_horsepower'),
      'min_combined_mpg': request.args.get('min_combined_mpg'),
      'max_combined_mpg': request.args.get('max_combined_mpg'),
      'max_acceleration_0_100': request.args.get('max_acceleration_0_100'),
      'min_vitesse_max': request.args.get('min_vitesse_max'),
      'max_vitesse_max': request.args.get('max_vitesse_max'),
      'min_torque_nm': request.args.get('min_torque_nm'),
      'max_torque_nm': request.args.get('max_torque_nm'),
    }
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    sort_by = request.args.get('sort_by', 'id')
    order = request.args.get('order', 'asc')
    paginated = get_cars(filters, sort_by, order, page, per_page)
    cars_list = [{'id': car.id, 'spec': _merge_spec_with_canonical(car)} for car in paginated.items]
    body = {
        'cars': cars_list,
        'total': paginated.total,
        'page': page,
        'per_page': per_page,
        'pages': paginated.pages
    }
    # Use explicit JSON serialization with sort_keys=False to preserve field order
    return Response(json.dumps(body, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), 200


@attendee_bp.route('/cars/<int:car_id>', methods=['GET'])
def get_car_route(car_id):
    """
    Get car by id
    ---
    tags:
      - Cars
    parameters:
      - in: path
        name: car_id
        schema:
          type: integer
        required: true
        description: ID of the car
    responses:
      200:
        description: Car found. Returns the original source dataset object (`raw_spec`) by default.
        content:
          application/json:
            schema:
              type: object
              properties:
                car:
                  type: object
      404:
        description: Car not found
    """
    car = get_car(car_id)
    if not car:
        return jsonify({'error': 'Car not found'}), 404
    # For details, return a merged spec so admin-updated canonical fields are visible
    # even when the source dataset lives in raw_spec.
    body = {'car': _merge_spec_with_canonical(car)}
    return Response(json.dumps(body, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), 200


@attendee_bp.route('/cars/search', methods=['GET'])
def search_route():
    """
    Search cars by query
    ---
    tags:
      - Cars
    parameters:
      - in: query
        name: q
        schema:
          type: string
        required: true
        description: Search query string
    responses:
      200:
        description: Search results. Returns canonical car objects in `cars`.
        content:
          application/json:
            schema:
              type: object
              properties:
                cars:
                  type: array
                  items:
                    type: object
                count:
                  type: integer
      400:
        description: Search query required
    """
    q = request.args.get('q', '')
    if not q:
        return jsonify({'error': 'Search query required'}), 400
    cars = search_cars(q)
    cars_list = [{'id': c.id, 'spec': reorder_car_spec(_safe_raw_spec(c.raw_spec))} for c in cars]
    return Response(json.dumps({'cars': cars_list, 'count': len(cars)}, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), 200


@attendee_bp.route('/cars/compare', methods=['POST'])
def compare_route():
    """
    Compare multiple cars side-by-side
    ---
    tags:
      - Cars
    parameters:
      - in: query
        name: ids
        schema:
          type: string
        description: Comma-separated car IDs (e.g., "1,2,3")
    requestBody:
      description: Alternative way to provide car IDs in POST body
      required: false
      content:
        application/json:
          schema:
            type: object
            properties:
              car_ids:
                type: array
                items:
                  type: integer
                description: Array of car IDs to compare
    responses:
      200:
        description: Side-by-side comparison of cars with winners in each metric
        content:
          application/json:
            schema:
              type: object
              properties:
                cars:
                  type: array
                  items:
                    type: object
                comparison_winners:
                  type: object
                  description: Best performing car for each metric
                total_cars: {type: integer}
      400:
        description: Invalid request (missing IDs or less than 2 cars)
    """
    # Get car IDs from either query param or request body
    car_ids = None
    
    if request.is_json:
        data = request.get_json()
        car_ids = data.get('car_ids', [])
    
    if not car_ids:
        ids_param = request.args.get('ids', '')
        if ids_param:
            try:
                car_ids = [int(id.strip()) for id in ids_param.split(',')]
            except ValueError:
                return jsonify({'error': 'Invalid car IDs format. Use comma-separated integers.'}), 400
    
    if not car_ids:
        return jsonify({'error': 'car_ids required. Provide as ?ids=1,2,3 or in POST body with {"car_ids": [1,2,3]}'}), 400
    
    result = compare_cars(car_ids)
    
    if 'error' in result:
        return jsonify(result), 400
    
    return Response(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), 200


@attendee_bp.route('/cars/stats', methods=['GET'])
def stats_route():
    """
    Cars statistics
    ---
    tags:
      - Cars
    responses:
      200:
        description: Aggregated statistics for cars
        content:
          application/json:
            schema:
              type: object
    """
    return jsonify(get_stats()), 200


@attendee_bp.route('/browse/brands', methods=['GET'])
def brands_list_route():
    """
    List all brands with car counts
    ---
    tags:
      - Browse
    responses:
      200:
        description: List of all car brands
        content:
          application/json:
            schema:
              type: object
              properties:
                brands:
                  type: array
                  items:
                    type: object
                    properties:
                      brand: {type: string}
                      count: {type: integer}
                total: {type: integer}
    """
    brands = get_brands()
    return jsonify({'brands': brands, 'total': len(brands)}), 200


@attendee_bp.route('/browse/brands/<brand>/series', methods=['GET'])
def series_by_brand_route(brand):
    """
    List all series/model names for a specific brand
    ---
    tags:
      - Browse
    parameters:
      - in: path
        name: brand
        schema:
          type: string
        required: true
        description: Brand name
    responses:
      200:
        description: List of series/models for the brand
        content:
          application/json:
            schema:
              type: object
              properties:
                brand: {type: string}
                series:
                  type: array
                  items:
                    type: object
                    properties:
                      serie: {type: string}
                      count: {type: integer}
                total: {type: integer}
    """
    series = get_models_by_brand(brand)
    return jsonify({'brand': brand, 'series': series, 'total': len(series)}), 200


@attendee_bp.route('/browse/years', methods=['GET'])
def years_list_route():
    """
    List all years with car counts
    ---
    tags:
      - Browse
    responses:
      200:
        description: List of all production years
        content:
          application/json:
            schema:
              type: object
              properties:
                years:
                  type: array
                  items:
                    type: object
                    properties:
                      year: {type: integer}
                      count: {type: integer}
                total: {type: integer}
    """
    years = get_years()
    return jsonify({'years': years, 'total': len(years)}), 200


@attendee_bp.route('/filter/by-brand/<brand>', methods=['GET'])
def filter_by_brand_route(brand):
    """
    Get all cars for a specific brand
    ---
    tags:
      - Filter
    parameters:
      - in: path
        name: brand
        schema:
          type: string
        required: true
        description: Exact brand name
      - in: query
        name: page
        schema:
          type: integer
      - in: query
        name: per_page
        schema:
          type: integer
    responses:
      200:
        description: Cars for the brand. Returns original source dataset objects.
        content:
          application/json:
            schema:
              type: object
              properties:
                brand: {type: string}
                cars:
                  type: array
                  items:
                    type: object
                total: {type: integer}
                page: {type: integer}
                per_page: {type: integer}
                pages: {type: integer}
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    paginated = get_cars_by_brand(brand, page, per_page)
    cars_list = [{'id': car.id, 'spec': reorder_car_spec(_safe_raw_spec(car.raw_spec))} for car in paginated.items]
    body = {
      'brand': brand,
      'cars': cars_list,
      'total': paginated.total,
      'page': page,
      'per_page': per_page,
      'pages': paginated.pages
    }
    return Response(json.dumps(body, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), 200


@attendee_bp.route('/filter/by-serie/<serie>', methods=['GET'])
def filter_by_serie_route(serie):
    """
    Get all cars for a specific serie/model series
    ---
    tags:
      - Filter
    parameters:
      - in: path
        name: serie
        schema:
          type: string
        required: true
        description: Model series (partial match supported, e.g., 'A4', 'Golf', '3 Series')
      - in: query
        name: page
        schema:
          type: integer
      - in: query
        name: per_page
        schema:
          type: integer
    responses:
      200:
        description: Cars for the serie. Returns original source dataset objects.
        content:
          application/json:
            schema:
              type: object
              properties:
                serie: {type: string}
                cars:
                  type: array
                  items:
                    type: object
                total: {type: integer}
                page: {type: integer}
                per_page: {type: integer}
                pages: {type: integer}
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    paginated = get_cars_by_serie(serie, page, per_page)
    cars_list = [{'id': car.id, 'spec': reorder_car_spec(_safe_raw_spec(car.raw_spec))} for car in paginated.items]
    body = {
      'serie': serie,
      'cars': cars_list,
      'total': paginated.total,
      'page': page,
      'per_page': per_page,
      'pages': paginated.pages
    }
    return Response(json.dumps(body, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), 200


@attendee_bp.route('/filter/by-year/<int:year>', methods=['GET'])
def filter_by_year_route(year):
    """
    Get all cars for a specific year
    ---
    tags:
      - Filter
    parameters:
      - in: path
        name: year
        schema:
          type: integer
        required: true
        description: Production year
      - in: query
        name: page
        schema:
          type: integer
      - in: query
        name: per_page
        schema:
          type: integer
    responses:
      200:
        description: Cars for the year. Returns original source dataset objects.
        content:
          application/json:
            schema:
              type: object
              properties:
                year: {type: integer}
                cars:
                  type: array
                  items:
                    type: object
                total: {type: integer}
                page: {type: integer}
                per_page: {type: integer}
                pages: {type: integer}
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    paginated = get_cars_by_year(year, page, per_page)
    cars_list = [{'id': car.id, 'spec': reorder_car_spec(_safe_raw_spec(car.raw_spec))} for car in paginated.items]
    body = {
      'year': year,
      'cars': cars_list,
      'total': paginated.total,
      'page': page,
      'per_page': per_page,
      'pages': paginated.pages
    }
    return Response(json.dumps(body, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), 200


@attendee_bp.route('/cars/compare/by-serie/<serie>', methods=['GET'])
def compare_by_serie_route(serie):
    """
    Compare all variants of a specific serie/model series
    ---
    tags:
      - Compare
    parameters:
      - in: path
        name: serie
        schema:
          type: string
        required: true
        description: Model series (e.g., Golf, A4, 3 Series)
    responses:
      200:
        description: Side-by-side comparison of all cars in the serie
      400:
        description: Insufficient cars found for comparison
    """
    result = compare_by_serie(serie)
    status = 400 if 'error' in result else 200
    return Response(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), status


@attendee_bp.route('/cars/compare/by-brand/<brand>', methods=['GET'])
def compare_by_brand_route(brand):
    """
    Compare all cars from a specific brand
    ---
    tags:
      - Compare
    parameters:
      - in: path
        name: brand
        schema:
          type: string
        required: true
        description: Brand name (e.g., Audi, BMW, Ferrari)
    responses:
      200:
        description: Side-by-side comparison of all cars from the brand
      400:
        description: Insufficient cars found for comparison
    """
    result = compare_by_brand(brand)
    status = 400 if 'error' in result else 200
    return Response(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), status


@attendee_bp.route('/cars/compare/by-year/<int:year>', methods=['GET'])
def compare_by_year_route(year):
    """
    Compare all cars from a specific production year
    ---
    tags:
      - Compare
    parameters:
      - in: path
        name: year
        schema:
          type: integer
        required: true
        description: Production year (e.g., 2023)
    responses:
      200:
        description: Side-by-side comparison of all cars from that year
      400:
        description: Insufficient cars found for comparison
    """
    result = compare_by_year(year)
    status = 400 if 'error' in result else 200
    return Response(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), status


@attendee_bp.route('/cars/top/<metric>', methods=['GET'])
def top_cars_route(metric):
    """
    Get top-ranked cars by a specific metric
    ---
    tags:
      - Rankings
    parameters:
      - in: path
        name: metric
        schema:
          type: string
          enum: [horsepower, acceleration_0_100, vitesse_max, combined_mpg, torque_nm, year]
        required: true
        description: Metric to rank by
      - in: query
        name: limit
        schema:
          type: integer
        description: Number of top cars to return (default 10, max 100)
    responses:
      200:
        description: Top N cars ranked by the specified metric
      400:
        description: Invalid metric
    """
    limit = request.args.get('limit', 10, type=int)
    result = get_top_cars(metric, limit)
    status = 400 if 'error' in result else 200
    return Response(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), status


@attendee_bp.route('/cars/<int:car_id>/similar', methods=['GET'])
def similar_cars_route(car_id):
    """
    Find cars similar to a specific car
    ---
    tags:
      - Recommendations
    parameters:
      - in: path
        name: car_id
        schema:
          type: integer
        required: true
        description: Reference car ID
      - in: query
        name: limit
        schema:
          type: integer
        description: Number of similar cars to return (default 10, max 100)
    responses:
      200:
        description: List of similar cars ranked by similarity score
      404:
        description: Car not found
    """
    limit = request.args.get('limit', 10, type=int)
    result = get_similar_cars(car_id, limit)
    status = 404 if 'error' in result else 200
    return Response(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), status


@attendee_bp.route('/available/metrics', methods=['GET'])
def available_metrics_route():
    """
    Get available metrics for ranking and comparison
    ---
    tags:
      - Discovery
    responses:
      200:
        description: List of available ranking metrics with descriptions and usage examples
        content:
          application/json:
            schema:
              type: object
              properties:
                metrics:
                  type: array
                  items:
                    type: object
                    properties:
                      name: {type: string}
                      display: {type: string}
                      description: {type: string}
                      direction: {type: string}
                      usage: {type: string}
    """
    result = get_available_metrics()
    return Response(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), 200


@attendee_bp.route('/available/series', methods=['GET'])
def available_series_route():
    """
    Get available model series for filtering and comparison
    ---
    tags:
      - Discovery
    parameters:
      - in: query
        name: limit
        schema:
          type: integer
        description: Number of series to return (default 50)
    responses:
      200:
        description: List of available model series with car counts
        content:
          application/json:
            schema:
              type: object
              properties:
                available_series:
                  type: array
                  items:
                    type: object
                    properties:
                      series: {type: string}
                      count: {type: integer}
                total_unique_series: {type: integer}
    """
    limit = request.args.get('limit', 50, type=int)
    result = get_available_series(limit)
    return Response(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), 200


@attendee_bp.route('/available/brands', methods=['GET'])
def available_brands_route():
    """
    Get available brands for filtering and comparison
    ---
    tags:
      - Discovery
    parameters:
      - in: query
        name: limit
        schema:
          type: integer
        description: Number of brands to return (default 50)
    responses:
      200:
        description: List of available brands with car counts
        content:
          application/json:
            schema:
              type: object
              properties:
                available_brands:
                  type: array
                  items:
                    type: object
                    properties:
                      brand: {type: string}
                      count: {type: integer}
                total_brands: {type: integer}
    """
    limit = request.args.get('limit', 50, type=int)
    result = get_available_brands(limit)
    return Response(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), 200


@attendee_bp.route('/available/years', methods=['GET'])
def available_years_route():
    """
    Get available production years for filtering and comparison
    ---
    tags:
      - Discovery
    responses:
      200:
        description: List of available production years with car counts
        content:
          application/json:
            schema:
              type: object
              properties:
                available_years:
                  type: array
                  items:
                    type: object
                    properties:
                      year: {type: integer}
                      count: {type: integer}
    """
    result = get_available_years()
    return Response(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False), mimetype='application/json'), 200