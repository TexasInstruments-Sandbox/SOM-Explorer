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

The app reads `data/soms.json`, generated from:

```text
/Users/grippy/Downloads/TI-SOM-List-Dec11-Rev01.xlsx
```

Normalized form-factor families are included alongside the original workbook form-factor value.

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

Partner logo placeholders live in:

```text
assets/logos/
```

Replace any partner SVG in that folder with the real logo using the same filename, or update `assets/logos/manifest.json` if a different filename is preferred.

## Partner Pages

Partner page links live in:

```text
data/partners.json
```

The current links are placeholders and can be replaced with the final partner URLs.

## Form Factor Logos

Form-factor placeholder logos live in:

```text
assets/form-factors/
```

Replace those SVGs with final artwork using the same filenames, or update `assets/form-factors/manifest.json`.
