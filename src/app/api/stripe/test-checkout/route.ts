import { NextResponse } from "next/server";
import { getTestPlan } from "@/lib/test-plans";
import { getStripeTestClient } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/membership";

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

const allowedReturnOrigins = new Set([
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email);
}

function getPaymentSuccessUrl(returnUrl?: string, appUrl?: string) {
  if (returnUrl) {
    try {
      const parsed = new URL(returnUrl);
      const isLocalHttp = parsed.protocol === "http:" && parsed.host === "localhost:5173";

      if (parsed.protocol === "https:" || isLocalHttp) {
        if (allowedReturnOrigins.has(parsed.origin)) {
          parsed.searchParams.set("stripe_payment", "success");
          return parsed.href;
        }
      }
    } catch {
      // Ignore malformed return URLs and use the normal success page.
    }
  }

  return `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
}

async function getUserIdFromAccessToken(accessToken: string | undefined) {
  const token = accessToken?.trim();

  if (!token) {
    return null;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.id) {
    throw new Error("Invalid AfterLine session.");
  }

  return data.user.id;
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

  let payload: {
    planId?: string;
    email?: string;
    returnUrl?: string;
    accessToken?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse(req, { error: "Invalid request." }, 400);
  }

  const plan = getTestPlan(payload.planId ?? "");

  if (!plan) {
    return jsonResponse(req, { error: "Unknown test plan." }, 400);
  }

  let accountUserId: string | null = null;
  let existingCustomerId: string | null = null;

  if (payload.accessToken) {
    try {
      accountUserId = await getUserIdFromAccessToken(payload.accessToken);
    } catch {
      return jsonResponse(req, { error: "Please sign in again." }, 401);
    }
  }

  if (accountUserId) {
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return jsonResponse(req, { error: "Membership storage is not configured." }, 503);
    }

    const { data: existingCustomer, error: existingCustomerError } = await supabase
      .from("billing_customers")
      .select("creem_customer_id")
      .eq("user_id", accountUserId)
      .eq("mode", "test")
      .maybeSingle();

    if (existingCustomerError) {
      console.error("Could not load the existing Stripe customer", existingCustomerError);
      return jsonResponse(req, { error: "Could not load your payment profile." }, 500);
    }

    existingCustomerId = existingCustomer?.creem_customer_id ?? null;
  }

  const appUrl = getAppUrl(req);
  const isOneTime = plan.interval === "once";
  const email = (payload.email ?? "").trim();
  const validEmail = isValidEmail(email) ? email : "";
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
    ...(accountUserId ? { userId: accountUserId } : {}),
  };
  const successUrl = getPaymentSuccessUrl(payload.returnUrl, appUrl);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isOneTime ? "payment" : "subscription",
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : validEmail
          ? { customer_email: validEmail }
          : {}),
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
      success_url: successUrl,
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
