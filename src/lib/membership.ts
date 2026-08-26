import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const BILLING_MODE = "test";
export const PREMIUM_ENTITLEMENT = "premium_story_access";

type PlanId = "weekly" | "monthly" | "annual";

const CREDIT_GRANTS: Record<Exclude<PlanId, "weekly">, number> = {
  monthly: 3500,
  annual: 20000,
};

const PRODUCT_IDS: Record<Exclude<PlanId, "weekly">, string> = {
  monthly: "stripe-test-monthly",
  annual: "stripe-test-annual",
};

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
  payload: unknown;
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  await recordEvent(
    supabase,
    options.eventId,
    "stripe:checkout.completed",
    options.eventCreatedAt,
    options.payload,
  );

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await activateEntitlement(supabase, {
    userId: options.userId,
    subscriptionId: null,
    validUntil: expiresAt.toISOString(),
  });

  await grantCredits(supabase, {
    userId: options.userId,
    amount: 2000,
    source: "access_pass",
    expiresAt: expiresAt.toISOString(),
    idempotencyKey: `stripe-pass:${options.paymentIntentId ?? options.sessionId}`,
    eventId: options.eventId,
    metadata: {
      provider: "stripe",
      checkout_session_id: options.sessionId,
      email: options.email,
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
  planId: Exclude<PlanId, "weekly">;
  periodStartAt: number | null;
  periodEndAt: number | null;
  payload: unknown;
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  await recordEvent(
    supabase,
    options.eventId,
    "stripe:checkout.completed",
    options.eventCreatedAt,
    options.payload,
  );
  await upsertCustomer(
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
      creem_customer_id: options.customerId,
      mode: BILLING_MODE,
      creem_product_id: PRODUCT_IDS[options.planId],
      plan_key: options.planId,
      status: "active",
      current_period_start_at: periodStart,
      current_period_end_at: periodEnd,
      canceled_at: null,
      last_event_created_at: options.eventCreatedAt,
      market_code: "US",
      variant_key: "base",
      offer_key: `us_base_${options.planId}_v2`,
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
    amount: CREDIT_GRANTS[options.planId],
    source: "subscription",
    expiresAt: periodEnd,
    idempotencyKey: `subscription:${options.subscriptionId}:${options.periodStartAt ?? 0}`,
    eventId: options.eventId,
    subscriptionId: options.subscriptionId,
    metadata: {
      provider: "stripe",
      checkout_event_id: options.eventId,
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
  planId: Exclude<PlanId, "weekly">;
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
  await upsertCustomer(
    supabase,
    options.userId,
    options.customerId,
    null,
  );

  const now = new Date().toISOString();

  const { error: subscriptionError } = await supabase
    .from("billing_subscriptions")
    .upsert(
      {
        creem_subscription_id: options.subscriptionId,
        user_id: options.userId,
        creem_customer_id: options.customerId,
        mode: BILLING_MODE,
        creem_product_id: "stripe-test-unknown",
        plan_key: "monthly",
        status: "canceled",
        canceled_at: now,
        last_event_created_at: options.eventCreatedAt,
        market_code: "US",
        variant_key: "base",
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
