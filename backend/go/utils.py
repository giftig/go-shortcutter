import subprocess


def open_url(url):
    """Try to open a url in a browser"""
    # TODO: Cross-platform support
    subprocess.Popen(['xdg-open', url])
