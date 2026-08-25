import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFish } from "@/lib/db";
import { avatarSources } from "@/lib/avatar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let f = null;
  try { f = await getFish(id); } catch {}
  if (!f) return { title: "The Tank" };
  const title = f.alive
    ? `${f.name} is swimming in The Tank, weight $${f.weight}`
    : `${f.name} was eaten by ${f.eatenBy ?? "a bigger fish"}`;
  const description = f.alive
    ? `Rank ${f.rank} of ${f.aliveCount}. Anyone heavier can eat it for $${f.weight + 1}. Feed it to keep it alive.`
    : `It weighed $${f.weight} before it went. Its link stays here forever.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function FishPage({ params }: Props) {
  const { id } = await params;
  let f = null;
  try { f = await getFish(id); } catch {}
  if (!f) notFound();

  const src = avatarSources(f.url, f.image)[0];
  const host = f.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const tint = `hsl(${f.hue} 72% 55%)`;

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(#1a8aa6 0%, #0e5a6f 30%, #083346 70%, #04161f 100%)" }}
      className="flex items-center justify-center p-6">
      <div className="glass w-full max-w-md rounded p-7 text-center">
        <div className="eyebrow">{f.alive ? "alive in the tank" : "eaten"}</div>

        <div className="mx-auto mt-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white"
          style={{ boxShadow: `0 0 0 4px ${tint}`, filter: f.alive ? undefined : "grayscale(1)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src ? <img src={src} alt="" width={72} height={72} /> : <span className="font-pixel text-3xl text-abyss">{f.name[0]}</span>}
        </div>

        <h1 className={`font-pixel mt-4 text-3xl ${f.alive ? "" : "line-through decoration-coral"}`}>{f.name}</h1>
        <a href={f.url} target="_blank" rel="noopener" className="mt-1 block break-all text-sm text-kelp underline">{host}</a>

        <div className="led mt-5 text-6xl">${f.weight}</div>
        <div className="mt-1 text-xs text-foam/60">weight</div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded bg-abyss/50 p-3">
            <div className="font-pixel text-xl text-sand">{f.alive ? `#${f.rank}` : "—"}</div>
            <div className="text-[10px] text-foam/60">rank</div>
          </div>
          <div className="rounded bg-abyss/50 p-3">
            <div className="font-pixel text-xl text-coral">{f.kills ?? 0}</div>
            <div className="text-[10px] text-foam/60">kills</div>
          </div>
          <div className="rounded bg-abyss/50 p-3">
            <div className="font-pixel text-xl text-sand">${f.weight + 1}</div>
            <div className="text-[10px] text-foam/60">eat price</div>
          </div>
        </div>

        <p className="mt-5 text-sm text-foam/75">
          {f.alive
            ? `Anyone with a heavier fish can eat this one for $${f.weight + 1}. Feeding it makes that harder.`
            : `Eaten by ${f.eatenBy ?? "a bigger fish"}. The link stays here for good.`}
        </p>

        <a href="/" className="mt-6 inline-block rounded bg-coral px-5 py-3 font-pixel text-lg text-abyss">
          {f.alive ? "See it in the tank" : "Put a fish in the water"}
        </a>

        <div className="mt-4 text-[11px] text-foam/50">${f.biomass} in the water · {f.aliveCount} fish alive</div>
      </div>
    </main>
  );
}
