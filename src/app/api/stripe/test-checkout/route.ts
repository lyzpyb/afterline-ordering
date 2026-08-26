import { NextResponse } from "next/server";
import { getTestPlan } from "@/lib/test-plans";
import { getStripeTestClient } from "@/lib/stripe";

function getAppUrl(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const stripe = getStripeTestClient();

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe test mode is not configured." },
      { status: 503 },
    );
  }

  let payload: { planId?: string };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const plan = getTestPlan(payload.planId ?? "");

  if (!plan) {
    return NextResponse.json({ error: "Unknown test plan." }, { status: 400 });
  }

  const appUrl = getAppUrl(req);
  const isOneTime = plan.interval === "once";
  const recurring =
    plan.interval === "month"
      ? { interval: "month" as const }
      : plan.interval === "year"
        ? { interval: "year" as const }
        : undefined;
  const metadata = {
    plan: plan.id,
    source: "stripe-test-page",
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isOneTime ? "payment" : "subscription",
      client_reference_id: `stripe-test-${plan.id}-${Date.now()}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plan.unitAmount,
            tax_behavior: plan.taxMode,
            ...(recurring ? { recurring } : {}),
            product_data: {
              name: plan.name,
              description: `${plan.description} Stripe test checkout only.`,
            },
          },
        },
      ],
      ...(isOneTime
        ? { payment_intent_data: { metadata } }
        : { subscription_data: { metadata } }),
      metadata,
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/stripe-test`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe test checkout session creation failed", error);
    return NextResponse.json(
      { error: "Could not create a test checkout session." },
      { status: 500 },
    );
  }
}
