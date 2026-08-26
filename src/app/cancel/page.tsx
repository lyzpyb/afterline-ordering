import Link from "next/link";

export default function CancelPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10">
        <p className="text-sm font-semibold text-zinc-500">Checkout canceled</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">
          No charge was made
        </h1>
        <p className="mt-4 text-sm leading-7 text-zinc-700">
          Your subscription was not completed. You can return to the pricing page whenever you&apos;re ready.
        </p>
        <Link
          href="/#subscribe"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Back to plans
        </Link>
      </div>
    </main>
  );
}
