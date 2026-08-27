"use client";

import { useState } from "react";
import Link from "next/link";
import { testPlans, type TestPlanId } from "@/lib/test-plans";

export default function StripeTestPage() {
  const [pendingPlan, setPendingPlan] = useState<TestPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(planId: TestPlanId) {
    setPendingPlan(planId);
    setError(null);

    try {
      const response = await fetch("/api/stripe/test-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        setError(data.error ?? "Unable to start the Stripe test checkout.");
        setPendingPlan(null);
        return;
      }

      window.location.assign(data.url);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setPendingPlan(null);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-blue-700">
            Stripe integration test
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900">
            aiorder-afterline Premium pricing mirror
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            This page mirrors the current aiorder-afterline Premium plans and prices for
            Stripe test-mode checkout. It does not grant production access and
            is not connected to live billing.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
            Test mode only · no real charges
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {testPlans.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col rounded-3xl border p-7 ${
                plan.featured
                  ? "border-blue-600 bg-white shadow-xl"
                  : "border-zinc-200 bg-white"
              }`}
            >
              {plan.featured && (
                <span className="mb-4 w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-zinc-900">
                {plan.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {plan.description}
              </p>
              <p className="mt-6 text-3xl font-semibold text-zinc-900">
                {plan.priceLabel}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {plan.creditGrant.toLocaleString()} credits included
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => startCheckout(plan.id)}
                disabled={pendingPlan !== null}
                className={`mt-7 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition ${
                  plan.featured
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-zinc-200 text-zinc-900 hover:border-zinc-300"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {pendingPlan === plan.id
                  ? "Opening Stripe..."
                  : "Start test checkout"}
              </button>
              <p className="mt-3 text-xs text-zinc-500">
                {plan.taxMode === "inclusive"
                  ? "Taxes included."
                  : "Applicable taxes are calculated at checkout."}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-zinc-200 bg-white p-8">
          <h2 className="text-lg font-semibold text-zinc-900">
            What this page tests
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-zinc-600">
            <li>• Stripe Checkout session creation</li>
            <li>• One-time and recurring billing modes</li>
            <li>• Correct product names, prices, and tax behavior</li>
            <li>• Success and cancel redirect handling</li>
          </ul>
          <p className="mt-6 text-sm text-zinc-600">
            Need to go back to the main site?{" "}
            <Link
              href="/"
              className="font-medium text-blue-700 underline-offset-4 hover:underline"
            >
              Return to aiorderafterline
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
