import datetime

from go import models

_SHORTCUT_DATE_FIELDS = {'created_on', 'modified_on'}


def write_shortcut(shortcut):
    raw = shortcut.raw

    for f in _SHORTCUT_DATE_FIELDS:
        raw[f] = raw[f].isoformat()

    return raw


def read_shortcut(data):
    for f in _SHORTCUT_DATE_FIELDS:
        if f not in data:
            continue

        data[f] = datetime.datetime.fromisoformat(data[f])

    return models.Shortcut(**data)
