export type MarketCode = "MX" | "US" | "BR";

export type TestPlanId =
  | "weekly"
  | "weekly_discount"
  | "monthly"
  | "annual"
  | "us_weekly"
  | "us_weekly_discount"
  | "us_monthly"
  | "us_annual"
  | "br_weekly"
  | "br_weekly_discount"
  | "br_monthly"
  | "br_annual";

export type TestPlan = {
  id: TestPlanId;
  // Must match the AfterLine webapp catalog (server/billing-catalog.js) and the
  // commerce_offer_configs.offer_key rows in Supabase.
  offerKey: string;
  marketCode: MarketCode;
  // The AfterLine plan family. Every 7-day pass is "weekly", whatever its price.
  planKey: "weekly" | "monthly" | "annual";
  variantKey: "base" | "discount";
  currency: "mxn" | "usd";
  name: string;
  description: string;
  priceLabel: string;
  unitAmount: number;
  interval: "once" | "month" | "year";
  taxMode: "exclusive" | "inclusive";
  creditGrant: number;
  features: string[];
  featured?: boolean;
};

export type SubscriptionPlan = TestPlan & { interval: "month" | "year" };

export const MARKET_CODES: readonly MarketCode[] = ["MX", "US", "BR"];

const passFeatures = [
  "200 included story turns per day",
  "2 lifetime ASMR generations free",
  "Premium interactive story access",
  "Cross-device story and watch progress",
];

const monthlyFeatures = [
  "200 included story turns per day",
  "2 lifetime ASMR generations free",
  "Premium interactive story access",
  "Cross-device story and watch progress",
  "Character conversations and new story releases",
];

const annualFeatures = [
  "200 included story turns per day",
  "2 lifetime ASMR generations free",
  "Premium interactive story access",
  "Cross-device story and watch progress",
  "Character conversations and new story releases",
  "Self-service receipts and subscription management",
];

const passName = "aiorder Premium — 7-Day Pass";
const passDescription = "One payment for 7 days of Premium access. No automatic renewal.";
const monthlyName = "aiorder Premium — Monthly";
const monthlyDescription = "Full premium access with monthly renewal.";
const annualName = "aiorder Premium — Annual";
const annualDescription = "A year of premium access at the best available rate.";

export const testPlans: TestPlan[] = [
  // Mexico (MXN). These ids predate regional pricing and stay unprefixed.
  {
    id: "weekly",
    offerKey: "mx_base_weekly_v1",
    marketCode: "MX",
    planKey: "weekly",
    variantKey: "base",
    currency: "mxn",
    name: passName,
    description: passDescription,
    priceLabel: "MX$60 one time",
    unitAmount: 6000,
    interval: "once",
    taxMode: "inclusive",
    creditGrant: 500,
    features: passFeatures,
  },
  {
    id: "weekly_discount",
    offerKey: "mx_discount_weekly_v1",
    marketCode: "MX",
    planKey: "weekly",
    variantKey: "discount",
    currency: "mxn",
    name: passName,
    description: passDescription,
    priceLabel: "MX$43 one time",
    unitAmount: 4300,
    interval: "once",
    taxMode: "inclusive",
    creditGrant: 500,
    features: passFeatures,
  },
  {
    id: "monthly",
    offerKey: "mx_base_monthly_v1",
    marketCode: "MX",
    planKey: "monthly",
    variantKey: "base",
    currency: "mxn",
    name: monthlyName,
    description: monthlyDescription,
    priceLabel: "MX$110 / month",
    unitAmount: 11000,
    interval: "month",
    taxMode: "inclusive",
    creditGrant: 1150,
    features: monthlyFeatures,
    featured: true,
  },
  {
    id: "annual",
    offerKey: "mx_base_annual_v1",
    marketCode: "MX",
    planKey: "annual",
    variantKey: "base",
    currency: "mxn",
    name: annualName,
    description: annualDescription,
    priceLabel: "MX$425 / year",
    unitAmount: 42500,
    interval: "year",
    taxMode: "inclusive",
    creditGrant: 5000,
    features: annualFeatures,
  },
  // United States (USD).
  {
    id: "us_weekly",
    offerKey: "us_base_weekly_v1",
    marketCode: "US",
    planKey: "weekly",
    variantKey: "base",
    currency: "usd",
    name: passName,
    description: passDescription,
    priceLabel: "US$12.90 one time",
    unitAmount: 1290,
    interval: "once",
    taxMode: "inclusive",
    creditGrant: 2000,
    features: passFeatures,
  },
  {
    id: "us_weekly_discount",
    offerKey: "us_discount_weekly_v1",
    marketCode: "US",
    planKey: "weekly",
    variantKey: "discount",
    currency: "usd",
    name: passName,
    description: passDescription,
    priceLabel: "US$9.90 one time",
    unitAmount: 990,
    interval: "once",
    taxMode: "inclusive",
    creditGrant: 2000,
    features: passFeatures,
  },
  {
    id: "us_monthly",
    offerKey: "us_base_monthly_v2",
    marketCode: "US",
    planKey: "monthly",
    variantKey: "base",
    currency: "usd",
    name: monthlyName,
    description: monthlyDescription,
    priceLabel: "US$19.90 / month",
    unitAmount: 1990,
    interval: "month",
    taxMode: "inclusive",
    creditGrant: 3500,
    features: monthlyFeatures,
  },
  {
    id: "us_annual",
    offerKey: "us_base_annual_v2",
    marketCode: "US",
    planKey: "annual",
    variantKey: "base",
    currency: "usd",
    name: annualName,
    description: annualDescription,
    priceLabel: "US$99.90 / year",
    unitAmount: 9990,
    interval: "year",
    taxMode: "inclusive",
    creditGrant: 20000,
    features: annualFeatures,
  },
  // Brazil (priced in USD, like commerce_offer_configs).
  {
    id: "br_weekly",
    offerKey: "br_base_weekly_v1",
    marketCode: "BR",
    planKey: "weekly",
    variantKey: "base",
    currency: "usd",
    name: passName,
    description: passDescription,
    priceLabel: "US$6.99 one time",
    unitAmount: 699,
    interval: "once",
    taxMode: "inclusive",
    creditGrant: 1000,
    features: passFeatures,
  },
  {
    id: "br_weekly_discount",
    offerKey: "br_discount_weekly_v1",
    marketCode: "BR",
    planKey: "weekly",
    variantKey: "discount",
    currency: "usd",
    name: passName,
    description: passDescription,
    priceLabel: "US$4.99 one time",
    unitAmount: 499,
    interval: "once",
    taxMode: "inclusive",
    creditGrant: 1000,
    features: passFeatures,
  },
  {
    id: "br_monthly",
    offerKey: "br_base_monthly_v1",
    marketCode: "BR",
    planKey: "monthly",
    variantKey: "base",
    currency: "usd",
    name: monthlyName,
    description: monthlyDescription,
    priceLabel: "US$12.90 / month",
    unitAmount: 1290,
    interval: "month",
    taxMode: "inclusive",
    creditGrant: 2300,
    features: monthlyFeatures,
  },
  {
    id: "br_annual",
    offerKey: "br_base_annual_v1",
    marketCode: "BR",
    planKey: "annual",
    variantKey: "base",
    currency: "usd",
    name: annualName,
    description: annualDescription,
    priceLabel: "US$49.90 / year",
    unitAmount: 4990,
    interval: "year",
    taxMode: "inclusive",
    creditGrant: 10000,
    features: annualFeatures,
  },
];

export function getTestPlan(id: string): TestPlan | undefined {
  return testPlans.find((plan) => plan.id === id);
}

export function isSubscriptionPlanConfig(
  plan: TestPlan | undefined,
): plan is SubscriptionPlan {
  return plan?.interval === "month" || plan?.interval === "year";
}

export function getSubscriptionPlan(id: string): SubscriptionPlan | undefined {
  const plan = getTestPlan(id);
  return isSubscriptionPlanConfig(plan) ? plan : undefined;
}

export function toMarketCode(value: string | null | undefined): MarketCode | null {
  const normalized = value?.trim().toUpperCase();
  return MARKET_CODES.find((market) => market === normalized) ?? null;
}
