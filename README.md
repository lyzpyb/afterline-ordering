# aiorderafterline

AI-native intelligent ordering system marketing and subscription site.

## Stripe setup

1. Create a Stripe account and copy a test or live secret key.
2. Add the following environment variables in Vercel:

   ```bash
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   NEXT_PUBLIC_APP_URL=https://aiorderafterline.shop
   ```

3. Deploy the project.
4. In Stripe Dashboard, create a webhook endpoint pointing to:

   ```text
   https://aiorderafterline.shop/api/stripe/webhook
   ```

5. Select the following events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`

## AfterLine plans and regional pricing

AfterLine posts `{ planId, email?, returnUrl?, accessToken?, offerKey?, marketCode? }`
to `/api/stripe/afterline-checkout`. `planId` decides what is charged; `offerKey`
must match the plan when sent (otherwise 400), and `marketCode` is only logged.
Plans live in `src/lib/test-plans.ts`, and their offer keys match the AfterLine
webapp catalog and `commerce_offer_configs`.

| planId | Market | Offer key | Price | Credits | Billing |
| --- | --- | --- | --- | --- | --- |
| `weekly` | MX | `mx_base_weekly_v1` | MXN 60.00 | 500 | one-time, 7 days |
| `weekly_discount` | MX | `mx_discount_weekly_v1` | MXN 43.00 | 500 | one-time, 7 days |
| `monthly` | MX | `mx_base_monthly_v1` | MXN 110.00 | 1,150 | monthly |
| `annual` | MX | `mx_base_annual_v1` | MXN 425.00 | 5,000 | yearly |
| `us_weekly` | US | `us_base_weekly_v1` | USD 12.90 | 2,000 | one-time, 7 days |
| `us_weekly_discount` | US | `us_discount_weekly_v1` | USD 9.90 | 2,000 | one-time, 7 days |
| `us_monthly` | US | `us_base_monthly_v2` | USD 19.90 | 3,500 | monthly |
| `us_annual` | US | `us_base_annual_v2` | USD 99.90 | 20,000 | yearly |
| `br_weekly` | BR | `br_base_weekly_v1` | USD 6.99 | 1,000 | one-time, 7 days |
| `br_weekly_discount` | BR | `br_discount_weekly_v1` | USD 4.99 | 1,000 | one-time, 7 days |
| `br_monthly` | BR | `br_base_monthly_v1` | USD 12.90 | 2,300 | monthly |
| `br_annual` | BR | `br_base_annual_v1` | USD 49.90 | 10,000 | yearly |

The one-time passes never renew. The webhook grants each plan's own credits and
records its market, offer key and plan key on the subscription.

`returnUrl` is honoured for `https://afterline.ai` and `https://www.afterline.ai`
(an earlier protocol check rejected every https URL). Buyers return to the
AfterLine page they came from, with `stripe_payment=success` placed inside the
hash route (`/#/es/pricing?stripe_payment=success`), instead of `/success`.

Environment variables (see `.env.example`):

- `STRIPE_PRICE_<PLANID>_<LIVE|TEST>`: stable Stripe Price per plan, for example
  `STRIPE_PRICE_US_WEEKLY_DISCOUNT_LIVE`. When it is unset, checkout builds an
  inline price from the plan in its own currency.
- `STRIPE_PRODUCT_<PLANID>_<LIVE|TEST>`: Stripe Product saved on
  `billing_subscriptions` for the US and BR subscription plans. When it is unset,
  the product on the Stripe subscription item is used.
- `ENFORCE_MARKET_BY_IP`: when `true`, a buyer whose `x-vercel-ip-country` is
  one of `AFTERLINE_CHARGEABLE_MARKETS` gets a 403 for a plan from another
  market. Buyers from any other country are not fenced, because the webapp
  shows them its default-market (MX) plans. It is off by default.
- `AFTERLINE_CHARGEABLE_MARKETS`: comma list, the same value as the webapp's
  `BILLING_CHARGEABLE_MARKETS`. Defaults to `MX`.

While `ENFORCE_MARKET_BY_IP` is off, `planId` alone decides the price. A
hand-made request can then buy another market's plan, for example
`weekly_discount` (MXN 43) from the US, where the webapp shows USD 9.90. Turn it
on before US and BR prices go live (steps 4 to 6). A VPN still gets around it,
as it does the webapp's own pricing.

### Rolling out US and BR

1. In Stripe (live and test), create USD Prices for the eight US and BR plans:
   one-time Prices for the weekly passes and recurring monthly or yearly Prices
   for the subscriptions, with the amounts in the table above. Set the tax
   behavior to inclusive: checkout adds no tax (no automatic tax), the
   AfterLine pricing page says "Taxes included", and Mexican consumer law
   requires the displayed price to include tax. Every plan here is
   `taxMode: "inclusive"` for the same reason.
2. Set the matching `STRIPE_PRICE_*` variables, and `STRIPE_PRODUCT_*` for the
   US and BR subscriptions, in Vercel.
3. Deploy, then run a test-mode checkout for each new plan from `/stripe-test`.
   `/stripe-test` sends no `returnUrl`, so also run one test-mode checkout with
   an AfterLine hash URL (for example
   `returnUrl: "https://www.afterline.ai/#/es/pricing"`), pay with card 4242,
   and confirm the browser lands on
   `https://www.afterline.ai/#/es/pricing?stripe_payment=success`. Stripe does
   not document fragments in `success_url`; if it rejects them, every AfterLine
   checkout fails.
   One-time passes now send `statement_descriptor_suffix` (Stripe rejects
   `statement_descriptor` on card charges). Set a shortened descriptor
   (prefix) under Settings → Public details so card statements read
   `<PREFIX>* AIORDER`.
4. Confirm that the webapp sees the visitor's country. The webapp prices by
   EdgeOne's geo and this service checks Vercel's, so both have to work:
   - From a US, a BR and an MX connection, `GET
     https://www.afterline.ai/api/v1/billing/plans` must return that country as
     a non-null `country_code`. Until a market is chargeable its
     `market_source` is `default`; MX returns `geo`.
   - If `country_code` is `null`, EdgeOne is not passing geo to the webapp. Stop
     here: with the lock on, US and BR buyers shown MX prices would get a 403.
   - The webapp's `BILLING_MARKET_OVERRIDE` must be unset. An override prices
     every visitor in one market, and the lock would refuse the others.
5. Set `AFTERLINE_CHARGEABLE_MARKETS=MX` and `ENFORCE_MARKET_BY_IP=true`, then
   redeploy. Nothing a real buyer is shown is refused yet: only a buyer from MX
   who asks for a US or BR plan is.
6. Make US and BR chargeable, in this order:
   1. Webapp: `BILLING_CHARGEABLE_MARKETS=MX,US,BR`. US and BR visitors now see
      their own prices.
   2. This service, right after: `AFTERLINE_CHARGEABLE_MARKETS=MX,US,BR`, then
      redeploy.

   The reverse order refuses US and BR buyers who are still shown MX prices.
   Between the two steps, a hand-made MX `planId` from the US or BR still goes
   through.

A small share of IPs can resolve to different countries in the two geo
databases. Those buyers get "This plan is not available in your region."

Stripe locks a customer to one currency while it has a subscription that is
not canceled, and this service reuses one Stripe customer per user. A buyer
with an open MXN subscription who asks for a USD subscription (or the
reverse) gets a 409 asking them to cancel the other one first. One-time
passes are not affected.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
