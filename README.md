# Doc & Drawing Studio

A document editor with a built-in **location-map drawing studio** (roads, railway, canals, plot boundaries, 120+ symbols, grouping, rotation, snapping). Static website: no build step, no server, works offline after the first visit.

## Publish on GitHub Pages
1. Create a repository and upload everything in this folder (keep the folder structure).
2. **Settings -> Pages -> Build and deployment -> Source: GitHub Actions** (the included workflow `.github/workflows/pages.yml` publishes on every push to `main`).
   *Alternative:* Source = "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Open `https://<user>.github.io/<repo>/`.

Test locally: `python3 -m http.server 8080` then open http://localhost:8080 (the offline worker and file access need http, not a double-clicked file).

## Folder layout
| Path | What it holds |
|---|---|
| `index.html` | Page structure (toolbars, dialogs) |
| `css/style.css` | All styling |
| `js/icons.js` | Line-icon set used by the interface |
| `js/symbols.js`, `js/symbols-pictos.js` | Map symbols (colour symbols + pictograms) - **add your own here** |
| `js/core.js` | Drawing engine: line/road kinds, geometry, renderer |
| `js/studio.js` | Drawing studio: tools, selection, group, rotate, snap, symbol panel, files |
| `js/editor.js` | Document editor (formatting, figures, find and replace) |
| `js/store.js` | Storage (IndexedDB, falls back to localStorage) |
| `js/files.js` | Save / open files, version history, restore, exports |
| `js/main.js` | Start-up |
| `vendor/qrcode.js` | QR generator (MIT) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline use and "install app" |
| `tests/` | `npm i && npm test` (the online search is tested with a stand-in, no internet needed) |

## Saving, opening and restoring
* **Auto-save**: every change is saved in this browser.
* **Save to file / Open file**: a portable `.docstudio.json` (drawings stay editable). Open also accepts `.html` and `.txt`.
* **Version history**: automatic restore points plus "Save version"; restoring keeps a safety copy of the current text first.
* **Drawing draft**: an unfinished drawing is kept; after a crash or closed tab the app offers to reopen it.
* **Drawing files**: save/open a single drawing (`.drawing.json`), export PNG or SVG. Word (`.doc`), HTML, text and print/PDF export for documents.

## Online symbols
In the drawing studio open **Symbols -> Online** and type a word (English, or a Malayalam word that matches a built-in symbol name). Results come live from [Iconify](https://iconify.design), which serves thousands of open-source icon sets. Pick one and tap the page to place it; single-colour icons take the stroke colour you choose. The icon is stored inside the drawing, so it keeps working offline and in saved files. Needs internet only for searching. Each icon set has its own licence (shown when you pick an icon): check it before publishing a map.

## Adding symbols
Rows in `js/symbols.js` / `js/symbols-pictos.js` use a 100x100 SVG; write `{c}` where the user's chosen colour should apply. Give each symbol an English name; Malayalam or other words can go in the search aliases.

## Release
Bump `VERSION` in `sw.js` and the `?v=` numbers in `index.html` so visitors get the new files.
