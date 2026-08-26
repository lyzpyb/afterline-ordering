"use client";

import { useState } from "react";
import { plans, type PlanId } from "@/lib/plans";

const contactEmail = "hello@afterline.shop";

export function SubscribePanel() {
  const [planId, setPlanId] = useState<PlanId>("growth");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = plans.find((plan) => plan.id === planId)!;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, email, company, message }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        setStatus("error");
        setError(
          data.error === "Stripe is not configured yet."
            ? "Stripe is not configured yet. Please contact us by email and we'll complete your subscription manually."
            : data.error ?? "Unable to start checkout. Please try again.",
        );
        return;
      }

      window.location.href = data.url;
    } catch {
      setStatus("error");
      setError("Network error. Please check your connection and try again.");
    }
  }

  return (
    <section id="subscribe" className="mx-auto w-full max-w-5xl px-6 pb-24">
      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-8 shadow-sm sm:p-10">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-blue-700">Get started</p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Create your account and subscribe securely
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            Choose a plan, add your details, and complete payment through Stripe. You can also email us if you prefer manual onboarding.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 sm:grid-cols-2">
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-zinc-700">Plan</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {plans.map((plan) => {
                const selected = plan.id === planId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanId(plan.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                        : "border-zinc-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-zinc-900">{plan.name}</span>
                    <span className="mt-1 block text-sm text-zinc-600">{plan.priceLabel}</span>
                    <span className="mt-2 block text-xs text-zinc-500">{plan.description}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Work email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Company or store
            <input
              type="text"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Company name"
              className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-zinc-700 sm:col-span-2">
            What do you want to automate first?
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              placeholder="Inventory forecasting, replenishment, supplier emails, reporting..."
              className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading"
                ? "Creating secure checkout..."
                : `Subscribe to ${selectedPlan.name}`}
            </button>
            <a
              href={`mailto:${contactEmail}`}
              className="text-sm font-medium text-blue-700 underline-offset-4 hover:underline"
            >
              Or email us directly
            </a>
          </div>

          {status === "error" && error && (
            <p className="text-sm text-red-600 sm:col-span-2">{error}</p>
          )}

          <p className="text-xs text-zinc-500 sm:col-span-2">
            Payments are processed securely by Stripe. You can cancel or manage your subscription at any time.
          </p>
        </form>
      </div>
    </section>
  );
}
