export type TestPlanId = "weekly" | "monthly" | "annual";

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
    name: "AfterLine Premium — 7-Day Pass",
    description: "One payment for 7 days of Premium access. No automatic renewal.",
    priceLabel: "$12.90 one time",
    unitAmount: 1290,
    interval: "once",
    taxMode: "exclusive",
    creditGrant: 2000,
    features: [
      "200 included story turns per day",
      "2 lifetime ASMR generations free",
      "Premium interactive story access",
      "Cross-device story and watch progress",
    ],
  },
  {
    id: "monthly",
    name: "AfterLine Premium — Monthly",
    description: "Full premium access with monthly renewal.",
    priceLabel: "$19.90 / month",
    unitAmount: 1990,
    interval: "month",
    taxMode: "exclusive",
    creditGrant: 3500,
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
    name: "AfterLine Premium — Annual",
    description: "A year of premium access at the best available rate.",
    priceLabel: "$99.90 / year",
    unitAmount: 9990,
    interval: "year",
    taxMode: "inclusive",
    creditGrant: 20000,
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
