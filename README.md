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

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
