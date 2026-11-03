# Plan

The illustrated version, with screen mock-ups and flow diagrams, is [stamps-bridge-plan.pdf](stamps-bridge-plan.pdf).
Rebuild it with [`tools/build_plan_pdf.py`](tools/build_plan_pdf.py).

## The problem

- Stamps.com pulls orders automatically only from stores it chose to support (Shopify, Amazon, eBay,
  BigCommerce and others). Wix has no direct Stamps.com integration.
- The paid workarounds cost money every month. ShipStation, from the same company as Stamps.com, starts at about
  $30 a month for this and moves label printing into ShipStation. A Shopify store as a go-between costs Shopify
  Basic plus the Stamps.com Shopify app.
- Stamps.com's APIs (REST "SERA" and SOAP) can buy and print labels, but have **no way to add orders to the
  Orders tab** and **no way to list labels printed on the website**. Using them would mean printing from a
  different screen, which changes the shipper's routine.

## The approach

The file is the connector. Stamps.com Online can import orders from a CSV (Orders > Import) and export print
history to a CSV (History > Search Print History > Export). The app writes the first file and reads the second.

### Daily flow

| When | Where | Who | What |
|---|---|---|---|
| Any time | Store's site | Customer | Pays |
| Morning | Wix > Stamps Bridge > To ship | Shipper | Clicks **Download for Stamps.com** |
| Morning | Stamps.com > Orders > Import | Shipper | Imports the file |
| During the day | Warehouse + Stamps.com | Shipper | Picks, packs, weighs, prints labels (unchanged) |
| End of day | Stamps.com > History > Export | Shipper | Exports the day's printed labels |
| End of day | Wix > Stamps Bridge > Upload | Shipper | Drops the file in, checks the list, clicks **Confirm** |
| Automatic | Wix | App | Marks orders fulfilled with tracking; the customer is emailed |

The shipper gets a Wix login limited to this page and the orders list.

### Why repeating a step is safe

- Stamps.com updates an order with the same Order ID instead of copying it, so downloading twice never
  duplicates. It also means an address change is fixed by downloading again before printing.
- Orders already fulfilled are skipped on upload, so uploading twice never ships twice.

## The app

One Wix dashboard page with three tabs.

1. **To ship.** Paid, unfulfilled orders placed after the store's start date. Warns when an item has no weight
   or SKU. Downloads the orders file.
2. **Upload shipments.** Reads the history export, shows each row as *ready*, *already shipped*, *cancelled*,
   *not matched*, *extra label* or *no tracking*, and fulfils only the *ready* rows on Confirm.
3. **Setup** (once per store):
   - Upload `sample.csv`. Only the header row is used, kept word for word and in order. Each column is filled from
     a Wix field, left blank, or given a fixed value, and the fixed list pre-fills what it recognises.
   - Upload one history export and confirm the Order ID, tracking, carrier and service columns.
   - Start date, default carrier, and who emails the customer (Wix or Stamps.com, never both).

### What lives where

| In the code (same for every store) | Saved per store, on its own Wix site |
|---|---|
| The Wix fields a column can use | Its `sample.csv` header row |
| The fixed list of known headers | Its column matches and fixed values |
| CSV reading and writing | Its history export matches |
| Finding orders and marking them shipped | Start date, default carrier, email choice |

### Safety checks

- No orders file until a column carries the Wix order number.
- An upload missing the Order ID or tracking column is refused, with the missing column named.
- Re-uploading a sample lists added and removed headers, and keeps the store's own choices for headers that remain.

### Hosting

The app is built with the Wix CLI, and Wix hosts its backend code, so there is no server to run. Wix apps can be
installed on your own sites straight from the app dashboard, shared with an install link, or listed free on the
Wix App Market after an automated review.

## Edge cases

| Situation | What happens |
|---|---|
| Cancelled before download | Left out of the file |
| Cancelled after import | Shipper deletes it in Stamps.com; upload flags it as cancelled |
| Address changed after import | Edit in Wix, download again before printing |
| Same file uploaded twice | Already-shipped orders skipped |
| Label printed outside the Orders tab | No Order ID, so shown as not matched |
| Two parcels for one order | Version 1 keeps the first tracking number and flags the rest as extra labels |
| International parcel | Customs completed in Stamps.com as today; values and weights come through in the file |
| Stamps.com changes its columns | Upload a new sample in Setup; no code change |
| Header not on the fixed list | Left blank until the store chooses; never guessed |

Not in version 1: returns, stock syncing, splitting one order across parcels.

## Confirmed and still to check

| Fact | Status |
|---|---|
| Wix has no direct Stamps.com integration | Confirmed (Wix Help Centre) |
| Stamps.com Online imports orders from CSV; only Order ID is required | Confirmed (Stamps.com help) |
| Re-importing the same Order ID updates the order | Confirmed (Stamps.com help) |
| CSV headers must match `sample.csv` exactly | Confirmed (Stamps.com help) |
| CSV import is available only on certain Stamps.com plans | Confirmed; check each shipper's plan |
| Print history exports to CSV, columns can be shown or hidden | Confirmed (Stamps.com help) |
| The history export includes the Order ID | **To confirm** with a real export |
| A Wix app can mark an order fulfilled with tracking (`createFulfillment`) | Confirmed (Wix docs) |
| That also sends Wix's shipping email | **To confirm** with a test order |
| Stamps.com can email tracking itself instead | Confirmed (Stamps.com help) |

## Build order

| # | Step | Done when |
|---|---|---|
| 1 | Core logic with tests (this repo) | `npm test` passes. **Done** |
| 2 | Write the Wix CLI app (`app/`) | Type-checks and bundles. **Done**, not yet connected |
| 2b | Connect it to a Wix app ID; install on a free Wix test store | Dashboard page appears |
| 3 | Setup tab: upload sample, match columns, save per store | A real sample loads and every column is matched or chosen |
| 4 | To ship tab and download | The file imports cleanly into Stamps.com |
| 5 | Upload tab and fulfilment | A test order shows Fulfilled with a working tracking link |
| 6 | Decide who emails the customer | Exactly one email arrives |
| 7 | Install on the first live store with a start date | One real order runs end to end |
| 8 | Publish free on the Wix App Market | A second store sets itself up with no code change |

## Considered and rejected

| Option | Why not |
|---|---|
| ShipStation | Monthly fee, and the shipper prints in ShipStation instead of Stamps.com |
| A new Shopify store as a go-between | Shopify Basic plus the Stamps.com app each month. Shopify's $5 Starter plan is closed to new stores |
| Stamps.com API | Can't add orders to the Orders tab or read labels printed on the website |
| AI to read the files | Not wanted. A fixed list gives the same result every time |
