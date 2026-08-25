import { ImageResponse } from "next/og";
import { getState } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "The Tank";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  let biomass = 0, count = 0, eaten = 0;
  try { const s = await getState(); biomass = s.biomass; count = s.fish.length; eaten = s.eaten; } catch {}
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(#0e5a6f, #04161f)", color: "#e6f7f4", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, opacity: .8 }}>
          <span>THE TANK</span><span>{`${count} fish alive · ${eaten} eaten`}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 36, opacity: .8 }}>total biomass</div>
          <div style={{ fontSize: 180, fontWeight: 700, color: "#ffb347", lineHeight: 1 }}>{`$${biomass}`}</div>
        </div>
        <div style={{ fontSize: 34 }}>$1 buys you a fish. Bigger fish eat smaller fish.</div>
      </div>
    ),
    size
  );
}
