from models import db, Car
from sqlalchemy import or_
from collections import OrderedDict
import json


def safe_load_raw_spec(raw_spec: str | None) -> dict:
    if not raw_spec:
        return {}
    try:
        return json.loads(raw_spec)
    except Exception:
        # Some legacy rows may contain non-JSON strings in raw_spec.
        return {}


def reorder_car_spec(spec_dict):
    """
    Reorder car specification fields with important ones first.
    Puts brand/company, model/serie, and year at the top for easy visibility.
    """
    if not spec_dict:
        return spec_dict
    
    # Define priority field names (in order they should appear)
    priority_fields = ['Company', 'Brand', 'Model', 'Serie', 'Production Years', 'Body style']
    
    ordered = OrderedDict()
    
    # Add priority fields first (if they exist)
    for field in priority_fields:
        if field in spec_dict:
            ordered[field] = spec_dict[field]
    
    # Add remaining fields in their original order, excluding priority fields
    for key, value in spec_dict.items():
        if key not in ordered:
            ordered[key] = value
    
    return dict(ordered)


def _normalize_metric_value(value):
    """Normalize numeric metric values.

    Treat NULL and non-positive numbers as missing because the dataset often
    uses 0 as an "unknown" placeholder for performance metrics.
    """
    if value is None:
        return None
    if isinstance(value, (int, float)) and value <= 0:
        return None
    return value


def compare_cars(car_ids):
    """
    Compare multiple cars side-by-side.
    Returns a structured comparison with all specs and highlights best performer in key metrics.
    
    Args:
        car_ids: List of car IDs to compare
    
    Returns:
        Dict with cars array and comparison_winners showing best car for each metric
    """
    if not car_ids or len(car_ids) < 2:
        return {'error': 'At least 2 car IDs required for comparison', 'cars': [], 'comparison_winners': {}}
    
    cars = Car.query.filter(Car.id.in_(car_ids)).all()
    
    if len(cars) < 2:
        return {'error': f'Only found {len(cars)} cars, need at least 2', 'cars': [], 'comparison_winners': {}}
    
    # Build comparison data
    comparison_data = []
    for car in cars:
        spec = safe_load_raw_spec(car.raw_spec)
        reordered = reorder_car_spec(spec)
        comparison_data.append({
            'id': car.id,
            'spec': reordered,
            'metrics': {
                'horsepower': _normalize_metric_value(car.horsepower),
                'combined_mpg': _normalize_metric_value(car.combined_mpg),
                'acceleration_0_100': _normalize_metric_value(car.acceleration_0_100),
                'vitesse_max': _normalize_metric_value(car.vitesse_max),
                'cylinders': car.cylinders,
                'torque_nm': _normalize_metric_value(car.torque_nm),
                'year': car.year
            }
        })
    
    # Determine winners for each metric (higher is better for most, lower is better for acceleration & mpg)
    winners = {}
    metrics_config = {
        'horsepower': {'higher_better': True},
        'combined_mpg': {'higher_better': True},  # Higher MPG = more efficient = better
        'acceleration_0_100': {'higher_better': False},  # Lower time = faster = better
        'vitesse_max': {'higher_better': True},
        'torque_nm': {'higher_better': True},
        'year': {'higher_better': True}
    }
    
    for metric, config in metrics_config.items():
        valid_cars = [c for c in comparison_data if c['metrics'][metric] is not None]
        if valid_cars:
            if config['higher_better']:
                winner = max(valid_cars, key=lambda x: x['metrics'][metric])
            else:
                winner = min(valid_cars, key=lambda x: x['metrics'][metric])
            
            winners[metric] = {
                'car_id': winner['id'],
                'value': winner['metrics'][metric],
                'metric_display': metric.replace('_', ' ').title()
            }
    
    # Build response with winning_metrics for each car
    cars_response = []
    for c in comparison_data:
        car_response = {'id': c['id'], 'spec': c['spec'], 'metrics': c['metrics']}
        # Find which metrics this car won
        winning_metrics = []
        for metric, winner_info in winners.items():
            if winner_info['car_id'] == c['id']:
                winning_metrics.append({
                    'metric': metric,
                    'metric_display': winner_info['metric_display'],
                    'value': winner_info['value']
                })
        if winning_metrics:
            car_response['winning_metrics'] = winning_metrics
        cars_response.append(car_response)
    
    return {
        'cars': cars_response,
        'comparison_winners': winners,
        'total_cars': len(cars)
    }


def compare_by_serie(serie):
    """
    Compare all cars with a specific serie/model series.
    Returns all variants grouped with comparison winners.
    """
    cars = Car.query.filter(Car.model.ilike(f"%{serie}%")).all()
    
    if not cars or len(cars) < 2:
        return {'error': f'Found {len(cars)} cars for serie "{serie}", need at least 2', 'cars': [], 'comparison_winners': {}}
    
    car_ids = [car.id for car in cars]
    result = compare_cars(car_ids)
    result['serie'] = serie
    return result


def compare_by_brand(brand):
    """
    Compare all cars from a specific brand.
    Returns all brand cars with comparison winners.
    """
    cars = Car.query.filter(Car.brand.ilike(brand)).all()
    
    if not cars or len(cars) < 2:
        return {'error': f'Found {len(cars)} cars for brand "{brand}", need at least 2', 'cars': [], 'comparison_winners': {}}
    
    car_ids = [car.id for car in cars]
    result = compare_cars(car_ids)
    result['brand'] = brand
    return result


def compare_by_year(year):
    """
    Compare all cars from a specific production year.
    Returns all cars from that year with comparison winners.
    """
    cars = Car.query.filter(Car.year == int(year)).all()
    
    if not cars or len(cars) < 2:
        return {'error': f'Found {len(cars)} cars for year {year}, need at least 2', 'cars': [], 'comparison_winners': {}}
    
    car_ids = [car.id for car in cars]
    result = compare_cars(car_ids)
    result['year'] = year
    return result


def get_top_cars(metric='horsepower', limit=10):
    """
    Get top N cars ranked by a specific metric.
    
    Supported metrics:
    - horsepower: Most powerful cars
    - acceleration_0_100: Fastest 0-100 (lowest time = fastest)
    - vitesse_max: Highest top speed
    - combined_mpg: Most fuel efficient
    - torque_nm: Highest torque
    - year: Newest cars
    
    Returns ranked list with positions.
    """
    limit = min(int(limit), 100)  # Cap at 100
    
    metric_columns = {
        'horsepower': (Car.horsepower, False),  # False = descending (higher = better)
        'acceleration_0_100': (Car.acceleration_0_100, True),  # True = ascending (lower = better)
        'vitesse_max': (Car.vitesse_max, False),
        'combined_mpg': (Car.combined_mpg, False),
        'torque_nm': (Car.torque_nm, False),
        'year': (Car.year, False)
    }
    
    if metric not in metric_columns:
        return {
            'error': f'Invalid metric "{metric}". Supported metrics are: {", ".join(metric_columns.keys())}',
            'suggestion': 'Visit /api/v1/available/metrics for detailed descriptions and usage examples',
            'cars': [],
            'valid_metrics': list(metric_columns.keys())
        }
    
    column, ascending = metric_columns[metric]
    
    query = Car.query.filter(column.isnot(None))
    
    if ascending:
        query = query.order_by(column.asc())
    else:
        query = query.order_by(column.desc())
    
    cars = query.limit(limit).all()
    
    if not cars:
        return {'error': f'No cars found with metric {metric}', 'cars': [], 'metric': metric}
    
    # Build ranked list
    cars_list = []
    for position, car in enumerate(cars, 1):
        spec = safe_load_raw_spec(car.raw_spec)
        reordered = reorder_car_spec(spec)
        cars_list.append({
            'rank': position,
            'id': car.id,
            'spec': reordered,
            'metric_value': getattr(car, metric)
        })
    
    return {
        'metric': metric,
        'metric_display': metric.replace('_', ' ').title(),
        'limit': limit,
        'total_results': len(cars_list),
        'cars': cars_list
    }


def get_similar_cars(car_id, limit=10):
    """
    Find cars similar to the given car_id based on:
    - Body type (drive_type)
    - Horsepower range (±20%)
    - Price range (if available)
    
    Returns similar cars ranked by similarity score.
    """
    target_car = Car.query.get(car_id)
    if not target_car:
        return {'error': f'Car with ID {car_id} not found', 'cars': []}
    
    target_hp = _normalize_metric_value(target_car.horsepower)
    target_year = target_car.year if (isinstance(target_car.year, int) and target_car.year > 0) else None

    # Find similar cars (only use constraints that the reference car actually has)
    filters = [Car.id != car_id]
    if target_car.drive_type:
        filters.append(Car.drive_type == target_car.drive_type)
    if target_hp is not None:
        hp_range = max(20, float(target_hp) * 0.2)  # ±20% or minimum ±20
        filters.append(Car.horsepower.isnot(None))
        filters.append(Car.horsepower > 0)
        filters.append(Car.horsepower.between(float(target_hp) - hp_range, float(target_hp) + hp_range))
    if target_year is not None:
        filters.append(Car.year.isnot(None))
        filters.append(Car.year.between(target_year - 10, target_year + 10))

    similar = Car.query.filter(*filters).limit(int(limit)).all()
    
    if not similar:
        # Fallback: get cars with same drive type
        fallback_filters = [Car.id != car_id]
        if target_car.drive_type:
            fallback_filters.append(Car.drive_type == target_car.drive_type)
        similar = Car.query.filter(*fallback_filters).limit(int(limit)).all()
    
    # Build target spec
    target_spec = safe_load_raw_spec(target_car.raw_spec)
    target_spec = reorder_car_spec(target_spec)
    
    # Build similar cars list
    similar_list = []
    for car in similar:
        spec = safe_load_raw_spec(car.raw_spec)
        reordered = reorder_car_spec(spec)
        
        # Calculate similarity score based only on fields present on BOTH cars.
        score_sum = 0.0
        weight_sum = 0.0

        car_hp = _normalize_metric_value(car.horsepower)
        if car_hp is not None and target_hp is not None:
            hp_diff = abs(float(car_hp) - float(target_hp))
            hp_sim = 1.0 - (hp_diff / max(float(car_hp), float(target_hp)))
            hp_sim = max(0.0, min(1.0, hp_sim))
            score_sum += hp_sim * 50.0
            weight_sum += 50.0

        car_year = car.year if (isinstance(car.year, int) and car.year > 0) else None
        if car_year is not None and target_year is not None:
            year_diff = abs(int(car_year) - int(target_year))
            year_sim = 1.0 - (year_diff / 15.0)
            year_sim = max(0.0, min(1.0, year_sim))
            score_sum += year_sim * 30.0
            weight_sum += 30.0

        if car.drive_type and target_car.drive_type:
            score_sum += (20.0 if car.drive_type == target_car.drive_type else 0.0)
            weight_sum += 20.0

        if car.fuel_type and target_car.fuel_type:
            score_sum += (10.0 if str(car.fuel_type).lower() == str(target_car.fuel_type).lower() else 0.0)
            weight_sum += 10.0

        similarity_score = round((score_sum / weight_sum) * 100.0, 1) if weight_sum > 0 else None

        similar_list.append({
            'id': car.id,
            'spec': reordered,
            'similarity_score': similarity_score
        })
    
    # Sort by similarity score; cars without enough data go last.
    similar_list = sorted(
        similar_list,
        key=lambda x: (x.get('similarity_score') is not None, x.get('similarity_score') or -1),
        reverse=True,
    )
    
    return {
        'reference_car_id': car_id,
        'reference_car_spec': target_spec,
        'similar_cars': similar_list,
        'total_results': len(similar_list)
    }


def get_available_metrics():
    """
    Get list of available metrics for ranking and comparison.
    Helps users understand what values they can use.
    """
    return {
        'metrics': [
            {
                'name': 'horsepower',
                'display': 'Horsepower',
                'description': 'Engine power in HP (higher is faster)',
                'direction': 'higher is better',
                'usage': 'GET /api/v1/cars/top/horsepower?limit=10'
            },
            {
                'name': 'acceleration_0_100',
                'display': 'Acceleration 0-100 km/h',
                'description': 'Time to accelerate from 0 to 100 km/h in seconds',
                'direction': 'lower is better (faster)',
                'usage': 'GET /api/v1/cars/top/acceleration_0_100?limit=10'
            },
            {
                'name': 'vitesse_max',
                'display': 'Top Speed',
                'description': 'Maximum speed in km/h',
                'direction': 'higher is better',
                'usage': 'GET /api/v1/cars/top/vitesse_max?limit=10'
            },
            {
                'name': 'combined_mpg',
                'display': 'Fuel Efficiency',
                'description': 'Combined MPG (miles per gallon)',
                'direction': 'higher is better (more efficient)',
                'usage': 'GET /api/v1/cars/top/combined_mpg?limit=10'
            },
            {
                'name': 'torque_nm',
                'display': 'Torque',
                'description': 'Engine torque in Newton-meters',
                'direction': 'higher is better',
                'usage': 'GET /api/v1/cars/top/torque_nm?limit=10'
            },
            {
                'name': 'year',
                'display': 'Production Year',
                'description': 'Most recent production year',
                'direction': 'higher is better (newer)',
                'usage': 'GET /api/v1/cars/top/year?limit=10'
            }
        ],
        'example': 'GET /api/v1/cars/top/horsepower?limit=5'
    }


def get_available_series(limit=50):
    """
    Get list of available model series for filtering/comparing.
    Helps users know what series they can search for.
    """
    results = db.session.query(Car.model, db.func.count(Car.id)).group_by(Car.model).order_by(db.func.count(Car.id).desc()).limit(limit).all()
    series_list = [{'series': model, 'count': count} for model, count in results if model]
    
    return {
        'available_series': series_list,
        'total_unique_series': len(series_list),
        'example_usage': [
            'GET /api/v1/cars/compare/by-serie/Golf',
            'GET /api/v1/cars/compare/by-serie/A4',
            'GET /api/v1/cars/compare/by-serie/3%20Series'
        ]
    }


def get_available_brands(limit=50):
    """
    Get list of available brands for filtering/comparing.
    Helps users know what brands are available.
    """
    results = db.session.query(Car.brand, db.func.count(Car.id)).group_by(Car.brand).order_by(db.func.count(Car.id).desc()).limit(limit).all()
    brands_list = [{'brand': brand, 'count': count} for brand, count in results if brand]
    
    return {
        'available_brands': brands_list,
        'total_brands': len(brands_list),
        'example_usage': [
            'GET /api/v1/cars/compare/by-brand/Audi',
            'GET /api/v1/cars/compare/by-brand/BMW',
            'GET /api/v1/cars/compare/by-brand/Ferrari'
        ]
    }


def get_available_years():
    """
    Get list of available production years for filtering/comparing.
    Helps users know what years are available.
    """
    results = db.session.query(Car.year, db.func.count(Car.id)).filter(Car.year.isnot(None)).group_by(Car.year).order_by(Car.year.desc()).all()
    years_list = [{'year': year, 'count': count} for year, count in results]
    
    return {
        'available_years': years_list,
        'example_usage': [
            'GET /api/v1/cars/compare/by-year/2023',
            'GET /api/v1/cars/compare/by-year/2022'
        ]
    }


def create_car(data):
    raw_spec = data.get('raw_spec')
    # Attendee endpoints currently display `raw_spec` (source dataset JSON). If an
    # admin creates a car without providing raw_spec, it becomes hard to find in
    # list/search UIs that render only raw_spec. Provide a minimal spec so new
    # cars are still discoverable.
    if isinstance(raw_spec, dict):
        raw_spec = json.dumps(raw_spec, ensure_ascii=False)
    if raw_spec is None:
        raw_spec = json.dumps(
            {
                'Company': data.get('brand', ''),
                'Model': data.get('model', ''),
                'Production Years': str(data.get('year', '')),
            },
            ensure_ascii=False,
        )

    car = Car(
        brand=data['brand'],
        model=data['model'],
        year=data['year'],
        price=data.get('price', 0.0),
        engine_type=data.get('engine_type'),
        horsepower=data.get('horsepower'),
        fuel_type=data.get('fuel_type'),
        transmission=data.get('transmission'),
        color=data.get('color'),
        mileage=data.get('mileage'),

        # Processed dataset fields
        cylinders=data.get('cylinders'),
        acceleration_0_100=data.get('acceleration_0_100'),
        vitesse_max=data.get('vitesse_max'),
        drive_type=data.get('drive_type'),
        city_mpg=data.get('city_mpg'),
        highway_mpg=data.get('highway_mpg'),
        combined_mpg=data.get('combined_mpg'),
        torque_nm=data.get('torque_nm'),
        length=data.get('length'),
        width=data.get('width'),
        height=data.get('height'),
        raw_spec=raw_spec
    )
    db.session.add(car)
    db.session.commit()
    return car


def get_cars(filters=None, sort_by='id', order='asc', page=1, per_page=20):
    query = Car.query

    if filters:
        if q := filters.get('q'):
            query = query.filter(
                or_(
                    Car.brand.ilike(f"%{q}%"),
                    Car.model.ilike(f"%{q}%"),
                    Car.fuel_type.ilike(f"%{q}%"),
                    Car.transmission.ilike(f"%{q}%"),
                    Car.drive_type.ilike(f"%{q}%"),
                    Car.raw_spec.ilike(f"%{q}%"),
                )
            )
        if brand := filters.get('brand'):
            query = query.filter(Car.brand.ilike(f"%{brand}%"))
        if model := filters.get('model'):
            query = query.filter(Car.model.ilike(f"%{model}%"))
        if min_year := filters.get('min_year'):
            query = query.filter(Car.year >= int(min_year))
        if max_year := filters.get('max_year'):
            query = query.filter(Car.year <= int(max_year))
        if min_price := filters.get('min_price'):
            query = query.filter(Car.price >= float(min_price))
        if max_price := filters.get('max_price'):
            query = query.filter(Car.price <= float(max_price))
        if fuel_type := filters.get('fuel_type'):
            query = query.filter(Car.fuel_type.ilike(f"%{fuel_type}%"))

        if transmission := filters.get('transmission'):
            query = query.filter(Car.transmission.ilike(f"%{transmission}%"))
        if drive_type := filters.get('drive_type'):
            query = query.filter(Car.drive_type.ilike(f"%{drive_type}%"))
        if cylinders := filters.get('cylinders'):
            query = query.filter(Car.cylinders == int(cylinders))

        if min_horsepower := filters.get('min_horsepower'):
            # Exclude unknown/placeholder horsepower values (NULL/0)
            query = query.filter(Car.horsepower.isnot(None))
            query = query.filter(Car.horsepower > 0)
            query = query.filter(Car.horsepower >= int(min_horsepower))
        if max_horsepower := filters.get('max_horsepower'):
            query = query.filter(Car.horsepower.isnot(None))
            query = query.filter(Car.horsepower > 0)
            query = query.filter(Car.horsepower <= int(max_horsepower))

        if min_combined_mpg := filters.get('min_combined_mpg'):
            # Exclude unknown/placeholder MPG values (NULL/0)
            query = query.filter(Car.combined_mpg.isnot(None))
            query = query.filter(Car.combined_mpg > 0)
            query = query.filter(Car.combined_mpg >= float(min_combined_mpg))
        if max_combined_mpg := filters.get('max_combined_mpg'):
            query = query.filter(Car.combined_mpg.isnot(None))
            query = query.filter(Car.combined_mpg > 0)
            query = query.filter(Car.combined_mpg <= float(max_combined_mpg))

        if max_acceleration_0_100 := filters.get('max_acceleration_0_100'):
            # Treat missing/placeholder values as unknown, not "0 seconds".
            # Some datasets store unknown acceleration as 0; exclude those rows.
            query = query.filter(Car.acceleration_0_100.isnot(None))
            query = query.filter(Car.acceleration_0_100 > 0)
            query = query.filter(Car.acceleration_0_100 <= float(max_acceleration_0_100))

        if min_vitesse_max := filters.get('min_vitesse_max'):
            # Exclude unknown/placeholder top speed values (NULL/0)
            query = query.filter(Car.vitesse_max.isnot(None))
            query = query.filter(Car.vitesse_max > 0)
            query = query.filter(Car.vitesse_max >= int(min_vitesse_max))
        if max_vitesse_max := filters.get('max_vitesse_max'):
            query = query.filter(Car.vitesse_max.isnot(None))
            query = query.filter(Car.vitesse_max > 0)
            query = query.filter(Car.vitesse_max <= int(max_vitesse_max))

        if min_torque_nm := filters.get('min_torque_nm'):
            # Exclude unknown/placeholder torque values (NULL/0)
            query = query.filter(Car.torque_nm.isnot(None))
            query = query.filter(Car.torque_nm > 0)
            query = query.filter(Car.torque_nm >= int(min_torque_nm))
        if max_torque_nm := filters.get('max_torque_nm'):
            query = query.filter(Car.torque_nm.isnot(None))
            query = query.filter(Car.torque_nm > 0)
            query = query.filter(Car.torque_nm <= int(max_torque_nm))

    if hasattr(Car, sort_by):
        column = getattr(Car, sort_by)
        query = query.order_by(column.desc() if order == 'desc' else column.asc())

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return paginated


def get_car(car_id):
    return Car.query.get(car_id)


def update_car(car, data):
    # Swagger users often send raw_spec as a JSON object; store it as a JSON string.
    if 'raw_spec' in data and isinstance(data.get('raw_spec'), dict):
        data = dict(data)
        data['raw_spec'] = json.dumps(data['raw_spec'], ensure_ascii=False)

    for field in ['brand','model','year','price','engine_type','horsepower','fuel_type','transmission','color','mileage',
                  'cylinders','acceleration_0_100','vitesse_max','drive_type','city_mpg','highway_mpg','combined_mpg','torque_nm','length','width','height','raw_spec']:
        if field in data:
            setattr(car, field, data[field])

    # If raw_spec is still missing, generate a minimal one so attendee endpoints
    # (which currently render raw_spec) can display/discover this car.
    if not car.raw_spec:
        car.raw_spec = json.dumps(
            {
                'Company': car.brand or '',
                'Model': car.model or '',
                'Production Years': str(car.year or ''),
            },
            ensure_ascii=False,
        )

    db.session.commit()
    return car


def delete_car(car):
    db.session.delete(car)
    db.session.commit()


def search_cars(q):
    return Car.query.filter(
        or_(
            Car.brand.ilike(f"%{q}%"),
            Car.model.ilike(f"%{q}%"),
            Car.fuel_type.ilike(f"%{q}%"),
            Car.transmission.ilike(f"%{q}%"),
            Car.drive_type.ilike(f"%{q}%"),
            Car.length.ilike(f"%{q}%")
        )
    ).all()


def get_stats():
    total_cars = Car.query.count()

    # Brands: get comprehensive stats per brand
    raw_brand_stats = db.session.query(
        Car.brand,
        db.func.count(Car.id),
        db.func.avg(Car.combined_mpg),
        db.func.avg(Car.horsepower),
        db.func.avg(Car.acceleration_0_100),
        db.func.avg(Car.vitesse_max),
        db.func.min(Car.year),
        db.func.max(Car.year),
        db.func.count(db.func.distinct(Car.model))
    ).group_by(Car.brand).all()

    brand_map = {}
    for name, count, avg_mpg, avg_hp, avg_accel, avg_top_speed, min_year, max_year, model_count in raw_brand_stats:
        key = (name or '').strip()
        if not key:
            key = 'Unknown'
        key = key.upper()
        
        if key in brand_map:
            # Combine counts and recalculate averages if duplicate brands exist
            old_data = brand_map[key]
            old_count = old_data['count']
            new_count = old_count + count
            
            # Weighted average calculation for numeric fields
            def calc_weighted_avg(old_val, new_val, old_count, new_count):
                if old_val is not None and new_val is not None:
                    return ((old_val * old_count) + (new_val * count)) / new_count
                elif old_val is not None:
                    return old_val
                elif new_val is not None:
                    return new_val
                return None
            
            new_avg_mpg = calc_weighted_avg(old_data['average_combined_mpg'], avg_mpg, old_count, new_count)
            new_avg_hp = calc_weighted_avg(old_data['average_horsepower'], avg_hp, old_count, new_count)
            new_avg_accel = calc_weighted_avg(old_data['average_acceleration_0_100'], avg_accel, old_count, new_count)
            new_avg_top_speed = calc_weighted_avg(old_data['average_top_speed'], avg_top_speed, old_count, new_count)
            
            # Year range: extend the range
            old_min_year = int(old_data['year_range'].split('-')[0]) if old_data['year_range'] else None
            old_max_year = int(old_data['year_range'].split('-')[1]) if old_data['year_range'] else None
            final_min_year = min(filter(None, [old_min_year, min_year]))
            final_max_year = max(filter(None, [old_max_year, max_year]))
            
            brand_map[key] = {
                'brand': key,
                'count': new_count,
                'average_combined_mpg': round(new_avg_mpg, 2) if new_avg_mpg is not None else None,
                'average_horsepower': round(new_avg_hp, 1) if new_avg_hp is not None else None,
                'average_acceleration_0_100': round(new_avg_accel, 2) if new_avg_accel is not None else None,
                'average_top_speed': round(new_avg_top_speed, 1) if new_avg_top_speed is not None else None,
                'year_range': f"{final_min_year}-{final_max_year}" if final_min_year and final_max_year else None,
                'model_count': old_data['model_count'] + model_count
            }
        else:
            brand_map[key] = {
                'brand': key,
                'count': count,
                'average_combined_mpg': round(avg_mpg, 2) if avg_mpg is not None else None,
                'average_horsepower': round(avg_hp, 1) if avg_hp is not None else None,
                'average_acceleration_0_100': round(avg_accel, 2) if avg_accel is not None else None,
                'average_top_speed': round(avg_top_speed, 1) if avg_top_speed is not None else None,
                'year_range': f"{min_year}-{max_year}" if min_year and max_year else None,
                'model_count': model_count
            }

    # Sort brands by count descending
    brands_list = sorted(brand_map.values(), key=lambda x: x['count'], reverse=True)

    # Drive types: replace missing/NULL with 'Unknown'
    drive_counts = db.session.query(Car.drive_type, db.func.count(Car.id)).group_by(Car.drive_type).all()
    drive_types_list = [{'drive_type': (d[0] if d[0] is not None else 'Unknown'), 'count': d[1]} for d in drive_counts]

    return {
        'total_cars': total_cars,
        'brands': brands_list,
        'drive_types': drive_types_list
    }


def get_cars_by_brand(brand, page=1, per_page=20):
    """Get all cars for a specific brand (exact match)"""
    query = Car.query.filter(Car.brand.ilike(brand))
    return query.paginate(page=page, per_page=per_page)


def get_cars_by_serie(serie, page=1, per_page=20):
    """Get all cars for a specific serie/model series (partial match supported)"""
    query = Car.query.filter(Car.model.ilike(f"%{serie}%"))
    return query.paginate(page=page, per_page=per_page)


def get_cars_by_year(year, page=1, per_page=20):
    """Get all cars for a specific year"""
    query = Car.query.filter(Car.year == int(year))
    return query.paginate(page=page, per_page=per_page)


def get_brands():
    """Get list of all brands with counts"""
    results = db.session.query(Car.brand, db.func.count(Car.id)).group_by(Car.brand).order_by(Car.brand).all()
    return [{'brand': brand, 'count': count} for brand, count in results if brand]


def get_models_by_brand(brand):
    """Get list of all series/model names for a specific brand"""
    results = db.session.query(Car.model, db.func.count(Car.id)).filter(Car.brand.ilike(brand)).group_by(Car.model).order_by(Car.model).all()
    return [{'serie': model, 'count': count} for model, count in results if model]


def get_years():
    """Get list of all years with counts"""
    results = db.session.query(Car.year, db.func.count(Car.id)).group_by(Car.year).order_by(Car.year.desc()).all()
    return [{'year': year, 'count': count} for year, count in results if year]
