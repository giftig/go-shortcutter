# "Go" Shortcutter

This is a simple application to help you manage bookmarks and visit them via the address bar.
I use it to neatly organise and categorise my bookmarks and quickly visit bookmarked links by
typing `go/<foo>` in the browser.

## Quickstart

A docker-compose is provided for quickstart; simply `docker-compose up -d` to run it. You can
set the `GO_REDIRECT_DIR` environment variable to choose where to put the shortcut database.

By default the frontend will be accessible on http://localhost:80. I suggest adding an entry
to `/etc/hosts` to point `go`, or your choice of keyword, at localhost. This lets you quickly
visit your bookmarked links by typing `go/<foo>` in the browser.

You can quickly add a hosts entry with:

```bash
echo '127.0.0.1 go' >> /etc/hosts
```

You may need to use `sudo` to do this.

## Usage

Once set up, you can simply type `go/` in the browser to see the shortcut summary view, which
sorts shortcuts by last modified and has controls to search, filter, and add/remove shortcuts.
Keywords are provided courtesy of [tagify][tagify].

Once you have shortcuts, simply type `go/<shortcut>` and you'll be redirected to your bookmark.


## Structure

Currently the application has a Flask backend offering a simple API for storing shortcuts, and
a basic javascript frontend (served via nginx). Shortcuts are stored in a local JSON file which
is mounted by the docker-compose.

[tagify]: https://github.com/yairEO/tagify
