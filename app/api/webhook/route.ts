import { NextResponse } from "next/server";
import Stripe from "stripe";
import { applyAction } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) return NextResponse.json({ error: "stripe not configured" }, { status: 500 });
  const stripe = new Stripe(key);
  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status === "paid") {
      const amount = Math.round((s.amount_total || 0) / 100);
      try {
        await applyAction(s.id, (s.metadata || {}) as Record<string, string>, amount);
      } catch (e) {
        console.error("applyAction failed", e);
      }
    }
  }
  return NextResponse.json({ received: true });
}
