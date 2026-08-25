import { ImageResponse } from "next/og";
import { getState } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "The Tank. $1 buys you a fish. Bigger fish eat smaller fish.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#04161f";
const CORAL = "#ff6a3d";
const SAND = "#d9b46f";
const FOAM = "#e6f7f4";

/* 14x9 pixel fish drawn with divs (Satori has no SVG path support).
   1 body, 2 tail, 3 eye, 4 belly, 5 dorsal */
const MASK = [
  "00000000550000",
  "00000111111000",
  "00011111111100",
  "20111111111310",
  "22111444411111",
  "22111444411111",
  "20111444411110",
  "00011111111100",
  "00000111100000",
];

function PixelFish({ px, hue }: { px: number; hue: number }) {
  const color = (v: string) =>
    v === "3" ? NAVY
    : v === "2" || v === "5" ? `hsl(${hue} 70% 40%)`
    : v === "4" ? `hsl(${hue} 60% 74%)`
    : `hsl(${hue} 72% 55%)`;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {MASK.map((row, r) => (
        <div key={r} style={{ display: "flex" }}>
          {row.split("").map((v, c) => (
            <div key={c} style={{ width: px, height: px, background: v === "0" ? "transparent" : color(v) }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default async function OG() {
  let biomass = 0, count = 0, eaten = 0, top = "";
  try {
    const s = await getState();
    biomass = s.biomass; count = s.fish.length; eaten = s.eaten;
    const first = s.fish[0] as { name?: string } | undefined;
    top = first?.name ?? "";
  } catch {}

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: "linear-gradient(160deg, #1a8aa6 0%, #0e5a6f 34%, #083346 68%, #04161f 100%)",
        color: FOAM, fontFamily: "sans-serif", position: "relative",
      }}>
        {/* decorative fish */}
        <div style={{ display: "flex", position: "absolute", top: 96, right: 74, opacity: 0.95 }}>
          <PixelFish px={15} hue={18} />
        </div>
        <div style={{ display: "flex", position: "absolute", top: 322, right: 296, opacity: 0.5 }}>
          <PixelFish px={7} hue={165} />
        </div>
        <div style={{ display: "flex", position: "absolute", top: 402, right: 120, opacity: 0.35 }}>
          <PixelFish px={5} hue={280} />
        </div>

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "56px 64px 0" }}>
          <div style={{ display: "flex" }}><PixelFish px={5} hue={18} /></div>
          <div style={{ display: "flex", fontSize: 34, letterSpacing: 6, fontWeight: 700 }}>THE TANK</div>
        </div>

        {/* body */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", padding: "0 64px" }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 5, color: SAND, textTransform: "uppercase" }}>
            total biomass
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 26 }}>
            <div style={{ display: "flex", fontSize: 190, fontWeight: 800, color: "#ffb347", lineHeight: 1 }}>
              {`$${biomass}`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", paddingBottom: 26, fontSize: 26, opacity: 0.85 }}>
              <div style={{ display: "flex" }}>{`${count} alive`}</div>
              <div style={{ display: "flex", color: CORAL }}>{`${eaten} eaten`}</div>
            </div>
          </div>
          {top ? (
            <div style={{ display: "flex", fontSize: 26, marginTop: 14, color: SAND }}>
              {`apex predator: ${top}`}
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 26, marginTop: 14, color: SAND }}>the water is empty</div>
          )}
        </div>

        {/* footer */}
        <div style={{ display: "flex", flexDirection: "column", padding: "0 64px 52px" }}>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 700 }}>
            $1 buys you a fish with your logo.
          </div>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: CORAL }}>
            Bigger fish eat smaller fish.
          </div>
          <div style={{ display: "flex", fontSize: 26, marginTop: 16, opacity: 0.7 }}>thetank.lol</div>
        </div>

        {/* sand strip */}
        <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0, width: 1200, height: 14, background: SAND, opacity: 0.85 }} />
      </div>
    ),
    size
  );
}
