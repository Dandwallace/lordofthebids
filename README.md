# Lord of the Bids

A private tool for finding things to buy and resell on eBay UK. It searches
active listings, works out where each one sits against the rest of that
market, and shows what would be left after fees, postage and packaging.

Next.js App Router, TypeScript, plain CSS, no database. Deploys to Vercel.

- **Setup:** [`docs/ebay-setup.md`](docs/ebay-setup.md)
- **Fee rules:** [`src/lib/money/fees.ts`](src/lib/money/fees.ts) — one
  versioned object, dated, overridable
- **Run the tests:** `npm test`

## What it does, and the limit it works inside

**There is no sold price data in this app.** eBay's Marketplace Insights
API is the only official source of sold prices and is a limited release
that individual developers are refused. So the reference price is built
from what everyone else is *currently asking* for the same thing.

That is a real limitation, not a detail, so it is stated wherever a figure
derived from it appears. The app never shows a sold price, a demand
measure, a sell-through rate or a selling-time estimate, because nothing it
can reach supports one. An ended listing is not evidence of a sale.

Three things make asking prices usable anyway:

1. **Listings are read, not just priced.** A search for "nintendo switch"
   returns the console, a carry case for it, an empty box, a broken one for
   spares and a job lot of five. Anything that is not the product is
   detected and kept out of the comparison set — and shown to you, with the
   words that triggered it. Trimming price outliers does not fix this: a
   £15 empty box sits comfortably inside the fence for a £40 game.
2. **Outliers are then fenced.** A Tukey fence at 1.5× the interquartile
   range removes the mispriced remainder.
3. **The resale assumption is the 40th percentile, not the middle.** Every
   listing in the sample is one that has *not* sold. Asking prices sit above
   what people pay, so the midpoint would overstate what you can get.

## The three screens

**Discover** — start from your constraints rather than a product name. Set
a maximum purchase price, a minimum profit and a minimum return, then scan
one of the starter categories. The categories are hand-written starting
points, labelled as such: they explain what makes a category worth looking
at and what decides whether a given listing is worth buying. They make no
claim about demand or price. Numbers appear only after a scan, and they
come from live listings.

**Search** — a specific product, or an eBay listing link pasted in for
review on its own. Detailed filters live behind "More filters"; whatever is
applied shows as removable chips.

**Saved** — a shortlist with your own notes and a status of Interested,
Purchased or Passed. Saving stamps a snapshot of the figures; a refresh
re-checks price and availability while leaving your notes alone. Marking
something Purchased is a note to yourself — the app cannot buy anything.

## How the money is worked out

All money is handled as **integer pence**. Floating point pounds accumulate
error, and this tool exists to answer "is this worth buying".

```
Acquisition cost = item price + delivery to you
Selling costs    = postage out + packaging + preparation
Allowances       = repair allowance + expected loss allowance
Total cost       = acquisition cost + selling costs + allowances
Net receipts     = resale price − eBay fees on that sale
Profit           = net receipts − total cost      (trading profit, before tax)
Margin           = profit ÷ resale price
ROI              = profit ÷ total cost
```

ROI's denominator is total cost, and that is stated in the interface next
to every ROI figure. Profit is pre-tax trading profit; personal income tax
is deliberately not modelled and never mixed in.

**The maximum you should pay** is solved directly rather than searched for.
Writing `A` for acquisition cost and `S` for all other costs:

```
profit ≥ minProfit  ⟹  A ≤ netReceipts − S − minProfit
ROI    ≥ minRoi     ⟹  A ≤ netReceipts ÷ (1 + minRoi) − S
```

The ceiling is the lower of the two, floored to the penny, then reduced by
acquisition postage to give a maximum item price or bid. A test sweeps 49
resale values and checks that a deal priced exactly at the ceiling still
meets both targets, and that a penny more breaks one.

**Double counting is avoided** by treating the resale figure as the full
amount the buyer pays, delivery included. eBay's fee base is that same
amount, and your own outbound postage is a cost on top. The buyer-paid
Buyer Protection fee is never deducted, because it does not come out of the
seller payout.

### Fees

Business seller is the default, since this is a resale workflow. Every rate
lives in `EBAY_UK_FEE_RULES`, versioned and dated, and any of it can be
overridden by hand in Settings when you know your exact rate.

Corrections made to the previous version of this file:

- **The fee base was wrong.** eBay charges the final value fee on the total
  the buyer pays — item price *plus postage* — not the item price alone.
  On a £40 item with £5 postage that was a 65p understatement per sale.
- **The per-order fee is banded**: £0.30 up to £10, £0.40 above it.
- **Authenticity-checked private sales carry a per-order fee too**, which
  was previously missed.

Business sellers pay a category final value fee (6.9%–14.9%, most items
9.9%–12.9%), a per-order fee, a 0.35% regulatory operating fee, and 20% VAT
on all of it. If you are VAT registered and reclaim that VAT, turn off
"Treat VAT on fees as a cost" and it is shown but not deducted.

Private sellers have paid no final value fee, no per-order fee and no
regulatory fee on eligible domestic sales since 1 October 2024. They still
pay in authenticity-checked categories (watches and trainers over £100,
designer handbags over £500, trading cards over £150) and 3% on
international sales.

> **Verify the rates.** eBay's own help pages were not reachable from the
> environment this was built in, so the figures were confirmed against
> secondary UK seller references in September 2026 and are marked
> *indicative* in the code and in the interface. Per-category percentages
> are the least certain part. The manual override exists for exactly this.

## Evidence, not confidence scores

The previous version printed a confidence percentage from a weighted
formula. Nothing was measured against a real outcome, so the number looked
authoritative and meant nothing. It is gone.

In its place: the sample size, the spread, how recently listings were
posted, what the matching could not resolve, and a one-word summary
(*limited* / *moderate* / *reasonable*) whose rules are written down in
`src/lib/market/evidence.ts`. Every result also carries an explicit list of
what the evidence **cannot** tell you.

## Verification

`npm test` — 81 unit tests, covering:

- money arithmetic, including the floating-point traps (`1.005 × 100` is
  `100.49999999999999`, which rounds to the wrong penny without care)
- every fee path, both seller types, VAT treatment, category thresholds,
  overrides
- the deal maths and the max-price solver, including a consistency sweep
- product matching: accessories, empty boxes, parts, bundles, faulty units,
  digital codes, replicas, and the caution phrases
- **that a purchase-price filter cannot change the reference dataset**
- unknown values staying unknown rather than becoming zero
- untrusted listing text being reduced to inert plain text

`npm run verify:ui` — 19 browser checks against a running build: keyboard
reachability, visible focus, sorting (including unknowns sorting last),
filter chips, excluded-row reasons, saving, notes and preferences surviving
a reload, drawer focus handling and Escape, the manual-scenario label, and
the purchase-cap separation end to end.

`npm run screenshots` — captures desktop, tablet and mobile across
populated, empty, error and drawer states.

Both browser scripts need the app running: `npm run build && npx next start -p 3222`.

### What is not verified

No live eBay call has ever been made from this codebase. The build
environment has no eBay credentials and its network policy blocks
`ebay.com`, so everything below is written to the documented API shape and
remains **unproven against the live service**:

- OAuth client-credentials token fetch, caching and 401 refresh
- Browse API search: filter syntax, pagination, dedupe, 429 and 5xx retry
- `get_item_by_legacy_id` for pasted listing links, and description text
- whether real listing titles trip the matching rules at a sensible rate

The account deletion endpoint's challenge response **is** verified: it was
run against a live server and the SHA-256 digest matched an independent
computation byte for byte.

Everything else was validated with fixtures that run through the real
analysis code, so example figures cannot drift from live ones.

## Storage

Preferences and the saved shortlist are kept in **this browser only**
(`localStorage`). There is no account and no server-side storage, so they
do not follow you to another device and clearing site data erases them. The
app says so on the Saved screen. `src/lib/store/storage.ts` is the single
seam to replace when a database arrives.

No credential is ever stored in the browser. eBay keys are read only on the
server, in `src/lib/ebay/config.ts`.

## Untrusted content

Listing titles, descriptions and item specifics are written by other
people. They are treated as data: never rendered as HTML, never interpreted
as instructions, and never able to trigger an action. `src/lib/text.ts` is
the only place listing text becomes displayable, and there is a test that a
description saying "ignore previous instructions" is shown as plain words
and nothing else.

## Project layout

```
src/
  app/
    page.tsx, layout.tsx, globals.css       one page, one stylesheet
    api/search/       search + analysis
    api/item/         a single listing, from a pasted link
    api/health/       connection status, no secrets
    api/ebay/deletion-notification/         required by eBay
  components/         AppShell, Discover, Results, ItemDetails, Saved, Settings
  lib/
    money/            money.ts, fees.ts, deal.ts  - integer pence, tested
    market/           matching.ts, stats.ts, evidence.ts, analyse.ts
    ebay/             auth, browse, cache, config, errors, url
    store/            preferences and saved items
    discover/         starter categories
    fixtures/         labelled example data
```

## Call budget

The Browse allowance is 5,000 calls per day for the whole app. Search depth
maps to pages (Quick 1, Standard 2, Thorough 5), identical searches are
cached for 10 minutes, later pages fetch two at a time, and a Discover scan
is capped at 6 searches. Every result reports what it spent.
