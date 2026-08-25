import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { getFish } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "A fish in The Tank";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#04161f";
const CORAL = "#ff6a3d";
const SAND = "#d9b46f";
const FOAM = "#e6f7f4";

const font = (f: string) => readFileSync(join(process.cwd(), "public", "og-fonts", f));

const MARK = ["00111100", "01111110", "11111111", "11111111", "01111110", "00111100"];

function Mark({ px, body = CORAL, tail = SAND }: { px: number; body?: string; tail?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {MARK.map((row, y) => (
        <div key={y} style={{ display: "flex" }}>
          {row.split("").map((v, x) => {
            const isTail = x === 0 && y >= 1 && y <= 4;
            const isEye = x === 5 && y === 2;
            const bg = isTail ? tail : isEye ? NAVY : v === "1" ? body : "transparent";
            return <div key={x} style={{ width: px, height: px, background: bg }} />;
          })}
        </div>
      ))}
    </div>
  );
}

export default async function OG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let f = null;
  try { f = await getFish(id); } catch {}

  if (!f) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: NAVY, color: FOAM, fontSize: 48, fontFamily: "Pixel" }}>THE TANK</div>,
      { ...size, fonts: [{ name: "Pixel", data: font("pixelify-400.woff"), weight: 400, style: "normal" }] }
    );
  }

  const hue = f.hue ?? 18;
  const alive = f.alive;

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: "linear-gradient(160deg, #1a8aa6 0%, #0e5a6f 34%, #083346 68%, #04161f 100%)",
        color: FOAM, fontFamily: "Grotesk", position: "relative",
      }}>
        <div style={{ display: "flex", position: "absolute", top: 78, right: 80, opacity: alive ? 1 : 0.35 }}>
          <Mark px={30} body={`hsl(${hue} 72% 55%)`} tail={`hsl(${hue} 70% 40%)`} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "50px 64px 0" }}>
          <Mark px={7} />
          <div style={{ display: "flex", fontFamily: "Pixel", fontSize: 32, letterSpacing: 3 }}>THE TANK</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", padding: "0 64px" }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 5, color: alive ? SAND : CORAL, fontWeight: 700 }}>
            {alive ? `RANK ${f.rank} OF ${f.aliveCount}` : "EATEN"}
          </div>
          <div style={{ display: "flex", fontFamily: "Pixel", fontSize: 84, marginTop: 8, lineHeight: 1.1 }}>
            {f.name.slice(0, 24)}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginTop: 10 }}>
            <div style={{ display: "flex", fontFamily: "Pixel", fontSize: 150, color: "#ffb347", lineHeight: 1 }}>
              {`$${f.weight}`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", paddingBottom: 22, fontSize: 25 }}>
              <div style={{ display: "flex", opacity: 0.85 }}>weight</div>
              <div style={{ display: "flex", color: CORAL }}>{alive ? `eat price $${f.weight + 1}` : `eaten by ${(f.eatenBy || "").slice(0, 18)}`}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "0 64px 50px" }}>
          <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>
            {alive ? "Anyone heavier can delete this fish." : "Its link stays here for good."}
          </div>
          <div style={{ display: "flex", fontFamily: "Pixel", fontSize: 26, marginTop: 14, opacity: 0.75 }}>thetank.lol</div>
        </div>

        <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0, width: 1200, height: 14, background: SAND, opacity: 0.85 }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pixel", data: font("pixelify-400.woff"), weight: 400, style: "normal" },
        { name: "Grotesk", data: font("grotesk-400.woff"), weight: 400, style: "normal" },
        { name: "Grotesk", data: font("grotesk-700.woff"), weight: 700, style: "normal" },
      ],
    }
  );
}
