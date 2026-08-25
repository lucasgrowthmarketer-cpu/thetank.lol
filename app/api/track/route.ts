import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/* One row per page view. No cookies, no third party: the visitor id is a random
   string the browser keeps in localStorage, only used to separate new from returning. */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
    const d = await db();
    await d.collection("visits").insertOne({
      at: new Date().toISOString(),
      source: clean(b.source, 40) || "direct",
      referrer: clean(b.referrer, 200),
      visitor: clean(b.visitor, 40),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
