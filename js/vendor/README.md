# Vendored third-party code

## libheif.js

`libheif-js@1.18.2`, the `libheif-wasm/libheif-bundle.js` build — the WASM
binary is embedded in the file, so it is self-contained and needs no build
step and no separate `.wasm` fetch.

It is here so HEIC photos work in browsers that have no HEIC decoder of their
own (Chrome and Firefox on every platform; Safari and iOS decode HEIC
natively and never reach this code).

**It is loaded lazily.** `js/photos.js` injects it only when someone drops a
file the browser could not decode itself, and only in edit mode. A visitor
reading the blog never downloads it.

Upstream: https://github.com/catdad-experiments/libheif-js
Licence: LGPL — see `libheif-LICENSE.txt`.
