# Installation and development

Use node to install dependencies and build the static files:

```
npm install
npm run build
```

This will install dependencies, copy in static js dependencies like jquery, compile the
sass, etc.

To just compile the sass, or compile the sass with watch enabled, use:

```
npm run sass
npm run watch-sass
```

The build is currently very naive, with js directly served rather than built, and dependencies
copied in straight from node dependencies, so there's no need to rebuild when modifying js.

A future improvement will manage dependencies better and use something like webpack + likely
migrate to typescript.
