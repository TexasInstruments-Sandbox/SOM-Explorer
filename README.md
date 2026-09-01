# TI SOM Explorer

Interactive web app for exploring the SOM workbook by device, region, partner, form factor, lifecycle status, and partner program.

## GitHub Pages

Published from:

```text
https://github.com/TexasInstruments-Sandbox/SOM-Explorer
```

Pages URL:

```text
https://texasinstruments-sandbox.github.io/SOM-Explorer/
```

## Run

From this directory:

```sh
python3 -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## Data

The app reads `data/soms.json`. The initial catalog was generated from:

```text
TI-SOM-List-Dec11-Rev01.xlsx (not committed)
```

The catalog was refreshed against TI.com and primary manufacturer sources through September 1, 2026. Each matched module includes a TI tool ID and its last-verification date. DDR, onboard flash, and wireless values include a specification source and verification date. Normalized form-factor families are included alongside the source form-factor value.

Wireless values describe radios mounted on the SOM itself:

- `Yes`: included on the published module configuration.
- `Optional`: available on some orderable module configurations.
- `No`: no onboard radio is published; carrier-board or add-on expansion does not count.
- `Unknown`: the primary source does not provide enough information.

`Not published` is used for DDR or flash capacities that a primary source confirms exist but does not quantify. It is not an estimated value.

Partner program levels use TI.com's Premium, Preferred, and Registered badges. When a partner has a TI.com profile but the page does not expose a clear level, the catalog treats the partner as Registered. Partners without a TI.com profile remain Unknown.

The maintained scope is partner-sourced SOM families for TI Arm-based processors, plus explicitly reviewed board-class products. Board-class exceptions include Pico-AM62, G405, BeagleBoard single-board products, and InHand Mo AI modules. Development kits and carrier boards are not separate records. Older TI tool folders remain excluded until their lifecycle and availability are confirmed.

## Data Validation

After editing `data/soms.json`, regenerate the browser data file and summary:

```sh
node scripts/sync-data.mjs
```

Check that the JSON, browser data file, summary, IDs, source rows, TI links, partner-level consistency, company logos, and TI partner badges agree:

```sh
node scripts/sync-data.mjs --check
```

`scripts/refresh-ti-data-2026-07-30.mjs` is retained as a historical record of the July 30 refresh. It predates the expanded catalog and must not be reapplied to current data.

## Local Data Editor

Start the same local server, then open:

```text
http://localhost:5173/editor.html
```

Use the visual editor to add or edit SOM boards. When finished, download both generated files and replace:

```text
data/soms.json
data/soms-data.js
```

Review the Explorer, then commit and push the changed files.

## Logos

Partner logos live in:

```text
assets/logos/
```

Logo provenance and local paths are recorded in `assets/logos/sources.json`; `scripts/sync-data.mjs --check` rejects missing or placeholder partner logos.

## Partner Pages

Partner page links live in:

```text
data/partners.json
```

Partner links are mapped to their TI partner profiles when available.

## Form Factor Logos

Form-factor placeholder logos live in:

```text
assets/form-factors/
```

Replace those SVGs with final artwork using the same filenames, or update `assets/form-factors/manifest.json`.
