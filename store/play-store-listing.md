# Google Play — Store Listing Copy

Copy/paste these into **Play Console → Main store listing**. Character limits noted.

---

## Listing text (title, short and full description)

The text lives in **`store/listing/<locale>/`**, one folder per language, one file per field:

| File | Play Console field | Limit |
| --- | --- | --- |
| `title.txt` | App name | 30 |
| `short_description.txt` | Short description | 80 |
| `full_description.txt` | Full description | 4000 |

Locales: en-US (default), es-419, pt-BR, hi-IN, id, tr-TR, ru-RU, vi, ar, fr-FR, de-DE.
Run `npm run listing:check` after any edit; it fails if a field is over Play's limit.

**To add a translation in Play Console:** Grow → Store presence → Main store listing →
Manage translations → Add your own translations → pick the language → paste the three files.

---

## Categorization
- **App category:** Tools  *(alternative: Productivity)*
- **Tags:** battery, alarm, charging, battery health, utilities  *(choose up to 5 in console)*

## Contact details
- **Email:** saadghaffar97@gmail.com   *(required, shown publicly)*
- **Website:** https://saadbinghaffar.github.io/battery-full-alarm/
- **Phone:** *(optional)*

## Privacy Policy URL  (required)
```
https://saadbinghaffar.github.io/battery-full-alarm/privacy.html
```

## Graphics (upload from the /store folder)
| Asset | File | Required size |
| --- | --- | --- |
| App icon | `store/icon-512.png` | 512 × 512 PNG |
| Feature graphic | `store/feature-graphic.png` | 1024 × 500 PNG |
| Phone screenshots (×4) | `store/screenshots/01–04-*.png` | 1080 × 1920 PNG |

*Minimum 2 phone screenshots required; 4 are provided.*

## Default language
- English (United States) — `en-US`
