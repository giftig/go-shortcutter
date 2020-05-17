from flask import Flask
from flask import jsonify

from go.api import shortcuts
from go.db.file import FileBackend


app = Flask(__name__)


@app.errorhandler(ValueError)
def handle_exception(e):
    return jsonify({'error': 'Bad Request', 'message': str(e)}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not Found', 'message': str(e)}), 404


def init(filename=None):
    app.shortcut_backend = FileBackend(filename)

    app.register_blueprint(shortcuts.blueprint, url_prefix='/shortcuts')
    return app
