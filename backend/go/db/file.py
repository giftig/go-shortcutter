import json
import os
import shutil

from go import serialisation


class FileBackend(object):
    """File-based backend; all data stored in one JSON file. Not scalable."""

    def __init__(self, filename=None):
        self.filename = filename or os.path.join(
            os.environ['HOME'], '.go-shortcut/db.json'
        )
        self._data = None

    def _load_data(self):
        raw = None

        if not os.path.isfile(self.filename):
            base_dir = os.path.dirname(self.filename)
            if not os.path.isdir(base_dir):
                os.makedirs(base_dir)

            self._data = {}
            self._save_data()

        with open(self.filename, 'r') as f:
            raw = json.load(f)

        self._data = {
            r['id']: serialisation.read_shortcut(r) for r in raw['shortcuts']
        }

    def _save_data(self):
        raw = {
            'shortcuts': [
                serialisation.write_shortcut(s) for s in self.data.values()
            ]
        }

        with open(self.filename, 'w') as f:
            json.dump(raw, f)

    @property
    def data(self):
        if self._data is None:
            self._load_data()

        return self._data

    def get_shortcut(self, id):
        return self.data.get(id)

    def list_shortcuts(self):
        return sorted(
            self.data.values(),
            key=lambda k: k.created_on,
            reverse=True
        )

    def put_shortcut(self, shortcut):
        entry = self.data.get(shortcut.id)
        exists = bool(entry)
        if entry:
            entry.update(shortcut)
        else:
            entry = shortcut

        self.data[shortcut.id] = entry
        self._save_data()
        return exists

    def delete_shortcut(self, id):
        if id not in self.data:
            return False

        del self.data[id]
        self._save_data()
        return True
