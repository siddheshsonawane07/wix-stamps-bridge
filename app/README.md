# Stamps Bridge: the Wix app

A Wix CLI app (Astro based) with one dashboard page and four backend endpoints. It uses the tested core
logic from the repo root (`wix-stamps-bridge`), which `npm run dev` and `npm run build` compile first.

## What's in it

| Path | What it does |
|---|---|
| `src/extensions/dashboard/pages/stamps-bridge/` | The dashboard page: **To ship**, **Upload shipments** and **Setup** tabs |
| `src/dashboard/` | The three tabs and a small client for the endpoints |
| `src/pages/api/settings.ts` | Read and save this store's setup |
| `src/pages/api/orders-to-ship.ts` | Paid, unfulfilled orders since the start date |
| `src/pages/api/order-states.ts` | Looks up the orders named in an uploaded history file |
| `src/pages/api/fulfil.ts` | Marks confirmed orders fulfilled with tracking |
| `src/backend/` | Wix order, fulfilment and settings calls, plus the caller check |
| `src/extensions/backend/data-collections/` | The settings collection created on each site at install |

CSV reading, matching and building all run in the browser, using the core logic. The backend only talks to Wix.

### Security

HTTP endpoints are public URLs, so every handler first runs `rejectUnlessOrderManager()` in
`src/backend/http.ts`:

1. The token must be live (`active`) and belong to a Wix user signed in to the site's dashboard.
   Visitors, members and other apps are refused.
2. The user must be able to read the site's orders **themselves**. The app makes one small orders search
   as the caller, without elevation, and refuses if Wix says no. Without this, any collaborator, whatever
   their role, could use the app's elevated access to read customer addresses or mark orders shipped.
   This check fails closed.

After that, inputs are validated and capped (1,000 orders per request), and only then are elevated calls
made. Requests use a bearer token rather than cookies, so they can't be forged from another site.

Known and accepted:
- **Collaborators who can read orders can also mark them shipped** through the app, even if their role
  can't manage fulfilments in Wix itself. Give the shipper's role only what it needs.
- **The orders file isn't protected against spreadsheet formulas.** A customer could type a name starting
  with `=`. The file is meant for Stamps.com, which imports plain text. Escaping it would corrupt real data
  (phone numbers start with `+`). Don't open it in Excel with macros enabled.
- **Wix's own `@wix/dashboard` pulls in `zod` and `d3-color` versions with published advisories** (memory
  use and a slow regex). These are upstream, run in the browser on trusted data, and are fixed by Wix
  updating the package.

## Requirements

- **Node 24.18 or later** (`nvm use` reads `.nvmrc`).
- A Wix developer account.
- Sites that install the app need **Wix Stores** and the **CMS** (the settings collection lives in the CMS).

## Connect it to Wix (first time)

This code was written before the app was registered with Wix, so it has no `wix.config.json` yet.

1. Log in and create a blank app, outside this repo, to register it and get its IDs:
   ```bash
   nvm use 24
   cd /tmp && npm create @wix/new@latest app
   ```
   Name it **Stamps Bridge** and choose the blank template.
2. Copy `wix.config.json` and `.env.local` from that new folder into this `app/` folder. Don't edit them.
   `.env.local` is git-ignored.
3. In the app dashboard at [manage.wix.com/account/custom-apps](https://manage.wix.com/account/custom-apps),
   open the app's **Permissions** page and add:
   - **Read Orders** (`ECOM.READ_ORDERS`)
   - **Manage Fulfillments** (`ECOM.MODIFY_FULFILLMENTS`)
   - **Wix Data**: read and manage data collections and items
4. Run it against a test site:
   ```bash
   npm install
   npm run dev
   ```

## Commands

```bash
npm run dev        # local development against a Wix test site
npm run build      # production build
npm run release    # release a new app version
npm run typecheck  # TypeScript check (works before the app is connected)
```

## Not yet verified on a live site

The type check passes, and the bundles compile. Wix's final build step needs the app's real keys, so it
can't run until the app is connected. These need checking on a test site:

- The order search filters (`status`, `paymentStatus`, `fulfillmentStatus`, `_createdDate`, `number`).
- That the settings collection is found by its suffix and saves correctly.
- Whether Wix emails the customer when the app adds tracking.
- That the permission check's orders search works for a normal collaborator. Wix may only allow that call
  for apps. If so, the check refuses everyone, and it needs another way to read the caller's permissions.
- Downloading a file from inside the dashboard page.
