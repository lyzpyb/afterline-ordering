import { SubscribePanel } from "@/components/subscribe-panel";

const features = [
  {
    title: "Probabilistic demand sensing",
    description: "Model demand distributions—not single-point guesses—across sales, seasonality, promotions, pricing, weather, and local events.",
  },
  {
    title: "Closed-loop replenishment",
    description: "Convert forecasts into order recommendations with safety stock, MOQs, shelf life, cash limits, and service-level trade-offs.",
  },
  {
    title: "Supplier risk intelligence",
    description: "Score suppliers on fill rate, lead-time variance, price stability, and reliability to reduce silent operational risk.",
  },
  {
    title: "Multi-echelon optimization",
    description: "Balance stock across DCs, stores, and channels while reducing trapped cash and missed sales.",
  },
  {
    title: "Scenario simulation",
    description: "Compare service level, inventory value, and cash-flow outcomes before committing to a purchase cycle.",
  },
  {
    title: "Continuous learning",
    description: "Every order outcome feeds back into the model, so the system adapts as demand shifts and suppliers change.",
  },
];

const intelligenceStack = [
  {
    title: "Causal demand sensing",
    description:
      "Separate true demand drivers from noise by analyzing promotions, pricing actions, holidays, weather, channel mix, and local events.",
  },
  {
    title: "Stochastic inventory optimization",
    description:
      "Use demand distributions—not averages—to set safety stock, service levels, order timing, and inventory ceilings for each SKU-location pair.",
  },
  {
    title: "Policy simulation",
    description:
      "Test replenishment policies against cash constraints, supplier reliability, shelf life, and target service levels before execution.",
  },
  {
    title: "Closed-loop orchestration",
    description:
      "Compare recommended orders with actual sales and delivery outcomes, then continuously refine forecasts, risks, and ordering rules.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$19",
    period: "/ month",
    description: "For single-store teams starting with intelligent ordering.",
    features: [
      "1 store",
      "3 users",
      "Demand forecasts",
      "Replenishment suggestions",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "$49",
    period: "/ month",
    description: "For growing chains that need automation across locations.",
    features: [
      "5 stores",
      "15 users",
      "Closed-loop replenishment rules",
      "Supplier scorecards",
      "Approval workflow",
      "Priority email support",
    ],
    featured: true,
  },
  {
    name: "Scale",
    price: "$99",
    period: "/ month",
    description: "For multi-store operators and distributors.",
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

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <a href="#top" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">A</span>
            <span className="text-sm font-semibold tracking-tight text-zinc-900">AfterLine</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex">
            <a href="#preview" className="hover:text-zinc-900">Preview</a>
            <a href="#features" className="hover:text-zinc-900">Features</a>
            <a href="#pricing" className="hover:text-zinc-900">Pricing</a>
            <a href="#subscribe" className="hover:text-zinc-900">Subscribe</a>
          </nav>
          <a
            href="#subscribe"
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
          >
            Get started
          </a>
        </div>
      </header>

      <section id="top" className="mx-auto grid w-full max-w-6xl gap-12 px-6 pt-16 pb-20 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <div>
          <p className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Intelligent ordering system
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl">
            Autonomous inventory intelligence for modern commerce
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
            AfterLine is an AI-native decision layer for retail supply chains. It senses probabilistic demand, optimizes multi-echelon inventory, simulates cash and service scenarios, and converts live signals into supplier-ready replenishment decisions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#preview"
              className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              View product preview
            </a>
            <a
              href="#pricing"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300"
            >
              See subscription plans
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-blue-50/70 blur-2xl" aria-hidden="true" />
          <div className="relative rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs font-medium text-zinc-500">AfterLine · Ordering dashboard</span>
            </div>
            <div className="grid gap-4 pt-5 sm:grid-cols-3">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase text-zinc-500">Forecast</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">1,248</p>
                <p className="mt-1 text-xs text-emerald-600">+8.2% next 7 days</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase text-zinc-500">Suggested</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">37 SKUs</p>
                <p className="mt-1 text-xs text-blue-600">Auto-approved: 24</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase text-zinc-500">Risk</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">Low</p>
                <p className="mt-1 text-xs text-zinc-500">2 items below safety stock</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-zinc-100 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-900">Replenishment queue</p>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Live</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Oat milk 1L", "Supplier A", "36 units"],
                  ["Cold brew concentrate", "Supplier B", "72 units"],
                  ["Packaging boxes", "Supplier C", "200 units"],
                ].map(([item, supplier, amount]) => (
                  <div key={item} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{item}</p>
                      <p className="text-xs text-zinc-500">{supplier}</p>
                    </div>
                    <span className="text-sm font-semibold text-blue-700">{amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="preview" className="border-y border-zinc-200 bg-zinc-50 py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-700">Product preview</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">A guided look at the intelligent ordering loop</h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              The product preview demonstrates the closed loop: sense demand, optimize inventory, evaluate supplier risk, and generate auditable purchase recommendations.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-3xl border border-zinc-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase text-zinc-500">Workspace</p>
              <nav className="mt-4 space-y-1">
                {["Dashboard", "Forecasts", "Replenishment", "Suppliers", "Purchase orders", "Reports"].map((item, index) => (
                  <span
                    key={item}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                      index === 2 ? "bg-blue-50 font-semibold text-blue-700" : "text-zinc-600"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${index === 2 ? "bg-blue-600" : "bg-zinc-300"}`} />
                    {item}
                  </span>
                ))}
              </nav>
            </aside>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-100 p-5">
                  <p className="text-sm font-semibold text-zinc-900">Demand signal</p>
                  <p className="mt-2 text-sm text-zinc-600">Last 28 days of sales, promotions, and seasonality</p>
                  <div className="mt-5 flex h-28 items-end gap-2">
                    {[42, 55, 49, 63, 58, 73, 69, 85].map((value) => (
                      <span key={value} className="flex-1 rounded-t-md bg-blue-200" style={{ height: `${value}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-100 p-5">
                  <p className="text-sm font-semibold text-zinc-900">Order suggestion</p>
                  <p className="mt-2 text-sm text-zinc-600">Generated from stock on hand, forecast, and lead time</p>
                  <div className="mt-5 space-y-2">
                    {[
                      ["Oat milk 1L", 88],
                      ["Cold brew concentrate", 72],
                      ["Packaging boxes", 55],
                    ].map(([label, value]) => (
                      <div key={label as string} className="space-y-1">
                        <div className="flex justify-between text-xs text-zinc-600">
                          <span>{label}</span>
                          <span>{value}% confidence</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-100">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-zinc-50 p-5">
                <p className="text-sm font-semibold text-zinc-900">Supplier recommendation</p>
                <p className="mt-2 text-sm text-zinc-600">
                  Supplier A offers the best balance of price, lead time, and fill rate for this replenishment batch.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Lead time", "2 days"],
                    ["Fill rate", "98%"],
                    ["Cost saving", "12%"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-white p-4">
                      <p className="text-xs text-zinc-500">{label}</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pt-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-blue-700">Intelligence stack</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">Advanced ordering intelligence</h2>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            AfterLine is designed for uncertain, fast-moving retail environments. It combines statistical forecasting, optimization, and operational guardrails so teams can act with confidence.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {intelligenceStack.map((item) => (
            <article key={item.title} className="rounded-3xl border border-zinc-200 bg-white p-7">
              <h3 className="text-lg font-semibold text-zinc-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-blue-700">Features</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">Enterprise-grade intelligence, without a data team</h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-3xl border border-zinc-200 bg-white p-6">
              <h3 className="text-base font-semibold text-zinc-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-y border-zinc-200 bg-zinc-50 py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-700">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">Subscribe to intelligent ordering</h2>
            <p className="mt-4 text-base text-zinc-600">
              Begin with the modules you need, then expand as your stores, suppliers, and data mature.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-3xl border p-7 ${
                  plan.featured ? "border-blue-600 bg-white shadow-xl" : "border-zinc-200 bg-white"
                }`}
              >
                {plan.featured && (
                  <span className="absolute right-6 top-6 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-zinc-600">{plan.description}</p>
                <p className="mt-6">
                  <span className="text-4xl font-semibold tracking-tight text-zinc-900">{plan.price}</span>
                  <span className="text-sm text-zinc-500">{plan.period}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-700">
                  {plan.features.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href="#subscribe"
                  className={`mt-7 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition ${
                    plan.featured
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-zinc-200 text-zinc-900 hover:border-zinc-300"
                  }`}
                >
                  Choose {plan.name}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SubscribePanel />

      <footer className="border-t border-zinc-200 bg-white py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} AfterLine</span>
          <a href="mailto:hello@afterline.shop" className="font-medium text-blue-700 hover:underline">
            hello@afterline.shop
          </a>
        </div>
      </footer>
    </main>
  );
}
