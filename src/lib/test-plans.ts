export type TestPlanId = "weekly" | "weekly_discount" | "monthly" | "annual";

export type TestPlan = {
  id: TestPlanId;
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

export const testPlans: TestPlan[] = [
  {
    id: "weekly",
    name: "aiorder Premium — 7-Day Pass",
    description: "One payment for 7 days of Premium access. No automatic renewal.",
    priceLabel: "MX$60 one time",
    unitAmount: 6000,
    interval: "once",
    taxMode: "exclusive",
    creditGrant: 500,
    features: [
      "200 included story turns per day",
      "2 lifetime ASMR generations free",
      "Premium interactive story access",
      "Cross-device story and watch progress",
    ],
  },
  {
    id: "weekly_discount",
    name: "aiorder Premium — 7-Day Pass",
    description: "One payment for 7 days of Premium access. No automatic renewal.",
    priceLabel: "MX$43 one time",
    unitAmount: 4300,
    interval: "once",
    taxMode: "exclusive",
    creditGrant: 500,
    features: [
      "200 included story turns per day",
      "2 lifetime ASMR generations free",
      "Premium interactive story access",
      "Cross-device story and watch progress",
    ],
  },
  {
    id: "monthly",
    name: "aiorder Premium — Monthly",
    description: "Full premium access with monthly renewal.",
    priceLabel: "MX$110 / month",
    unitAmount: 11000,
    interval: "month",
    taxMode: "exclusive",
    creditGrant: 1150,
    features: [
      "200 included story turns per day",
      "2 lifetime ASMR generations free",
      "Premium interactive story access",
      "Cross-device story and watch progress",
      "Character conversations and new story releases",
    ],
    featured: true,
  },
  {
    id: "annual",
    name: "aiorder Premium — Annual",
    description: "A year of premium access at the best available rate.",
    priceLabel: "MX$425 / year",
    unitAmount: 42500,
    interval: "year",
    taxMode: "inclusive",
    creditGrant: 5000,
    features: [
      "200 included story turns per day",
      "2 lifetime ASMR generations free",
      "Premium interactive story access",
      "Cross-device story and watch progress",
      "Character conversations and new story releases",
      "Self-service receipts and subscription management",
    ],
  },
];

export function getTestPlan(id: string): TestPlan | undefined {
  return testPlans.find((plan) => plan.id === id);
}
