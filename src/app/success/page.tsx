export default function SuccessPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10">
        <p className="text-sm font-semibold text-emerald-700">Payment successful</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">
          Thank you for subscribing
        </h1>
        <p className="mt-4 text-sm leading-7 text-zinc-700">
          We&apos;ve received your subscription. Our team will onboard your workspace and send your account details by email.
        </p>
      </div>
    </main>
  );
}
