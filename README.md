# Lord of the Bids

A private eBay UK arbitrage scanner. Search active listings for a term, work
out where each listing sits in the price distribution of everything else in
that same search, and surface the ones sitting well below it with the profit
after fees, postage and packaging worked out.

Next.js App Router, TypeScript, plain CSS, no database. Built to deploy on
Vercel.

## What it actually does, and the one big caveat

**There is no sold price data in this tool.** eBay's Marketplace Insights API,
the only official source of sold prices, is a limited release and individual
developers are refused access. So the reference price is built from the
distribution of *active* listings returned by the Browse API: what everyone
else is currently asking for the same thing.

Two adjustments make that usable:

1. **Outliers are trimmed before the percentiles are computed**, using a Tukey
   fence at 1.5x the interquartile range. A job lot of twelve, a broken unit
   sold for parts, or a listing with a typo in the price no longer drags the
   percentiles around. The fence is only applied once there are at least eight
   prices, below that the quartiles are meaningless.
2. **The resale assumption is the 40th percentile, not the median.** Every
   listing in the sample is one that has *not* sold yet, so asking prices skew
   above selling prices. Taking the middle of the asks would systematically
   overstate what you can get.

Only listings in the **bottom quarter** of the trimmed distribution are costed
out as candidates. Anything above that is not a deal, it is just the market.

Each candidate gets a **comparison quality** rating driven by sample size and
by spread (the interquartile range as a share of the median). A wide spread
usually means the search term is pulling in more than one product, and the
rating is the honest signal that the number below it is not to be trusted.

Per listing, these risks are flagged:

| Flag | Meaning |
| --- | --- |
| Auction | The price shown is the current bid, not what you will pay |
| Feedback *n* / No feedback | Seller has under 20 feedback, or none at all |
| *n*% positive | Positive feedback under 95% |
| Too cheap | Under 35% of the reference price, so probably a different item, a part, or an empty box |
| Ships from *XX* | Not located in GB, so import charges and slow delivery are likely |

Treat the profit column as a shortlist, not a promise. Read every listing.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill it in, see below
npm run dev                  # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

### Environment variables

| Variable | What it is |
| --- | --- |
| `EBAY_CLIENT_ID` | Client ID (App ID) from your eBay keyset |
| `EBAY_CLIENT_SECRET` | Client Secret (Cert ID). Server side only, never exposed |
| `EBAY_ENV` | `production` or `sandbox` |
| `EBAY_MARKETPLACE_ID` | `EBAY_GB` |
| `EBAY_VERIFICATION_TOKEN` | A token you invent, 32 to 80 chars, `A-Z a-z 0-9 _ -` |
| `EBAY_NOTIFICATION_ENDPOINT` | The full public https URL of the deletion endpoint |

`.env.example` has these with blank values. Never commit real ones. On Vercel,
set them under Project Settings → Environment Variables.

Every eBay call runs server side in an API route, so the client secret never
reaches the browser.

## eBay developer portal steps

1. **Register** at [developer.ebay.com](https://developer.ebay.com) and create
   an application.
2. **Get your sandbox keyset** first. It works immediately and needs none of
   the steps below. Set `EBAY_ENV=sandbox` and confirm the app runs. Sandbox
   inventory is sparse and artificial, so the price distribution will be
   nonsense — it proves the plumbing, nothing more.
3. **Deploy this app** somewhere with a public https URL, e.g. Vercel. You
   need the URL before you can do step 4.
4. **Register the account deletion endpoint.** eBay will not enable your
   production keys until this exists and passes validation. In the developer
   portal go to your keyset → **Notifications** / *Alerts and Notifications* →
   **Marketplace account deletion**, and enter:
   - **Endpoint URL**: `https://your-app.vercel.app/api/ebay/deletion-notification`
   - **Verification token**: the value of `EBAY_VERIFICATION_TOKEN`

   Set `EBAY_NOTIFICATION_ENDPOINT` to that exact same URL in your deployed
   environment **before** you hit send, and redeploy so it takes effect. The
   challenge hash is computed from that env var, and eBay compares it against
   the URL you registered character for character — a trailing slash, `http`
   instead of `https`, or a preview deployment hostname will all fail.
5. eBay sends a `GET` with a `challenge_code`, the endpoint replies with
   `{"challengeResponse": sha256(challenge_code + verification_token + endpoint_url)}`,
   and the portal shows a tick.
6. **Get your production keyset** and swap `EBAY_CLIENT_ID`,
   `EBAY_CLIENT_SECRET` and `EBAY_ENV=production`.

You can test the challenge response yourself:

```bash
curl "https://your-app.vercel.app/api/ebay/deletion-notification?challenge_code=test123"
```

and check it against:

```bash
node -e 'console.log(require("crypto").createHash("sha256").update("test123"+TOKEN+URL).digest("hex"))'
```

On `POST`, the endpoint logs the notice and returns 200. There is no database
and no eBay user data is stored anywhere, so there is nothing to erase.

## Call budget

**The default Browse API allowance is 5,000 calls per day for the whole
application, not per user.** Blow through it and searches fail with a 429
until the daily reset.

- One page of results is **one call** and returns up to **200 listings**.
- Pagination is capped at **5 pages** in the client, so a single search can
  never cost more than 5 calls.
- **Pages to pull** is a user setting in the left panel. It defaults to 2.
- Every result set shows how many calls the search actually spent.
- OAuth token requests do not count against the Browse allowance. The token
  lasts two hours and is cached in module scope, so a warm server instance
  reuses one token across many searches.

At the default 2 pages that is 2,500 searches a day. At 5 pages it is 1,000.
If you need more, request a higher limit through the eBay developer portal.

## Fees

Every rate lives in one place: `EBAY_UK_FEES` in `src/lib/pricing/fees.ts`.
Both UK tracks are modelled and the seller type is a toggle in the UI.

**Private sellers** have paid no final value fee, no per order fee and no
regulatory operating fee on eligible domestic sales since 1 October 2024. The
Buyer Protection fee introduced alongside that change is paid by the buyer at
checkout and does **not** come out of the seller payout, so it is deliberately
never deducted. Private sellers still pay a final value fee in authenticity
checked categories — watches over £100, trainers over £100, designer handbags
over £500, trading cards over £150 — and 3% on international sales.

**Business sellers** pay a final value fee of 6.9% to 14.9% by category, most
items landing between 9.9% and 12.9%, plus a per order fee of £0.30 or £0.40,
plus a 0.35% regulatory operating fee, plus 20% VAT on all of those fees.

> **Rates change.** The figures are a 2026 snapshot. Verify them against
> eBay's published UK fee pages before trusting a profit number. The
> authenticity checked private seller rates are marked `VERIFY` in the source
> and are set deliberately high, so profit is understated rather than
> overstated.

## Project layout

```
src/
  app/
    page.tsx                                  one page UI
    layout.tsx, globals.css                   plain CSS, no Tailwind
    api/search/route.ts                       search + pricing, server side
    api/ebay/deletion-notification/route.ts   eBay account deletion endpoint
  components/
    Workbench.tsx        holds settings state, no localStorage
    SearchPanel.tsx      left panel controls
    ResultsPanel.tsx     summary strip and results
  lib/
    ebay/auth.ts         OAuth2 client credentials, module scope token cache
    ebay/browse.ts       Browse API client, pagination cap, condition filters
    ebay/types.ts        the slice of the eBay response actually read
    pricing/stats.ts     percentiles, IQR fence, confidence rating
    pricing/fees.ts      EBAY_UK_FEES, the single source of truth for rates
    pricing/analyse.ts   listings + distribution + fees -> ranked deals
    types.ts             the API/UI contract
```

Deliberately not used: the deprecated Finding API, any scraping of eBay HTML,
and `localStorage`.
