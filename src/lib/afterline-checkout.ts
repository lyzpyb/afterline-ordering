import { NextResponse } from "next/server";
import { getStripeClient, getStripeTestClient } from "@/lib/stripe";
import {
  getBillingMode,
  getSupabaseAdminClient,
  type BillingMode,
} from "@/lib/membership";
import {
  getTestPlan,
  testPlans,
  toMarketCode,
  type MarketCode,
  type TestPlanId,
} from "@/lib/test-plans";

// billing_subscriptions statuses that still hold the Stripe customer's
// currency (everything except expired / canceled).
const OPEN_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "paid",
  "scheduled_cancel",
  "past_due",
  "paused",
];

// The currency a market's plans are billed in. Rows written before markets
// existed default to "US" in the database.
function currencyForMarket(marketCode: string | null | undefined) {
  return testPlans.find((plan) => plan.marketCode === marketCode)?.currency ?? "usd";
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
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://afterline.ai",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders(req) });
}

function getAppUrl(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(req.url).origin;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email);
}

function isAllowedReturnUrl(returnUrl: string) {
  try {
    const parsed = new URL(returnUrl);
    const isLocalHttp = parsed.protocol === "http:" && parsed.host === "localhost:5173";
    return (parsed.protocol === "https:" || isLocalHttp)
      && allowedReturnOrigins.has(parsed.origin);
  } catch {
    return false;
  }
}

// AfterLine routes with HashRouter (`https://www.afterline.ai/#/es/pricing`),
// so its pages read the query string inside the hash, not location.search.
// The flag goes wherever the page will look for it; `null` removes a stale one.
function withStripePaymentFlag(returnUrl: string, status: "success" | null) {
  const parsed = new URL(returnUrl);
  const hashRoute = parsed.hash.startsWith("#/") ? parsed.hash.slice(1) : null;

  if (hashRoute === null) {
    if (status) {
      parsed.searchParams.set("stripe_payment", status);
    } else if (parsed.searchParams.has("stripe_payment")) {
      parsed.searchParams.delete("stripe_payment");
    }

    return parsed.href;
  }

  const queryStart = hashRoute.indexOf("?");
  const path = queryStart === -1 ? hashRoute : hashRoute.slice(0, queryStart);
  const params = new URLSearchParams(
    queryStart === -1 ? "" : hashRoute.slice(queryStart + 1),
  );

  if (status) {
    params.set("stripe_payment", status);
  } else if (params.has("stripe_payment")) {
    params.delete("stripe_payment");
  } else {
    return parsed.href;
  }

  const query = params.toString();
  parsed.hash = query ? `${path}?${query}` : path;
  return parsed.href;
}

function getPaymentSuccessUrl(returnUrl: string | undefined, appUrl: string) {
  if (returnUrl && isAllowedReturnUrl(returnUrl)) {
    return withStripePaymentFlag(returnUrl, "success");
  }

  return `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
}

function getPaymentCancelUrl(returnUrl: string | undefined, appUrl: string) {
  if (returnUrl && isAllowedReturnUrl(returnUrl)) {
    return withStripePaymentFlag(returnUrl, null);
  }

  return `${appUrl}/cancel`;
}

function getStripePriceId(planId: TestPlanId, billingMode: BillingMode) {
  const mode = billingMode === "production" ? "LIVE" : "TEST";
  return process.env[`STRIPE_PRICE_${planId.toUpperCase()}_${mode}`]?.trim() || null;
}

// Optional region lock, off by default. While it is off, planId alone decides
// the price, so a hand-made request can buy another market's plan.
function isMarketEnforcedByIp() {
  return process.env.ENFORCE_MARKET_BY_IP?.trim().toLowerCase() === "true";
}

// The markets the AfterLine webapp sells at their own prices: the same list as
// its BILLING_CHARGEABLE_MARKETS. The webapp shows a visitor from any other
// market its default-market plans, so the region lock must let those through.
function getChargeableMarkets(): MarketCode[] {
  const configured = (process.env.AFTERLINE_CHARGEABLE_MARKETS ?? "")
    .split(",")
    .map((value) => toMarketCode(value))
    .filter((market): market is MarketCode => market !== null);

  return configured.length > 0 ? configured : ["MX"];
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

export async function createAfterLineCheckout(
  req: Request,
  options: { requireTestKey?: boolean } = {},
) {
  const billingMode = getBillingMode();
  const stripe = options.requireTestKey
    ? getStripeTestClient()
    : getStripeClient();

  if (!stripe) {
    return jsonResponse(
      req,
      {
        error: options.requireTestKey
          ? "Stripe test mode is not configured."
          : "Stripe checkout is not configured.",
      },
      503,
    );
  }

  let payload: {
    planId?: string;
    email?: string;
    returnUrl?: string;
    accessToken?: string;
    // Informational: planId decides what is charged. offerKey must agree with
    // the plan when it is sent; marketCode is only logged.
    offerKey?: unknown;
    marketCode?: unknown;
  };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse(req, { error: "Invalid request." }, 400);
  }

  const plan = getTestPlan(payload.planId ?? "");

  if (!plan) {
    return jsonResponse(
      req,
      { error: options.requireTestKey ? "Unknown test plan." : "Unknown plan." },
      400,
    );
  }

  const requestedOfferKey = optionalString(payload.offerKey);
  const requestedMarketCode = optionalString(payload.marketCode).toUpperCase();

  if (requestedOfferKey && requestedOfferKey !== plan.offerKey) {
    console.warn("Checkout offer does not match the plan", {
      plan: plan.id,
      offerKey: requestedOfferKey,
      expectedOfferKey: plan.offerKey,
    });
    return jsonResponse(
      req,
      { error: "The selected offer does not match the plan." },
      400,
    );
  }

  if (requestedMarketCode && requestedMarketCode !== plan.marketCode) {
    console.warn("Checkout market does not match the plan", {
      plan: plan.id,
      marketCode: requestedMarketCode,
      planMarketCode: plan.marketCode,
    });
  }

  if (isMarketEnforcedByIp()) {
    const requestMarket = toMarketCode(req.headers.get("x-vercel-ip-country"));

    // Only buyers from a market the webapp prices on its own are fenced to it.
    if (
      requestMarket
      && getChargeableMarkets().includes(requestMarket)
      && requestMarket !== plan.marketCode
    ) {
      return jsonResponse(
        req,
        { error: "This plan is not available in your region." },
        403,
      );
    }
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
      return jsonResponse(
        req,
        { error: "Membership storage is not configured." },
        503,
      );
    }

    const { data: existingCustomer, error: existingCustomerError } = await supabase
      .from("billing_customers")
      .select("creem_customer_id")
      .eq("user_id", accountUserId)
      .eq("mode", billingMode)
      .maybeSingle();

    if (existingCustomerError) {
      console.error("Could not load the existing Stripe customer", existingCustomerError);
      return jsonResponse(
        req,
        { error: "Could not load your payment profile." },
        500,
      );
    }

    existingCustomerId = existingCustomer?.creem_customer_id ?? null;

    // Stripe locks a customer to one currency while it has a subscription
    // that is not canceled ("You cannot combine currencies on a single
    // customer"), and the stored customer is reused for every plan. Refuse a
    // subscription in another currency up front with a clear message instead
    // of a Stripe error. One-time passes are not affected by the lock.
    if (plan.interval !== "once") {
      const { data: openSubscriptions, error: openSubscriptionsError } = await supabase
        .from("billing_subscriptions")
        .select("market_code")
        .eq("user_id", accountUserId)
        .eq("mode", billingMode)
        .in("status", OPEN_SUBSCRIPTION_STATUSES);

      if (openSubscriptionsError) {
        console.error("Could not load the existing subscriptions", openSubscriptionsError);
        return jsonResponse(
          req,
          { error: "Could not load your payment profile." },
          500,
        );
      }

      const otherCurrency = (openSubscriptions ?? []).some(
        (row) => currencyForMarket(row.market_code) !== plan.currency,
      );
      if (otherCurrency) {
        return jsonResponse(
          req,
          {
            error:
              "You already have a subscription billed in another currency. Cancel it in Manage subscription before choosing this plan.",
          },
          409,
        );
      }
    }
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
    : "stripe-page";
  const metadata = {
    plan: plan.id,
    planKey: plan.planKey,
    offerKey: plan.offerKey,
    marketCode: plan.marketCode,
    source,
    billingMode,
    ...(accountUserId ? { userId: accountUserId } : {}),
  };
  const successUrl = getPaymentSuccessUrl(payload.returnUrl, appUrl);
  const cancelUrl = options.requireTestKey
    ? `${appUrl}/stripe-test`
    : getPaymentCancelUrl(payload.returnUrl, appUrl);
  const description = options.requireTestKey || billingMode === "test"
    ? `${plan.description} Stripe test checkout only.`
    : plan.description;
  const stripePriceId = getStripePriceId(plan.id, billingMode);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isOneTime ? "payment" : "subscription",
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : validEmail
          ? { customer_email: validEmail }
          : {}),
      client_reference_id: `stripe-${billingMode === "production" ? "live" : "test"}-${plan.id}-${Date.now()}`,
      line_items: [
        {
          quantity: 1,
          ...(stripePriceId
            ? { price: stripePriceId }
            : {
                price_data: {
                  currency: plan.currency,
                  unit_amount: plan.unitAmount,
                  tax_behavior: plan.taxMode,
                  ...(recurring ? { recurring } : {}),
                  product_data: {
                    name: plan.name,
                    description,
                  },
                },
              }),
        },
      ],
      ...(isOneTime
        // statement_descriptor is rejected for card charges; card statements
        // take the account's prefix plus this suffix instead.
        ? { payment_intent_data: { metadata, statement_descriptor_suffix: "AIORDER" } }
        : { subscription_data: { metadata } }),
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return jsonResponse(req, { url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed", error);
    return jsonResponse(
      req,
      { error: "Could not create a checkout session." },
      500,
    );
  }
}

export function createAfterLineCheckoutOptions(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
