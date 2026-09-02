import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { BILLING_MODE, getSupabaseAdminClient } from "@/lib/membership";

const allowedOrigins = new Set([
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders(req) });
}

function isAllowedReturnUrl(returnUrl: string) {
  try {
    const parsed = new URL(returnUrl);
    const isLocalHttp = parsed.protocol === "http:" && parsed.host === "localhost:5173";
    return (parsed.protocol === "https://" || isLocalHttp)
      && allowedOrigins.has(parsed.origin);
  } catch {
    return false;
  }
}

function getReturnUrl(returnUrl: string | undefined) {
  if (returnUrl && isAllowedReturnUrl(returnUrl)) {
    return returnUrl;
  }

  return "https://www.afterline.ai/profile?billing=portal";
}

async function getUserIdFromRequest(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) {
    return null;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user?.id) {
    return null;
  }

  return data.user.id;
}

export async function POST(req: Request) {
  const stripe = getStripeClient();

  if (!stripe) {
    return jsonResponse(req, { error: "Stripe portal is not configured." }, 503);
  }

  let payload: { returnUrl?: string } = {};

  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  let userId: string | null;

  try {
    userId = await getUserIdFromRequest(req);
  } catch (error) {
    console.error("Could not verify the billing portal session", error);
    return jsonResponse(req, { error: "Could not verify your session." }, 500);
  }

  if (!userId) {
    return jsonResponse(req, { error: "Please sign in again." }, 401);
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return jsonResponse(req, { error: "Membership storage is not configured." }, 503);
  }

  const { data: customer, error } = await supabase
    .from("billing_customers")
    .select("creem_customer_id")
    .eq("user_id", userId)
    .eq("mode", BILLING_MODE)
    .maybeSingle();

  if (error) {
    console.error("Could not load the billing customer", error);
    return jsonResponse(req, { error: "Could not load your payment profile." }, 500);
  }

  if (!customer?.creem_customer_id) {
    return jsonResponse(req, { error: "No billing profile found." }, 404);
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.creem_customer_id,
      return_url: getReturnUrl(payload.returnUrl),
    });

    return jsonResponse(req, { portal_url: session.url });
  } catch (error) {
    console.error("Stripe billing portal session creation failed", error);
    return jsonResponse(req, { error: "Could not open the billing portal." }, 500);
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
