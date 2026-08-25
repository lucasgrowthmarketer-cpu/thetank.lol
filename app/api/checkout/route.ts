import { NextResponse } from "next/server";
import Stripe from "stripe";
import { randomBytes } from "crypto";
import { applyAction, cleanName, cleanUrl, db, oid } from "@/lib/db";
import { MIN_FEED, MIN_SPAWN } from "@/lib/types";

export const dynamic = "force-dynamic";
const site = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const meta: Record<string, string> = { action: body.action };
    let amount = 0;
    let label = "";

    if (body.action === "spawn") {
      meta.name = cleanName(body.name || "");
      meta.url = cleanUrl(body.url || "");
      meta.ownerKey = randomBytes(12).toString("hex");
      amount = Math.max(MIN_SPAWN, Math.floor(Number(body.amount) || MIN_SPAWN));
      label = `New fish: ${meta.name}`;
    } else if (body.action === "feed") {
      if (!oid(body.fishId || "")) throw new Error("bad fish id");
      meta.fishId = body.fishId;
      amount = Math.max(MIN_FEED, Math.floor(Number(body.amount) || MIN_FEED));
      label = "Feed a fish";
    } else if (body.action === "eat") {
      const d = await db();
      const f = await d.collection("fish").findOne({ _id: oid(body.fishId)!, alive: true });
      const t = await d.collection("fish").findOne({ _id: oid(body.targetId)!, alive: true });
      if (!f || !t) throw new Error("fish not found");
      if (f.ownerKey !== body.ownerKey) throw new Error("That is not your fish. Open the tank from the browser you bought it in.");
      if (!(f.weight > t.weight)) throw new Error(`${f.name} is too small to eat ${t.name}. Feed it first.`);
      meta.fishId = body.fishId; meta.targetId = body.targetId; meta.ownerKey = body.ownerKey;
      amount = t.weight + 1;
      label = `${f.name} eats ${t.name}`;
    } else throw new Error("unknown action");

    if (amount > 5000) throw new Error("max $5000 per action");

    // DEMO mode: no Stripe key, apply directly so the tank can be tested end to end.
    if (!process.env.STRIPE_SECRET_KEY) {
      const r = await applyAction("demo_" + randomBytes(8).toString("hex"), meta, amount);
      return NextResponse.json({ demo: true, ownerKey: meta.ownerKey, ...r });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price_data: { currency: "usd", unit_amount: amount * 100, product_data: { name: label } }, quantity: 1 }],
      metadata: meta,
      success_url: `${site()}/?paid=1${meta.ownerKey ? `&key=${meta.ownerKey}` : ""}`,
      cancel_url: `${site()}/`,
    });
    return NextResponse.json({ url: session.url, ownerKey: meta.ownerKey });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
