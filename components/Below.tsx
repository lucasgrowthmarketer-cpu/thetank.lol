"use client";
import type { PublicFish, StateResponse } from "@/lib/types";
import { LogoMark } from "./Logo";
import { avatarSources } from "@/lib/avatar";

function Logo({ f, size = 28 }: { f: PublicFish; size?: number }) {
  const sources = avatarSources(f.url, f.image);
  return (
    <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded bg-white" style={{ width: size, height: size }}>
      {sources.length ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sources[0]} alt="" width={size - 6} height={size - 6}
          onError={(e) => { const el = e.currentTarget; const i = Number(el.dataset.i || 0) + 1; if (i < sources.length) { el.dataset.i = String(i); el.src = sources[i]; } else { el.style.display = "none"; (el.nextSibling as HTMLElement).style.display = "inline"; } }} />
      ) : null}
      <span className="font-pixel text-abyss" style={{ display: sources.length ? "none" : "inline" }}>{f.name[0]}</span>
    </span>
  );
}

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function Below({ state, onFeed, onSpawn, myIds }: { state: StateResponse | null; onFeed: (f: PublicFish) => void; onSpawn: (prefill?: { name: string; url: string }) => void; myIds: string[] }) {
  const fish = state?.fish ?? [];
  const dead = state?.dead ?? [];
  const legends = state?.legends ?? [];
  const apex = fish[0];
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24">
      {/* stats */}
      <section className="grid grid-cols-2 gap-3 py-10 sm:grid-cols-4">
        {[
          ["in the water", `$${state?.biomass ?? 0}`],
          ["fish alive", fish.length],
          ["fish eaten", state?.eaten ?? 0],
          ["apex predator", apex ? apex.name : "vacant"],
        ].map(([k, v]) => (
          <div key={String(k)} className="glass rounded p-4">
            <div className="eyebrow">{k}</div>
            <div className="led mt-1 truncate text-3xl">{v}</div>
          </div>
        ))}
      </section>

      {/* podium */}
      {fish.length > 0 && (
        <section id="podium" className="py-8">
          <div className="eyebrow">the podium</div>
          <h2 className="section-title mt-1">The three heaviest fish alive</h2>
          <p className="mt-2 max-w-2xl text-sm text-foam/70">Top 3 gets the big card, the big logo and the first thing visitors see under the water. Anyone can be pushed off it.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {fish.slice(0, 3).map((f, i) => (
              <a key={f._id} href={f.url} target="_blank" rel="noopener" className={`glass flex flex-col items-center rounded p-5 text-center transition hover:border-sand/60 ${i === 0 ? "sm:order-2 sm:-mt-4 border-sand/40" : i === 1 ? "sm:order-1" : "sm:order-3"}`}>
                <div className="rank text-2xl">{i === 0 ? "#1 apex predator" : `#${i + 1}`}</div>
                <div className="mt-3"><Logo f={f} size={i === 0 ? 96 : 72} /></div>
                <div className="mt-3 font-pixel text-2xl">{f.name}</div>
                <div className="text-xs text-kelp">{f.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>
                <div className="led mt-2 text-3xl">${f.weight}</div>
                <div className="text-[11px] text-foam/50">{f.kills ?? 0} kills · eat price ${f.weight + 1}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* legends */}
      {legends.length > 0 && (
        <section id="legends" className="py-8">
          <div className="eyebrow">legends</div>
          <h2 className="section-title mt-1">The biggest investments, ever</h2>
          <p className="mt-2 max-w-2xl text-sm text-foam/70">Alive or eaten, the five heaviest fish in the history of the tank stay here. Getting eaten costs you the podium, not your place in the legends.</p>
          <div className="glass mt-5 divide-y divide-foam/10 rounded">
            {legends.map((f, i) => (
              <a key={f._id} href={f.url} target="_blank" rel="noopener" className={`flex items-center gap-4 px-4 py-3 hover:bg-foam/5 ${f.alive ? "" : "opacity-70"}`}>
                <span className="rank w-8 text-xl">{i + 1}</span>
                <span className={f.alive ? "" : "grayscale"}><Logo f={f} size={36} /></span>
                <span className="min-w-0 flex-1">
                  <span className={`font-semibold ${f.alive ? "" : "line-through decoration-coral"}`}>{f.name}</span>
                  <span className="ml-2 text-xs text-foam/50">{f.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                  {!f.alive && <span className="ml-2 text-xs text-coral">eaten by {f.eatenBy}</span>}
                </span>
                <span className="led text-2xl">${f.weight}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* leaderboard */}
      <section id="board" className="py-8">
        <div className="eyebrow">the food chain</div>
        <h2 className="section-title mt-1">Every fish, heaviest first</h2>
        <p className="mt-2 max-w-2xl text-sm text-foam/70">Every fish is a permanent row here with a live link, even a $1 one. The heavier you are, the higher you sit and the fewer fish can eat you. "Eat price" is what a heavier rival pays to remove you.</p>
        <div className="glass mt-5 overflow-x-auto rounded">
          <table className="tbl w-full text-sm">
            <thead><tr><th>#</th><th>fish</th><th>weight</th><th>kills</th><th>eat price</th><th>since</th><th></th></tr></thead>
            <tbody>
              {fish.length === 0 && <tr><td colSpan={7} className="text-foam/60">Empty water. The first fish is the apex predator by default.</td></tr>}
              {fish.map((f, i) => (
                <tr key={f._id}>
                  <td className="rank text-lg">{i + 1}</td>
                  <td><a href={f.url} target="_blank" rel="noopener" className="flex items-center gap-3 hover:text-kelp"><Logo f={f} /><span><span className="font-semibold">{f.name}</span>{myIds.includes(f._id) && <span className="ml-2 rounded bg-sand/20 px-1.5 text-[10px] text-sand">yours</span>}<br /><span className="text-xs text-foam/50">{f.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span></span></a></td>
                  <td className="led text-xl">${f.weight}</td>
                  <td className={f.kills ? "text-coral" : "text-foam/40"}>{f.kills ?? 0}</td>
                  <td className="text-foam/70">${f.weight + 1}</td>
                  <td className="text-foam/50">{ago(f.createdAt)}</td>
                  <td className="whitespace-nowrap"><a href={`/fish/${f._id}`} className="mr-2 text-xs text-foam/50 underline hover:text-foam">page</a><button onClick={() => onFeed(f)} className="rounded bg-sand px-3 py-1 text-xs font-semibold text-abyss hover:brightness-110">Feed</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* the eaten */}
      <section id="eaten" className="py-8">
        <div className="eyebrow">the eaten</div>
        <h2 className="section-title mt-1">They were in the tank once</h2>
        <p className="mt-2 max-w-2xl text-sm text-foam/70">Eaten fish stay eaten. Their owners can come back with a bigger one.</p>
        {dead.length === 0 ? (
          <div className="glass mt-5 rounded p-4 text-sm text-foam/60">Nobody has been eaten yet. It will not stay that way.</div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dead.map((f) => (
              <div key={f._id} className="glass rounded p-4 opacity-80">
                <div className="flex items-center gap-3"><span className="grayscale"><Logo f={f} /></span><div><div className="font-semibold line-through decoration-coral">{f.name}</div><div className="text-xs text-foam/50">${f.weight} · eaten by <span className="text-coral">{f.eatenBy}</span> {f.eatenAt ? ago(f.eatenAt) : ""}</div></div></div>
                <button onClick={() => onSpawn({ name: f.name, url: f.url })} className="mt-3 text-xs text-kelp underline">Come back bigger</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* laws */}
      <section id="laws" className="py-8">
        <div className="eyebrow">the laws of the tank</div>
        <h2 className="section-title mt-1">Five rules, no exceptions</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {[
            ["Weight is money", "Your fish weighs exactly what has been paid into it. $1 fish, $1 weight. Nothing else counts."],
            ["Anyone can feed anyone", "Feeding is open. Rivals can fatten you, friends can fatten you, you can fatten a stranger for fun."],
            ["Only the heavier fish eats", "To eat a fish you must weigh strictly more, and you pay its weight plus $1. All of it becomes your weight."],
            ["Eaten stays eaten", "No resurrection. The eaten fish keeps its place in the wall below, with its link. Its owner can buy a new one."],
            ["The tank is public", "The biomass counter, the board and every event are visible to everyone. No accounts, no refunds, no hidden fees."],
          ].map(([t, d]) => (
            <div key={t} className="law"><div className="font-pixel text-xl">{t}</div><div className="mt-1 text-sm text-foam/75">{d}</div></div>
          ))}
        </div>
      </section>

      {/* why */}
      <section id="why" className="py-8">
        <div className="eyebrow">why put a fish in</div>
        <h2 className="section-title mt-1">A dollar buys you three things</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
          <div className="glass rounded p-4"><div className="font-pixel text-lg text-sand">A permanent link</div><p className="mt-1 text-foam/75">Your row on the board stays, with your logo and URL, for as long as you are not eaten. Even the eaten keep their link.</p></div>
          <div className="glass rounded p-4"><div className="font-pixel text-lg text-sand">A reason to be shared</div><p className="mt-1 text-foam/75">Every kill is an event. When your fish eats someone, or gets eaten, people post about it. That is the whole point.</p></div>
          <div className="glass rounded p-4"><div className="font-pixel text-lg text-sand">A story you can tell</div><p className="mt-1 text-foam/75">"We were the apex predator for six hours." Screenshots are free.</p></div>
        </div>
        <button onClick={() => onSpawn()} className="mt-8 rounded bg-coral px-6 py-3 font-pixel text-xl text-abyss hover:brightness-110">+ Put your fish in for $1</button>
      </section>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-foam/10 pt-6 text-xs text-foam/50">
        <span className="flex items-center gap-2"><LogoMark size={20} /> The Tank. A paid aquarium, built in one evening.</span>
        <span>Links are checked by a human. Fish that break the law get removed without refund.</span>
      </footer>
    </div>
  );
}
