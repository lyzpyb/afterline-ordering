export const metadata = {
  title: "AfterLine Pricing | aiorderafterline",
  description: "Embedded AfterLine subscription pricing page.",
};

export default function AfterlinePricingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <section className="mx-auto w-full max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Embedded subscription page
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
              AfterLine Pricing
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              The live AfterLine pricing page is embedded below. If login or
              checkout is blocked by the browser, open it in a new tab.
            </p>
          </div>
          <a
            href="https://afterline.ai/pricing"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Open in new tab
          </a>
        </div>
      </section>

      <iframe
        src="https://afterline.ai/pricing"
        title="AfterLine Pricing"
        className="min-h-[85vh] w-full flex-1 border-0"
        loading="lazy"
      />
    </main>
  );
}
