import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import {
  extendSubscriptionAccess,
  getSupabaseAdminClient,
  grantSubscriptionAccess,
  grantWeeklyAccessPass,
  resolveUserByEmail,
  resolveUserById,
  revokeSubscriptionAccess,
} from "@/lib/membership";

function isSubscriptionPlan(plan: string | undefined): plan is "monthly" | "annual" {
  return plan === "monthly" || plan === "annual";
}

function stripeIdFrom(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function customerIdFrom(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function getUserIdForCustomer(customerId: string | null) {
  if (!customerId) {
    return null;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("billing_customers")
    .select("user_id,email")
    .eq("creem_customer_id", customerId)
    .eq("mode", "test")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not find the billing customer: ${error.message}`);
  }

  return data ?? null;
}

async function getUserIdForSubscription(subscriptionId: string | null) {
  if (!subscriptionId) {
    return null;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("user_id")
    .eq("creem_subscription_id", subscriptionId)
    .eq("mode", "test")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not find the billing subscription: ${error.message}`);
  }

  return data?.user_id ?? null;
}

export async function POST(req: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      if (!getSupabaseAdminClient()) {
        return NextResponse.json(
          { error: "Membership automation is not configured." },
          { status: 503 },
        );
      }

      const email = session.customer_details?.email ?? null;
      const userId = await resolveUserById(session.metadata?.userId)
        ?? await resolveUserByEmail(email);

      if (!userId) {
        console.warn("Stripe checkout completed without a matching account", {
          sessionId: session.id,
          plan: session.metadata?.plan,
        });
        break;
      }

      if (session.mode === "payment") {
        await grantWeeklyAccessPass({
          userId,
          eventId: event.id,
          eventCreatedAt: event.created,
          sessionId: session.id,
          paymentIntentId: stripeIdFrom(session.payment_intent),
          email,
          payload: event.data.object,
        });
        break;
      }

      const subscriptionId = stripeIdFrom(session.subscription);
      const customerId = customerIdFrom(session.customer);

      if (
        !isSubscriptionPlan(session.metadata?.plan) ||
        !subscriptionId ||
        !customerId
      ) {
        console.error("Stripe checkout completed with incomplete subscription data", {
          sessionId: session.id,
          plan: session.metadata?.plan,
        });
        break;
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const period = subscription.items.data[0];

      await grantSubscriptionAccess({
        userId,
        eventId: event.id,
        eventCreatedAt: event.created,
        email,
        customerId,
        subscriptionId,
        planId: session.metadata.plan,
        periodStartAt: period?.current_period_start ?? null,
        periodEndAt: period?.current_period_end ?? null,
        payload: event.data.object,
      });
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const customerId = customerIdFrom(invoice.customer);
      const subscriptionId = invoice.parent?.subscription_details
        ? stripeIdFrom(invoice.parent.subscription_details.subscription)
        : null;
      const subscriptionUserId = await getUserIdForSubscription(subscriptionId);
      const customer = subscriptionUserId
        ? { user_id: subscriptionUserId, email: null }
        : await getUserIdForCustomer(customerId);

      if (!customer?.user_id || !subscriptionId || !customerId) {
        console.warn("Stripe invoice succeeded without a matching subscription", {
          invoiceId: invoice.id,
          subscriptionId,
        });
        break;
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const plan = subscription.metadata?.plan;
      const period = subscription.items.data[0];

      if (!isSubscriptionPlan(plan)) {
        console.error("Stripe invoice succeeded with an unknown plan", {
          invoiceId: invoice.id,
          plan,
        });
        break;
      }

      await extendSubscriptionAccess({
        userId: customer.user_id,
        eventId: event.id,
        eventCreatedAt: event.created,
        email: customer.email ?? null,
        customerId,
        subscriptionId,
        planId: plan,
        periodStartAt: period?.current_period_start ?? invoice.period_start ?? null,
        periodEndAt: period?.current_period_end ?? invoice.period_end ?? null,
        payload: event.data.object,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = customerIdFrom(subscription.customer);
      const subscriptionUserId = await getUserIdForSubscription(subscription.id);
      const customer = subscriptionUserId
        ? { user_id: subscriptionUserId, email: null }
        : await getUserIdForCustomer(customerId);

      if (!customer?.user_id || !customerId) {
        console.warn("Stripe subscription deleted without a matching customer", {
          subscriptionId: subscription.id,
        });
        break;
      }

      await revokeSubscriptionAccess({
        userId: customer.user_id,
        eventId: event.id,
        eventCreatedAt: event.created,
        customerId,
        subscriptionId: subscription.id,
        payload: event.data.object,
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
