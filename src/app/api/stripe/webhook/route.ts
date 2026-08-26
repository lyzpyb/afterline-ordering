import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";

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
      console.log("Stripe checkout completed", {
        sessionId: session.id,
        plan: session.metadata?.plan,
        company: session.metadata?.company,
      });
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      console.log("Stripe invoice payment succeeded", {
        invoiceId: invoice.id,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      console.log("Stripe subscription deleted", {
        subscriptionId: subscription.id,
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
