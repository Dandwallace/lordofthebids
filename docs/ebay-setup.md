# Connecting the app to eBay

This is a developer task. The API credentials live in the server
environment and never reach the browser, so there is nothing a user of the
app can do to fix a missing connection themselves. When credentials are
absent the app shows an "eBay connection needs setup" state and offers
example data instead of failing.

## The variables

Copy `.env.example` to `.env.local` and fill it in. On Vercel, set the same
names under **Project Settings → Environment Variables**, then redeploy:
environment variables are read at runtime by the server, and an existing
deployment will not pick up new values until it is redeployed.

| Variable | What it is |
| --- | --- |
| `EBAY_CLIENT_ID` | Client ID (App ID) from your eBay keyset |
| `EBAY_CLIENT_SECRET` | Client Secret (Cert ID). Server side only |
| `EBAY_ENV` | `production` or `sandbox` |
| `EBAY_MARKETPLACE_ID` | `EBAY_GB` |
| `EBAY_VERIFICATION_TOKEN` | A token you invent, 32–80 chars, `A-Z a-z 0-9 _ -` |
| `EBAY_NOTIFICATION_ENDPOINT` | The full public https URL of the deletion endpoint |

Check what the server can see at `/api/health`. It reports whether
credentials are present, never what they are:

```json
{ "configured": true, "environment": "production", "marketplaceId": "EBAY_GB" }
```

If `configured` is `false`, the server has no `EBAY_CLIENT_ID` and/or
`EBAY_CLIENT_SECRET`. The names of the missing variables are written to the
server log, not returned to the browser.

> **The error a previous review saw.** "EBAY_CLIENT_ID and
> EBAY_CLIENT_SECRET must be set" was the old code returning the raw
> internal message to the browser. That message no longer leaves the
> server: the user now gets a designed setup state, and the variable names
> go to the log. The underlying cause is still the same one — the
> variables are not set on the deployment.

## eBay developer portal steps

1. **Register** at [developer.ebay.com](https://developer.ebay.com) and
   create an application.
2. **Start with the sandbox keyset.** It works immediately and needs none
   of the steps below. Set `EBAY_ENV=sandbox` and confirm the app runs.
   Sandbox inventory is sparse and artificial, so the price distribution
   will be meaningless — it proves the plumbing, nothing more.
3. **Deploy somewhere with a public https URL.** You need the URL before
   step 4.
4. **Register the account deletion endpoint.** eBay will not enable
   production keys until this exists and validates. In the portal, go to
   your keyset → *Alerts and Notifications* → **Marketplace account
   deletion**, and enter:
   - **Endpoint URL**: `https://your-app.vercel.app/api/ebay/deletion-notification`
   - **Verification token**: the value of `EBAY_VERIFICATION_TOKEN`

   Set `EBAY_NOTIFICATION_ENDPOINT` to that exact URL in the deployed
   environment **before** you hit send, and redeploy. The challenge hash is
   computed from that variable and eBay compares it against the URL you
   registered character for character — a trailing slash, `http` instead of
   `https`, or a preview hostname will all fail.
5. eBay sends a `GET` with a `challenge_code`; the endpoint replies with
   `{"challengeResponse": sha256(challenge_code + verification_token + endpoint_url)}`.
6. **Swap in the production keyset** and set `EBAY_ENV=production`.

Verify the challenge response yourself:

```bash
curl "https://your-app.vercel.app/api/ebay/deletion-notification?challenge_code=test123"

node -e 'console.log(require("crypto").createHash("sha256")
  .update("test123" + process.env.EBAY_VERIFICATION_TOKEN + process.env.EBAY_NOTIFICATION_ENDPOINT)
  .digest("hex"))'
```

On `POST`, the endpoint logs the notice and returns 200. There is no
database and no eBay user data is stored, so there is nothing to erase.

## Data source permissions

The app uses exactly one live source: the **eBay Browse API**, which
returns active listings.

It deliberately does **not** use:

- **eBay Marketplace Insights** (sold prices). It is a limited release and
  individual developers are refused. Nothing in the app shows a sold price,
  a demand figure, a sell-through rate or a selling-time estimate, because
  there is no source that supports one.
- **Third party research tools.** Holding a subscription to a research tool
  does not by itself grant the right to pull its data into another
  application. Nothing is integrated until that permission is established
  in writing with the provider.
- **External AI processing of listings.** Listing text is scanned for known
  phrases by fixed rules in `src/lib/market/matching.ts`. No listing
  content is sent to any model.

These are surfaced to the user under **Settings → Data sources**, so the
app's limits are visible rather than implied.

## Rate limits and the call budget

The default Browse allowance is **5,000 calls per day for the whole
application**, not per user.

- One page of results is one call and returns up to 200 listings.
- Search depth maps to pages: Quick 1, Standard 2, Thorough 5. Pagination
  is handled internally; there is no "pages to pull" control.
- Identical searches are cached in server memory for 10 minutes.
- Page requests beyond the first run two at a time.
- A Discover category scan is capped at 6 searches.
- A 429 from eBay is never retried; 5xx and network failures are retried
  twice with backoff.
