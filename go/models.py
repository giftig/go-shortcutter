import datetime

from go import const


class Shortcut(object):
    _PUBLIC_FIELDS = {
        'id', 'url', 'created_on', 'modified_on', 'comments', 'weighting',
        'icon', 'tags', 'label'
    }
    _EDITABLE_FIELDS = {
        'url', 'comments', 'weighting', 'icon', 'tags', 'label'
    }

    def __init__(
        self,
        id,
        url,
        created_on=None,
        modified_on=None,
        comments=None,
        weighting=const.WEIGHTING_DEFAULT,
        icon=None,
        tags=None,
        label=None
    ):
        self.id = id
        self.url = url
        self.created_on = created_on or datetime.datetime.now()
        self.modified_on = modified_on or datetime.datetime.now()
        self.comments = comments
        self.weighting = weighting
        self.icon = icon
        self.tags = tags or []
        self.label = label

    @property
    def raw(self):
        return {k: getattr(self, k) for k in self._PUBLIC_FIELDS}

    def update(self, shortcut):
        """Update allowable (non-auto) fields on this shortcut"""
        if shortcut.id != self.id:
            raise ValueError('Incorrect shortcut ID')

        has_update = False

        for f in self._EDITABLE_FIELDS:
            prev = getattr(self, f)
            updated = getattr(shortcut, f)
            if prev != updated:
                setattr(self, f, updated)
                has_update = True

        if has_update:
            self.modified_on = datetime.datetime.now()
