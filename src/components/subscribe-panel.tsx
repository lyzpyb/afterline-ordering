"use client";

import { useMemo, useState } from "react";

type Plan = "starter" | "growth" | "scale";

const plans: Record<Plan, { label: string; price: string; seats: string }> = {
  starter: { label: "Starter", price: "$19 / month", seats: "1 store · 3 users" },
  growth: { label: "Growth", price: "$49 / month", seats: "5 stores · 15 users" },
  scale: { label: "Scale", price: "$99 / month", seats: "Unlimited stores · 50 users" },
};

const contactEmail = "hello@afterline.shop";

export function SubscribePanel() {
  const [plan, setPlan] = useState<Plan>("growth");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "ready" | "invalid">("idle");

  const mailto = useMemo(() => {
    const subject = encodeURIComponent(`AfterLine subscription request — ${plans[plan].label}`);
    const body = encodeURIComponent(
      `Hello AfterLine team,\n\nI would like to subscribe to the ${plans[plan].label} plan.\n\nWork email: ${email}\nCompany / store: ${company}\nTeam size: ${plans[plan].seats}\n\nNotes:\n${message}\n\nPlease help me create the account and confirm the subscription by email.\n\nThank you,\n${email}`,
    );
    return `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  }, [company, email, message, plan]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !company.trim()) {
      setStatus("invalid");
      return;
    }
    setStatus("ready");
    window.location.href = mailto;
  }

  return (
    <section id="subscribe" className="mx-auto w-full max-w-5xl px-6 pb-24">
      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-8 shadow-sm sm:p-10">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-blue-700">Get started</p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Create your account, then confirm by email
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            Choose a plan, submit your details, and we&apos;ll send the subscription confirmation and account setup link to your work email.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 sm:grid-cols-2">
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-zinc-700">Plan</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(Object.keys(plans) as Plan[]).map((key) => {
                const item = plans[key];
                const selected = plan === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPlan(key)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                        : "border-zinc-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-zinc-900">{item.label}</span>
                    <span className="mt-1 block text-sm text-zinc-600">{item.price}</span>
                    <span className="mt-2 block text-xs text-zinc-500">{item.seats}</span>
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
              className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Create account &amp; email subscription request
            </button>
            <a
              href={`mailto:${contactEmail}`}
              className="text-sm font-medium text-blue-700 underline-offset-4 hover:underline"
            >
              Or email us directly
            </a>
          </div>

          {status === "invalid" && (
            <p className="text-sm text-red-600 sm:col-span-2">
              Please add your work email and company name.
            </p>
          )}
          {status === "ready" && (
            <p className="text-sm text-emerald-700 sm:col-span-2">
              Your email draft is ready. Send it to finish the subscription request.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
