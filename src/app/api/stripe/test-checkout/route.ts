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

const allowedOrigins = new Set([
  "https://afterline.ai",
  "https://www.afterline.ai",
  "http://localhost:5173",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://afterline.ai",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders(req) });
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  const stripe = getStripeTestClient();

  if (!stripe) {
    return jsonResponse(
      req,
      { error: "Stripe test mode is not configured." },
      503,
    );
  }

  let payload: { planId?: string; email?: string };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse(req, { error: "Invalid request." }, 400);
  }

  const plan = getTestPlan(payload.planId ?? "");

  if (!plan) {
    return jsonResponse(req, { error: "Unknown test plan." }, 400);
  }

  const appUrl = getAppUrl(req);
  const isOneTime = plan.interval === "once";
  const email = (payload.email ?? "").trim();
  const recurring =
    plan.interval === "month"
      ? { interval: "month" as const }
      : plan.interval === "year"
        ? { interval: "year" as const }
        : undefined;
  const origin = req.headers.get("origin") ?? "";
  const source = allowedOrigins.has(origin) && origin !== "http://localhost:5173"
    ? "afterline-pricing"
    : "stripe-test-page";
  const metadata = {
    plan: plan.id,
    source,
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isOneTime ? "payment" : "subscription",
      ...(email ? { customer_email: email } : {}),
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

    return jsonResponse(req, { url: session.url });
  } catch (error) {
    console.error("Stripe test checkout session creation failed", error);
    return jsonResponse(
      req,
      { error: "Could not create a test checkout session." },
      500,
    );
  }
}
