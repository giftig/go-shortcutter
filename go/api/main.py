from flask import Flask

from go.api import shortcuts
from go.db.file import FileBackend


app = Flask(__name__)


@app.errorhandler(ValueError)
def handle_exception(e):
    return str(e), 400


def init(filename=None):
    app.shortcut_backend = FileBackend(filename)

    app.register_blueprint(shortcuts.blueprint)
    return app
