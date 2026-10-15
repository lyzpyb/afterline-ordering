import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSubscriptionPlan,
  getTestPlan,
  type SubscriptionPlan,
  type TestPlanId,
} from "@/lib/test-plans";

export type BillingMode = "test" | "production";

export function getBillingMode(): BillingMode {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
    ? "production"
    : "test";
}

export const BILLING_MODE = getBillingMode();
export const PREMIUM_ENTITLEMENT = "premium_story_access";

const ACCESS_PASS_DAYS = 7;
// Sessions created before plans carried their own credit grant (or without a
// recognisable plan in metadata) keep the original flat pass grant.
const LEGACY_ACCESS_PASS_CREDITS = 500;

// Known product ids for the original MX subscriptions. Other plans read
// STRIPE_PRODUCT_<PLANID>_<LIVE|TEST>.
const PRODUCT_IDS: Record<BillingMode, Partial<Record<TestPlanId, string>>> = {
  test: {
    monthly: "stripe-test-monthly",
    annual: "stripe-test-annual",
  },
  production: {
    monthly: "prod_V9GWYStCxTJOJn",
    annual: "prod_V9GWjFtdaTIAbW",
  },
};

export function getStripeProductId(
  planId: TestPlanId,
  billingMode: BillingMode = BILLING_MODE,
) {
  const known = PRODUCT_IDS[billingMode][planId];

  if (known) {
    return known;
  }

  const mode = billingMode === "production" ? "LIVE" : "TEST";
  return process.env[`STRIPE_PRODUCT_${planId.toUpperCase()}_${mode}`]?.trim() || null;
}

// billing_subscriptions.creem_product_id is NOT NULL: prefer the configured id,
// then the product on the Stripe subscription item, then a readable placeholder.
function subscriptionProductId(
  plan: SubscriptionPlan,
  stripeProductId: string | null | undefined,
) {
  return getStripeProductId(plan.id)
    ?? stripeProductId
    ?? `stripe-${BILLING_MODE === "production" ? "live" : "test"}-${plan.id}`;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  cachedClient ??= createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
}

export async function resolveUserByEmail(email: string | null | undefined) {
  const normalized = email?.trim();

  if (!normalized) {
    return null;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("resolve_billing_user_by_email", {
    p_email: normalized,
  });

  if (error) {
    throw new Error(`Could not resolve the billing account: ${error.message}`);
  }

  return typeof data === "string" ? data : null;
}

export async function resolveUserById(userId: string | null | undefined) {
  const normalized = userId?.trim();

  if (!normalized) {
    return null;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.admin.getUserById(normalized);

  if (error) {
    return null;
  }

  return data?.user?.id ?? null;
}

function timestampFromStripe(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function recordEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
  createdAt: number,
  payload: unknown,
) {
  const { error } = await supabase.from("billing_events").upsert(
    {
      creem_event_id: eventId,
      mode: BILLING_MODE,
      event_type: eventType,
      event_created_at: createdAt,
      payload: payload ?? {},
      processed_at: new Date().toISOString(),
    },
    { onConflict: "creem_event_id,mode" },
  );

  if (error) {
    throw new Error(`Could not record the billing event: ${error.message}`);
  }
}

async function upsertCustomer(
  supabase: SupabaseClient,
  userId: string,
  customerId: string,
  email: string | null,
) {
  const { data: currentCustomer, error: currentCustomerError } = await supabase
    .from("billing_customers")
    .select("creem_customer_id,email")
    .eq("user_id", userId)
    .eq("mode", BILLING_MODE)
    .maybeSingle();

  if (currentCustomerError) {
    throw new Error(
      `Could not load the current billing customer: ${currentCustomerError.message}`,
    );
  }

  if (
    currentCustomer?.creem_customer_id &&
    currentCustomer.creem_customer_id !== customerId
  ) {
    const { count: linkedSubscriptions, error: subscriptionCountError } = await supabase
      .from("billing_subscriptions")
      .select("creem_subscription_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("creem_customer_id", currentCustomer.creem_customer_id)
      .eq("mode", BILLING_MODE);

    if (subscriptionCountError) {
      throw new Error(`Could not check the existing subscriptions: ${subscriptionCountError.message}`);
    }

    if ((linkedSubscriptions ?? 0) > 0) {
      // Keep the original customer when historical subscriptions still point to it.
      // This avoids a foreign-key conflict while the checkout flow prefers reuse.
      return currentCustomer.creem_customer_id;
    }
  }

  const { data: providerCustomer, error: providerError } = await supabase
    .from("billing_customers")
    .select("user_id")
    .eq("creem_customer_id", customerId)
    .eq("mode", BILLING_MODE)
    .maybeSingle();

  if (providerError) {
    throw new Error(`Could not check the billing customer: ${providerError.message}`);
  }

  if (providerCustomer?.user_id && providerCustomer.user_id !== userId) {
    throw new Error("The Stripe customer is already linked to another account.");
  }

  const { error } = await supabase.from("billing_customers").upsert(
    {
      user_id: userId,
      mode: BILLING_MODE,
      creem_customer_id: customerId,
      ...(email ? { email } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,mode" },
  );

  if (error) {
    throw new Error(`Could not save the billing customer: ${error.message}`);
  }

  return customerId;
}

async function grantCredits(
  supabase: SupabaseClient,
  options: {
    userId: string;
    amount: number;
    source: "subscription" | "access_pass";
    expiresAt: string | null;
    idempotencyKey: string;
    eventId: string;
    subscriptionId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.rpc("grant_commerce_credits", {
    p_user_id: options.userId,
    p_mode: BILLING_MODE,
    p_source: options.source,
    p_amount: options.amount,
    p_expires_at: options.expiresAt,
    p_idempotency_key: options.idempotencyKey,
    p_creem_event_id: options.eventId,
    p_source_subscription_id: options.subscriptionId ?? null,
    p_metadata: options.metadata ?? {},
  });

  if (error) {
    throw new Error(`Could not grant credits: ${error.message}`);
  }
}

async function activateEntitlement(
  supabase: SupabaseClient,
  options: {
    userId: string;
    subscriptionId: string | null;
    validUntil: string | null;
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("entitlements")
    .select("valid_until")
    .eq("user_id", options.userId)
    .eq("entitlement_key", PREMIUM_ENTITLEMENT)
    .eq("mode", BILLING_MODE)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Could not check Premium: ${existingError.message}`);
  }

  const existingValidUntil = existing?.valid_until ?? null;
  const validUntil =
    existingValidUntil && options.validUntil && existingValidUntil > options.validUntil
      ? existingValidUntil
      : options.validUntil;

  const { error } = await supabase.from("entitlements").upsert(
    {
      user_id: options.userId,
      entitlement_key: PREMIUM_ENTITLEMENT,
      mode: BILLING_MODE,
      status: "active",
      source_subscription_id: options.subscriptionId,
      valid_until: validUntil,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,entitlement_key,mode" },
  );

  if (error) {
    throw new Error(`Could not activate Premium: ${error.message}`);
  }
}

export async function grantWeeklyAccessPass(options: {
  userId: string;
  eventId: string;
  eventCreatedAt: number;
  sessionId: string;
  paymentIntentId: string | null;
  email: string | null;
  planId?: string | null;
  payload: unknown;
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const purchasedPlan = getTestPlan(options.planId ?? "");
  const plan = purchasedPlan?.interval === "once" ? purchasedPlan : null;

  if (!plan) {
    console.warn("Stripe access pass has no known pass plan; using the legacy grant", {
      sessionId: options.sessionId,
      plan: options.planId ?? null,
    });
  }

  await recordEvent(
    supabase,
    options.eventId,
    "stripe:checkout.completed",
    options.eventCreatedAt,
    options.payload,
  );

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCESS_PASS_DAYS * 24 * 60 * 60 * 1000);

  await activateEntitlement(supabase, {
    userId: options.userId,
    subscriptionId: null,
    validUntil: expiresAt.toISOString(),
  });

  await grantCredits(supabase, {
    userId: options.userId,
    amount: plan?.creditGrant ?? LEGACY_ACCESS_PASS_CREDITS,
    source: "access_pass",
    expiresAt: expiresAt.toISOString(),
    idempotencyKey: `stripe-pass:${options.paymentIntentId ?? options.sessionId}`,
    eventId: options.eventId,
    metadata: {
      provider: "stripe",
      checkout_session_id: options.sessionId,
      email: options.email,
      ...(plan
        ? {
            plan: plan.id,
            plan_key: plan.planKey,
            offer_key: plan.offerKey,
            market_code: plan.marketCode,
          }
        : {}),
    },
  });
}

export async function grantSubscriptionAccess(options: {
  userId: string;
  eventId: string;
  eventCreatedAt: number;
  email: string | null;
  customerId: string;
  subscriptionId: string;
  planId: TestPlanId;
  stripeProductId?: string | null;
  periodStartAt: number | null;
  periodEndAt: number | null;
  payload: unknown;
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const plan = getSubscriptionPlan(options.planId);

  if (!plan) {
    throw new Error(`Unknown subscription plan: ${options.planId}`);
  }

  await recordEvent(
    supabase,
    options.eventId,
    "stripe:checkout.completed",
    options.eventCreatedAt,
    options.payload,
  );
  const effectiveCustomerId = await upsertCustomer(
    supabase,
    options.userId,
    options.customerId,
    options.email,
  );

  const periodStart = timestampFromStripe(options.periodStartAt);
  const periodEnd = timestampFromStripe(options.periodEndAt);

  const { error } = await supabase.from("billing_subscriptions").upsert(
    {
      creem_subscription_id: options.subscriptionId,
      user_id: options.userId,
      creem_customer_id: effectiveCustomerId,
      mode: BILLING_MODE,
      creem_product_id: subscriptionProductId(plan, options.stripeProductId),
      plan_key: plan.planKey,
      status: "active",
      current_period_start_at: periodStart,
      current_period_end_at: periodEnd,
      canceled_at: null,
      last_event_created_at: options.eventCreatedAt,
      market_code: plan.marketCode,
      variant_key: plan.variantKey,
      offer_key: plan.offerKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "creem_subscription_id,mode" },
  );

  if (error) {
    throw new Error(`Could not save the subscription: ${error.message}`);
  }

  await activateEntitlement(supabase, {
    userId: options.userId,
    subscriptionId: options.subscriptionId,
    validUntil: periodEnd,
  });

  await grantCredits(supabase, {
    userId: options.userId,
    amount: plan.creditGrant,
    source: "subscription",
    expiresAt: periodEnd,
    idempotencyKey: `subscription:${options.subscriptionId}:${options.periodStartAt ?? 0}`,
    eventId: options.eventId,
    subscriptionId: options.subscriptionId,
    metadata: {
      provider: "stripe",
      checkout_event_id: options.eventId,
      plan: plan.id,
      plan_key: plan.planKey,
      offer_key: plan.offerKey,
      market_code: plan.marketCode,
    },
  });
}

export async function extendSubscriptionAccess(options: {
  userId: string;
  eventId: string;
  eventCreatedAt: number;
  email: string | null;
  customerId: string;
  subscriptionId: string;
  planId: TestPlanId;
  stripeProductId?: string | null;
  periodStartAt: number | null;
  periodEndAt: number | null;
  payload: unknown;
}) {
  await grantSubscriptionAccess(options);
}

export async function revokeSubscriptionAccess(options: {
  userId: string;
  eventId: string;
  eventCreatedAt: number;
  customerId: string;
  subscriptionId: string;
  planId?: string | null;
  stripeProductId?: string | null;
  payload: unknown;
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  await recordEvent(
    supabase,
    options.eventId,
    "stripe:subscription.deleted",
    options.eventCreatedAt,
    options.payload,
  );
  const effectiveCustomerId = await upsertCustomer(
    supabase,
    options.userId,
    options.customerId,
    null,
  );

  const { data: stored, error: storedError } = await supabase
    .from("billing_subscriptions")
    .select("creem_product_id,plan_key,market_code,variant_key,offer_key")
    .eq("creem_subscription_id", options.subscriptionId)
    .eq("mode", BILLING_MODE)
    .maybeSingle();

  if (storedError) {
    throw new Error(`Could not load the subscription: ${storedError.message}`);
  }

  // Keep what the subscription was saved with; otherwise describe it from the
  // plan in the Stripe metadata. The generic values are a last resort only.
  const plan = getSubscriptionPlan(options.planId ?? "");
  const offerKey = stored?.offer_key ?? plan?.offerKey ?? null;

  const now = new Date().toISOString();

  const { error: subscriptionError } = await supabase
    .from("billing_subscriptions")
    .upsert(
      {
        creem_subscription_id: options.subscriptionId,
        user_id: options.userId,
        creem_customer_id: effectiveCustomerId,
        mode: BILLING_MODE,
        creem_product_id: stored?.creem_product_id
          ?? (plan ? subscriptionProductId(plan, options.stripeProductId) : null)
          ?? options.stripeProductId
          ?? (BILLING_MODE === "production"
            ? "stripe-aiorder-unknown"
            : "stripe-test-unknown"),
        plan_key: stored?.plan_key ?? plan?.planKey ?? "monthly",
        status: "canceled",
        canceled_at: now,
        last_event_created_at: options.eventCreatedAt,
        market_code: stored?.market_code ?? plan?.marketCode ?? "US",
        variant_key: stored?.variant_key ?? plan?.variantKey ?? "base",
        ...(offerKey ? { offer_key: offerKey } : {}),
        updated_at: now,
      },
      { onConflict: "creem_subscription_id,mode" },
    );

  if (subscriptionError) {
    throw new Error(
      `Could not cancel the subscription: ${subscriptionError.message}`,
    );
  }

  const { error: entitlementError } = await supabase
    .from("entitlements")
    .upsert(
      {
        user_id: options.userId,
        entitlement_key: PREMIUM_ENTITLEMENT,
        mode: BILLING_MODE,
        status: "revoked",
        source_subscription_id: options.subscriptionId,
        valid_until: now,
        updated_at: now,
      },
      { onConflict: "user_id,entitlement_key,mode" },
    );

  if (entitlementError) {
    throw new Error(`Could not revoke Premium: ${entitlementError.message}`);
  }
}
