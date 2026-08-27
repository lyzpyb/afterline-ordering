import { NextResponse } from "next/server";
import { getPlan } from "@/lib/plans";
import { getStripeClient } from "@/lib/stripe";

function getAppUrl(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const stripe = getStripeClient();

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured yet." },
      { status: 503 },
    );
  }

  let payload: {
    planId?: string;
    email?: string;
    company?: string;
    message?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const plan = getPlan(payload.planId ?? "");

  if (!plan) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim();
  const company = (payload.company ?? "").trim();
  const message = (payload.message ?? "").trim();

  if (!email || !company) {
    return NextResponse.json(
      { error: "Work email and company name are required." },
      { status: 400 },
    );
  }

  const appUrl = getAppUrl(req);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      client_reference_id: `${plan.id}-${Date.now()}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plan.unitAmount,
            recurring: { interval: "month" },
            product_data: {
              name: `aiorder-afterline — ${plan.name}`,
              description: plan.description,
            },
          },
        },
      ],
      subscription_data: {
        metadata: {
          plan: plan.id,
          company,
          contactEmail: email,
          notes: message.slice(0, 500),
        },
      },
      metadata: {
        plan: plan.id,
        company,
        contactEmail: email,
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed", error);
    return NextResponse.json(
      { error: "Could not create a checkout session." },
      { status: 500 },
    );
  }
}
