export type PlanId = "starter" | "growth" | "scale";

export type Plan = {
  id: PlanId;
  name: string;
  description: string;
  priceLabel: string;
  unitAmount: number;
  features: string[];
  featured?: boolean;
};

export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For single-store teams starting with intelligent ordering.",
    priceLabel: "$19 / month",
    unitAmount: 1900,
    features: [
      "1 store",
      "3 users",
      "Demand forecasts",
      "Replenishment suggestions",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "For growing chains that need automation across locations.",
    priceLabel: "$49 / month",
    unitAmount: 4900,
    features: [
      "5 stores",
      "15 users",
      "Auto replenishment rules",
      "Supplier scorecards",
      "Approval workflow",
      "Priority email support",
    ],
    featured: true,
  },
  {
    id: "scale",
    name: "Scale",
    description: "For multi-store operators and distributors.",
    priceLabel: "$99 / month",
    unitAmount: 9900,
    features: [
      "Unlimited stores",
      "50 users",
      "Custom forecasting models",
      "Supplier collaboration",
      "API access",
      "Dedicated onboarding",
    ],
  },
];

export function getPlan(id: string): Plan | undefined {
  return plans.find((plan) => plan.id === id);
}
