import { NextResponse } from "next/server";
import { getState } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(await getState(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
