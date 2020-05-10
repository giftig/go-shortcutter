from setuptools import setup


setup(
    name='go_shortcutter',
    version='0.1',
    packages=['go'],
    entry_points={
        'console_scripts': [
            'gosh=go.cli.shortcuts:main',
        ]
    },
    maintainer='Rob Moore',
    maintainer_email='giftiger.wunsch@xantoria.com',
    url='http://www.xantoria.com/',
    install_requires=['Flask>=1.1.2', 'gunicorn>=20.0.4']
)
