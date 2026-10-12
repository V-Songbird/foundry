**Three locale files will show raw keys: `pt-BR/billing.json` is missing, `ja/checkout.json` is empty, and `de/onboarding.json` holds no strings.**

`i18n.config.json` expects 12 locales with 14 namespaces each, so 168 files. `locales/` has 167.

| File | State | Size |
| --- | --- | --- |
| `locales/pt-BR/billing.json` | Missing | — |
| [locales/ja/checkout.json](locales/ja/checkout.json) | Empty file | 0 bytes |
| [locales/de/onboarding.json](locales/de/onboarding.json) | Only `{}` | A few bytes, whatever the line endings |

Every other file is between about 290 and 790 bytes and holds 8 to 16 strings. Nothing else in the listing is out of line.

I listed the folder and read the two short files. I did not open the strings in the other 165.

Next: copy the English `billing`, `checkout` and `onboarding` files into those three places as a stopgap, then send them for translation.
