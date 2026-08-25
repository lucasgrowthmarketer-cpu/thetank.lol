import { NextResponse } from "next/server";
import { db, oid } from "@/lib/db";
export const dynamic = "force-dynamic";
// Moderation: DELETE /api/admin?key=ADMIN_KEY&fish=<id>
export async function DELETE(req: Request) {
  const u = new URL(req.url);
  if (!process.env.ADMIN_KEY || u.searchParams.get("key") !== process.env.ADMIN_KEY)
    return NextResponse.json({ error: "nope" }, { status: 401 });
  const id = oid(u.searchParams.get("fish") || "");
  if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const d = await db();
  await d.collection("fish").updateOne({ _id: id }, { $set: { alive: false, eatenBy: "the moderator" } });
  return NextResponse.json({ ok: true });
}
