#!/usr/bin/env python

import argparse
import json
import sys

from go.db.file import FileBackend
from go import models
from go import serialisation
from go import utils


class ShortcutHandler(object):
    def __init__(self, backend):
        self.backend = backend

    @staticmethod
    def _pprint(shortcut):
        raw = shortcut.raw
        del raw['id']
        del raw['url']

        CYAN = '\033[36m'
        GREY = '\033[90m'
        RESET = '\033[0m'
        print(
            '{}{} = {}{}'.format(
                CYAN, shortcut.id, shortcut.url, RESET
            )
        )

        for k, v in sorted(raw.items()):
            print('{}{:20}{:60}{}'.format(GREY, str(k), str(v), RESET))

    def _get_shortcut(self, id):
        if not id:
            raise ValueError('No shortcut ID specified')

        shortcut = self.backend.get_shortcut(id)

        if not shortcut:
            raise ValueError('No such shortcut {}'.format(id))

        return shortcut

    def write_shortcut(self, id):
        if not id:
            raise ValueError('No shortcut ID specified')

        data = json.load(sys.stdin)
        shortcut = serialisation.read_shortcut(data)

        if not shortcut.id == id:
            raise ValueError('Shortcut ID in payload must match provided ID')

        self.backend.put_shortcut(shortcut)

    def write_simple_shortcut(self, id, url):
        if not id:
            raise ValueError('No shortcut ID specified')

        shortcut = self._get_shortcut(id) or models.Shortcut(id=id, url=url)
        self.backend.put_shortcut(shortcut)

    def list_shortcuts(self):
        shortcuts = self.backend.list_shortcuts()

        for s in shortcuts:
            self._pprint(s)
            print('')

    def print_shortcut(self, id):
        shortcut = self._get_shortcut(id)
        self._pprint(shortcut)

    def print_url(self, id):
        shortcut = self._get_shortcut(id)
        print(shortcut.url)

    def open_url(self, id):
        shortcut = self._get_shortcut(id)
        utils.open_url(shortcut.url)


def _err(s):
    RED = '\033[31m'
    RESET = '\033[0m'
    print('{}ERROR: {}{}'.format(RED, s, RESET))


def main():
    parser = argparse.ArgumentParser('shortcuts')
    parser.add_argument(
        '-d', '--db', '--db-file', default=None, dest='db',
        help='The database file for the go shortcut engine'
    )
    parser.add_argument('action', help='get, set, store, url, open, list')
    parser.add_argument(
        'id', default=None, nargs='?',
        help='The id of the shortcut to operate on'
    )
    parser.add_argument(
        'url', default=None, nargs='?',
        help='The url for the id, if using the simple set action'
    )

    args = parser.parse_args()

    backend = FileBackend(args.db)
    handler = ShortcutHandler(backend)

    try:
        if args.action == 'get':
            handler.print_shortcut(args.id)
        elif args.action == 'set':
            handler.write_simple_shortcut(args.id, args.url)
        elif args.action == 'store':
            handler.write_shortcut(args.id)
        elif args.action == 'url':
            handler.print_url(args.id)
        elif args.action == 'open':
            handler.open_url(args.id)
        elif args.action == 'list':
            handler.list_shortcuts()
        else:
            raise ValueError('Invalid action {}'.format(args.action))
    except Exception as e:
        _err(e)
        sys.exit(1)


if __name__ == '__main__':
    main()
