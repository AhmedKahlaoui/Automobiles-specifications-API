from models import db, User


def create_user(username, password, is_admin=False):
    if User.query.filter_by(username=username).first():
        raise ValueError('User already exists')

    user = User(username=username, is_admin=is_admin)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def authenticate_user(username, password):
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        return user
    return None
