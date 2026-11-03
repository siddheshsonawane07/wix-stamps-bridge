# Wix Stamps Bridge

A free, open-source Wix app that ships Wix Stores orders through **your own Stamps.com account**,
without ShipStation, Shopify or any paid connector in between.

Stamps.com imports orders automatically only from stores it supports (Shopify, Amazon, eBay and others),
and Wix isn't one of them. Both tools do handle files, though. Stamps.com can **import orders from a CSV
file** and **export printed labels with tracking numbers to a CSV file**. This app does both conversions
inside the Wix dashboard:

```
Wix orders ──► orders.csv ──► Stamps.com  Orders > Import ──► print labels as normal
Wix orders ◄── marked shipped, customer emailed ◄── shipments.csv ◄── Stamps.com  History > Export
```

The shipper's routine in Stamps.com stays the same apart from one import and one export a day.
Everything else is automatic: finding paid orders, writing the file in Stamps.com's exact layout,
matching each tracking number to its order, marking orders shipped and emailing customers.

## Not tied to any one store

- Each store uploads its **own** Stamps.com `sample.csv` once. The app keeps that header row word for word
  and in the same order, as Stamps.com requires.
- Columns are matched to Wix fields from a **fixed list** in [`src/core/headers.ts`](src/core/headers.ts):
  case, spaces and punctuation are ignored, then the lookup is exact. **No AI and no fuzzy matching.**
  A header that isn't on the list stays blank until the store picks a match.
- Each column can be filled from a Wix field, left blank, or given a fixed value.
- The same applies to the history export: the app needs only the Order ID and tracking number columns,
  plus carrier and service if present.

## Cost

| | Cost |
|---|---|
| Wix Premium plan (needed for Wix Stores) | already paid by the store |
| Stamps.com account and postage | already paid by the shipper. **The plan must include CSV order import** |
| This app and its hosting | £0. Wix runs the code |

## Status

**Early.** This repo currently holds the core logic, with tests. It has no Wix dependency, so it can be
tested on its own:

| Module | Does |
|---|---|
| [`csv.ts`](src/core/csv.ts) | Reads and writes CSV (quotes, line breaks, BOM) |
| [`headers.ts`](src/core/headers.ts) | The fixed match lists |
| [`layout.ts`](src/core/layout.ts) | Reads a store's `sample.csv` and history export, checks layouts, compares re-uploads |
| [`fields.ts`](src/core/fields.ts) | The Wix fields a column can use, with formats (weight units, country code or name, date) |
| [`export.ts`](src/core/export.ts) | Builds the orders file for Stamps.com |
| [`history.ts`](src/core/history.ts) | Reads the history export and decides which orders to mark shipped |

Next: the Wix CLI app (a dashboard page with **To ship**, **Upload shipments** and **Setup** tabs) that
connects this logic to Wix eCom orders and fulfilments. See [the plan](docs/PLAN.md) and the
[illustrated plan (PDF)](docs/stamps-bridge-plan.pdf).

### Still to confirm with real files
- The exact headers in Stamps.com's `sample.csv`. The test files in `tests/fixtures.ts` are made up.
- That the print-history export includes the Order ID for labels printed from imported orders.
- Whether Wix sends its own shipping email when an app adds tracking.

## Develop

```bash
npm install
npm test          # vitest
npm run typecheck
```

Node 20 or later.

## Licence

[MIT](LICENSE)
