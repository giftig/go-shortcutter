from flask import abort
from flask import Blueprint
from flask import Response
from flask import current_app
from flask import jsonify
from flask import request

from go import serialisation

blueprint = Blueprint('shortcuts', __name__)


@blueprint.route('/<id>', methods=('GET',))
def get_shortcut(id):
    """Get the details of a shortcut"""
    shortcut = current_app.shortcut_backend.get_shortcut(id)

    if not shortcut:
       abort(404, description='No such shortcut')

    if request.args.get('url') == 'true':
        return current_app.response_class(shortcut.url, mimetype='text/plain')

    data = serialisation.write_shortcut(shortcut)

    return jsonify(data)


@blueprint.route('/<id>', methods=('PUT', 'POST'))
def update_shortcut(id):
    """Update a shortcut"""
    raw = request.get_json()
    data = serialisation.read_shortcut(raw)

    if data.id != id:
        raise ValueError('Provided ID does not match payload')

    current_app.shortcut_backend.put_shortcut(data)
    return current_app.response_class('OK', mimetype='text/plain')


@blueprint.route('/', methods=('GET',))
def list_shortcuts():
    return jsonify([
        serialisation.write_shortcut(s)
        for s in current_app.shortcut_backend.list_shortcuts()
    ])
