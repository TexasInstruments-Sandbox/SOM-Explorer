# TI SOM Explorer

Interactive web app for exploring the SOM workbook by device, region, partner, form factor, DDR type, lifecycle status, partner program, and onboard wireless.

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

## Mobile Explorer

Phones open the module directory by default, with search, a view picker, and a Filters button above the results. The filter sheet uses two columns grouped into Partner details, Technical specs, and Display options; Partner and Form factor span both columns to keep longer values readable. Below 360 pixels, Partner details and Display options use one column so longer selections fit beside the inset dropdown arrows. Module details open in a full-screen panel. Visit TI.com and Close share a bottom action row across phone, expanded, and desktop layouts. Both phone panels contain keyboard focus and restore it when closed, with Close staying within reach while their content scrolls. Shared URLs retain the selected view and filters.

The phone layout applies below 768 CSS pixels, and to short landscape screens up to 980 pixels wide. Expanded screens from 768 to 980 pixels use a compact side-by-side filter rail and workspace. Resizing between these layouts preserves the current search, filters, view, and selected module. Safe-area padding and dynamic viewport heights support iPhone layouts. Foldable support adapts to available width; physical hinge positioning is not inferred from the device name.

The header and policy footer stay in the viewport while results scroll within the workspace. Filters and module details have their own scroll areas, preserving the results position when opened or closed.

On phones, tapping anywhere on a module directory card opens its details. Details slide in from the side, and the filter sheet slides up with a fading backdrop; both animate on close. Reduced-motion preferences disable these transitions.

## Data

The app reads `data/soms.json`. The initial catalog was generated from:

```text
TI-SOM-List-Dec11-Rev01.xlsx (not committed)
```

The catalog was refreshed against TI.com and primary manufacturer sources through September 1, 2026, with targeted October 13 updates for CarbonAM67, VAR-SOM-AM62P, and the separate Octavo OSD62x and OSD62x-PM families. Each matched module includes a TI tool ID and its last-verification date. DDR, onboard flash, and wireless values include a specification source and verification date. Normalized form-factor families are included alongside the source form-factor value.

The DDR type filter uses `ddrTypes`, generated from each module's published `ddr` specification by the shared `ddr-types.js` helper. DDR3L is distinct from DDR3, and LPDDR4 is distinct from DDR4. A module offering multiple memory types matches each applicable type while counting once in the results. Generic RAM/SDRAM or an unconfirmed generation appears under `Unknown`. The local editor regenerates these types when DDR specifications change, and shared URLs preserve the selected `ddrType`.

Module cards and details summarize RAM and flash with a single capacity and memory type. Fixed capacities remain a single value, such as `512 MB DDR3L`; ranges and configuration options show the published maximum, such as `Up to 4 GB DDR4` or `Up to 128 GB eMMC`. RAM bank capacities are combined, and ECC qualifiers remain visible. Flash summaries use the largest storage device without adding smaller NOR or EEPROM devices. Sources that publish only a lower bound use `8 GB+ eMMC`, and unspecified capacities stay unspecified. The full published specifications remain in the catalog, search, and data editor.

The phyCORE-AM57x memory entry shows `Up to 4 GB DDR3 (optional ECC)`. Its default RAM is 2 GB; the separately listed ECC storage holds error-correction check bits on one bank and is not an additional application-RAM capacity. See [PHYTEC's specifications](https://www.phytec.com/product/phycore-am57x/) and [hardware manual, section 6.1](https://www.phytec.de/fileadmin/legacy/downloads/Manuals/L-815e_4.pdf#page=37).

Wireless values describe radios mounted on the SOM itself:

- `Yes`: included on the published module configuration.
- `Optional`: available on some orderable module configurations.
- `No`: no onboard radio is published; carrier-board or add-on expansion does not count.
- `Unknown`: the primary source does not provide enough information.

`Not published` is used for DDR or flash capacities that a primary source confirms exist but does not quantify. It is not an estimated value.

Partner program levels use TI.com's Premium, Preferred, and Registered badges. When a partner has a TI.com profile but the page does not expose a clear level, the catalog treats the partner as Registered. Partners without a TI.com profile remain Unknown.

Partner level colors follow [TI's partner badge convention](https://www.ti.com/design-development/partners.html): Registered dark gray (`#383838`), Preferred dark teal (`#1e5465`), and Premium red (`#c42912`). These solid tones come from the official badge SVGs and are used for level swatches, program badges, card borders, and editor accents.

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

## Typography

The Explorer uses a single light appearance. The Explorer and local editor use TI.com's Roboto font stack and locally hosted Light, Regular, and Medium WOFF2 files. Medium is mapped to CSS weight 600, matching TI.com's font definitions. Font sources and the Apache 2.0 license are in `assets/fonts/`; shared font definitions live in `fonts.css`. Mobile and expanded directory status values use normal text weight alongside the other specifications.

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
