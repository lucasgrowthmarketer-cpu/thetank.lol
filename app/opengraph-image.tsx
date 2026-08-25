import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
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

const font = (f: string) => readFileSync(join(process.cwd(), "public", "og-fonts", f));

/* Exact same 8x6 mark as the favicon and the PDF header.
   Satori has no SVG path support, so it is rebuilt with divs. */
const MARK = [
  "00111100",
  "01111110",
  "11111111",
  "11111111",
  "01111110",
  "00111100",
];

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
        color: FOAM, fontFamily: "Grotesk", position: "relative",
      }}>
        {/* school of fish, same mark, different depths */}
        <div style={{ display: "flex", position: "absolute", top: 92, right: 78 }}>
          <Mark px={26} />
        </div>
        <div style={{ display: "flex", position: "absolute", top: 330, right: 300, opacity: 0.55 }}>
          <Mark px={13} body="#3fd98a" tail="#0f6b4a" />
        </div>
        <div style={{ display: "flex", position: "absolute", top: 424, right: 132, opacity: 0.4 }}>
          <Mark px={9} body="#8ab6ff" tail="#3d5fa8" />
        </div>

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "50px 64px 0" }}>
          <Mark px={8} />
          <div style={{ display: "flex", fontFamily: "Pixel", fontSize: 40, letterSpacing: 3 }}>THE TANK</div>
        </div>

        {/* body */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", padding: "0 64px" }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: SAND, fontWeight: 700 }}>
            TOTAL BIOMASS
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 28 }}>
            <div style={{ display: "flex", fontFamily: "Pixel", fontSize: 176, color: "#ffb347", lineHeight: 1 }}>
              {`$${biomass}`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", paddingBottom: 30, fontSize: 26 }}>
              <div style={{ display: "flex", opacity: 0.85 }}>{`${count} alive`}</div>
              <div style={{ display: "flex", color: CORAL }}>{`${eaten} eaten`}</div>
            </div>
          </div>
          <div style={{ display: "flex", fontFamily: "Pixel", fontSize: 30, marginTop: 16, color: SAND }}>
            {top ? `apex predator: ${top}` : "the water is empty"}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", flexDirection: "column", padding: "0 64px 50px" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
            $1 buys you a fish with your logo.
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: CORAL }}>
            Bigger fish eat smaller fish.
          </div>
          <div style={{ display: "flex", fontFamily: "Pixel", fontSize: 28, marginTop: 18, color: FOAM, opacity: 0.75 }}>
            thetank.lol
          </div>
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
