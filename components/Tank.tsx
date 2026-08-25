"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { PublicFish, StateResponse } from "@/lib/types";
import { sizeFor } from "@/lib/types";
import Below from "./Below";
import { Wordmark } from "./Logo";

/* ---------- simulation ---------- */
type Sim = PublicFish & { x: number; y: number; vx: number; dir: 1 | -1; img?: HTMLImageElement; dash?: { x: number; y: number; t0: number } };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Bubble = { x: number; y: number; r: number; v: number };
type Banner = { text: string; t0: number };

// 14x9 pixel mask, fish facing right. 1 body, 2 tail, 3 eye, 4 belly (lighter), 5 dorsal fin
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

/* logo loading: DuckDuckGo first, Google fallback, then the initial letter.
   No crossOrigin flag: a tainted canvas is fine, we never export it. */
const imgCache = new Map<string, HTMLImageElement>();
function logoImg(url: string) {
  let host = "";
  try { host = new URL(url).hostname; } catch { return undefined; }
  let im = imgCache.get(host);
  if (im) return im;
  im = new Image();
  const sources = [`https://icons.duckduckgo.com/ip3/${host}.ico`, `https://www.google.com/s2/favicons?domain=${host}&sz=128`];
  let i = 0;
  im.onerror = () => { i += 1; if (i < sources.length) im!.src = sources[i]; };
  im.src = sources[0];
  imgCache.set(host, im);
  return im;
}

function drawFish(ctx: CanvasRenderingContext2D, f: Sim, t: number, hover: boolean) {
  const s = sizeFor(f.weight);
  const p = s / 14;
  const wob = Math.sin(t * 0.004 + f.seed * 40) * p * 0.6;
  const body = `hsl(${f.hue} 72% ${hover ? 64 : 54}%)`;
  const belly = `hsl(${f.hue} 60% ${hover ? 80 : 72}%)`;
  const tail = `hsl(${f.hue} 70% 40%)`;
  const outline = `hsl(${f.hue} 60% 22%)`;
  ctx.save();
  ctx.translate(f.x, f.y + wob);
  ctx.scale(f.dir, 1);
  const flap = Math.round(Math.sin(t * 0.012 + f.seed * 10) * 0.8);
  for (const pass of [0, 1]) {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 14; c++) {
      const v = MASK[r][c];
      if (v === "0") continue;
      const fy = v === "2" ? flap : 0;
      const x = (c - 7) * p, y = (r - 4.5 + fy) * p;
      if (pass === 0) { ctx.fillStyle = outline; ctx.fillRect(x - p * 0.35, y - p * 0.35, p * 1.7, p * 1.7); continue; }
      ctx.fillStyle = v === "3" ? "#04161f" : v === "2" ? tail : v === "4" ? belly : v === "5" ? tail : body;
      ctx.fillRect(x, y, p + 0.6, p + 0.6);
    }
  }
  ctx.restore();
  // logo disc on the belly, never mirrored
  const im = f.img;
  const d = p * 5.2;
  const cx = f.x - f.dir * p * 0.8, cy = f.y + wob + p * 0.6;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.clip();
  if (im && im.complete && im.naturalWidth > 0) {
    try { ctx.drawImage(im, cx - d / 2 + 2, cy - d / 2 + 2, d - 4, d - 4); } catch {}
  } else {
    ctx.fillStyle = "#04161f"; ctx.font = `bold ${d * 0.6}px "Pixelify Sans", monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(f.name[0]?.toUpperCase() || "?", cx, cy + 1);
  }
  ctx.restore();
  // label
  ctx.font = `${Math.max(11, Math.min(15, p * 1.6))}px "Pixelify Sans", monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const label = `${f.name}  $${f.weight}`;
  const w = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(4,22,31,.7)";
  ctx.fillRect(f.x - w / 2 - 5, f.y + wob + s / 2 + 4, w + 10, 16);
  ctx.fillStyle = hover ? "#ffb347" : "#e6f7f4";
  ctx.fillText(label, f.x, f.y + wob + s / 2 + 16);
}

/* ---------- component ---------- */
export default function Tank() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Map<string, Sim>>(new Map());
  const partRef = useRef<Particle[]>([]);
  const bubRef = useRef<Bubble[]>([]);
  const bannerRef = useRef<Banner | null>(null);
  const hoverRef = useRef<string | null>(null);
  const [state, setState] = useState<StateResponse | null>(null);
  const [selected, setSelected] = useState<PublicFish | null>(null);
  const [mode, setMode] = useState<"idle" | "spawn" | "eat">("idle");
  const [prefill, setPrefill] = useState<{ name: string; url: string } | undefined>();
  const [myKeys, setMyKeys] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 5000); };

  useEffect(() => {
    try { setMyKeys(JSON.parse(localStorage.getItem("tank_keys") || "{}")); } catch {}
    const u = new URL(window.location.href);
    if (u.searchParams.get("paid")) {
      const key = u.searchParams.get("key");
      if (key) localStorage.setItem("tank_pending_key", key);
      say("Payment received. Your fish is entering the tank.");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      const s: StateResponse = await r.json(); if (!r.ok || !Array.isArray(s.fish)) { console.warn("state unavailable", s); return; }
      const pending = localStorage.getItem("tank_pending_key");
      if (pending && s.fish.length) {
        const keys = JSON.parse(localStorage.getItem("tank_keys") || "{}");
        const newest = [...s.fish].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (newest && !keys[newest._id]) { keys[newest._id] = pending; localStorage.setItem("tank_keys", JSON.stringify(keys)); setMyKeys(keys); localStorage.removeItem("tank_pending_key"); }
      }
      setState(s);
    } catch {}
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, [load]);

  // sync simulation with server state: new fish appear, eaten fish get a dash + burst
  useEffect(() => {
    if (!state) return;
    const sim = simRef.current;
    const cv = canvasRef.current;
    const W = cv?.clientWidth || 1200, H = cv?.clientHeight || 700;
    const seen = new Set<string>();
    for (const f of state.fish) {
      seen.add(f._id);
      const ex = sim.get(f._id);
      if (ex) { ex.weight = f.weight; ex.name = f.name; ex.url = f.url; continue; }
      const dir = Math.random() < 0.5 ? 1 : -1;
      sim.set(f._id, { ...f, x: 100 + Math.random() * (W - 200), y: 110 + Math.random() * (H - 220), vx: dir * (0.5 + Math.random() * 0.6), dir, img: logoImg(f.url) });
    }
    for (const [id, f] of sim) {
      if (seen.has(id)) continue;
      const killer = state.dead.find((d) => d._id === id);
      const eater = killer?.eatenById ? sim.get(killer.eatenById) : undefined;
      const burst = () => {
        const n = 60 + Math.min(200, f.weight * 6);
        for (let i = 0; i < n; i++) partRef.current.push({ x: f.x, y: f.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.7) * 5, life: 70 + Math.random() * 70, color: `hsl(${f.hue} 70% ${45 + Math.random() * 30}%)` });
        sim.delete(id);
      };
      if (eater) {
        eater.dash = { x: f.x, y: f.y, t0: performance.now() };
        bannerRef.current = { text: `${eater.name} ATE ${f.name}`, t0: performance.now() + 500 };
        setTimeout(burst, 520);
      } else { burst(); }
      if (selected?._id === id) { setSelected(null); setMode("idle"); }
    }
  }, [state, selected]);

  // render loop
  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    window.addEventListener("resize", resize);
    const frame = (t: number) => {
      const W = cv.clientWidth, H = cv.clientHeight;
      ctx.clearRect(0, 0, W, H);
      // light rays
      ctx.save(); ctx.globalAlpha = 0.07;
      for (let i = 0; i < 5; i++) { const x = (W / 5) * i + Math.sin(t * 0.0003 + i) * 40; ctx.fillStyle = "#bfefff"; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 90, 0); ctx.lineTo(x + 260, H); ctx.lineTo(x + 40, H); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      // kelp
      for (let i = 0; i < 7; i++) {
        const bx = (W / 7) * i + 30, h = 90 + (i * 37) % 80;
        ctx.fillStyle = i % 2 ? "#0f6b4a" : "#127a52";
        for (let y = 0; y < h; y += 8) { const sway = Math.sin(t * 0.002 + y * 0.05 + i) * (y / h) * 10; ctx.fillRect(bx + sway, H - 26 - y, 8, 8); }
      }
      // sand
      ctx.fillStyle = "#4a3d23"; ctx.fillRect(0, H - 26, W, 26);
      ctx.fillStyle = "#d9b46f"; for (let x = 0; x < W; x += 16) ctx.fillRect(x, H - 26 + ((x / 16) % 3) * 3, 10, 5);
      // bubbles
      if (!reduced && Math.random() < 0.06) bubRef.current.push({ x: Math.random() * W, y: H - 30, r: 2 + Math.random() * 3, v: 0.4 + Math.random() * 0.8 });
      ctx.strokeStyle = "rgba(230,247,244,.45)"; ctx.lineWidth = 1;
      for (let i = bubRef.current.length - 1; i >= 0; i--) { const b = bubRef.current[i]; b.y -= b.v; b.x += Math.sin(t * 0.003 + b.y * 0.05) * 0.3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); if (b.y < 0) bubRef.current.splice(i, 1); }
      // fish, heaviest drawn last
      const list = [...simRef.current.values()].sort((a, b) => a.weight - b.weight);
      for (const f of list) {
        const s = sizeFor(f.weight);
        if (f.dash) {
          const k = Math.min(1, (t - f.dash.t0) / 500);
          f.x += (f.dash.x - f.x) * k * 0.6; f.y += (f.dash.y - f.y) * k * 0.6;
          f.dir = f.dash.x >= f.x ? 1 : -1;
          if (k >= 1) f.dash = undefined;
        } else {
          const speed = reduced ? 0 : Math.max(0.15, 1.15 - s / 260);
          f.x += f.vx * speed * 1.6;
          f.y += Math.sin(t * 0.0015 + f.seed * 20) * 0.25;
          if (Math.random() < 0.002) f.vx = -f.vx;
          if (f.x < s / 2 + 8) { f.x = s / 2 + 8; f.vx = Math.abs(f.vx); }
          if (f.x > W - s / 2 - 8) { f.x = W - s / 2 - 8; f.vx = -Math.abs(f.vx); }
          if (f.y < 90) f.y = 90; if (f.y > H - 60) f.y = H - 60;
          f.dir = f.vx >= 0 ? 1 : -1;
        }
        drawFish(ctx, f, t, hoverRef.current === f._id || selected?._id === f._id);
      }
      // pixel clouds
      const ps = partRef.current;
      for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.x += p.vx; p.y += p.vy; p.vy -= 0.03; p.vx *= 0.98; p.life -= 1; ctx.globalAlpha = Math.max(0, p.life / 100); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4, 4); if (p.life <= 0) ps.splice(i, 1); }
      ctx.globalAlpha = 1;
      // kill banner
      const b = bannerRef.current;
      if (b && t > b.t0) {
        const k = (t - b.t0) / 2600; if (k > 1) bannerRef.current = null; else {
          ctx.globalAlpha = k < 0.1 ? k * 10 : k > 0.8 ? (1 - k) * 5 : 1;
          ctx.font = `bold ${Math.min(64, W / 12)}px "Pixelify Sans", monospace`; ctx.textAlign = "center";
          ctx.fillStyle = "#04161f"; ctx.fillText(b.text, W / 2 + 4, H / 2 + 4);
          ctx.fillStyle = "#ff6a3d"; ctx.fillText(b.text, W / 2, H / 2);
          ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [selected]);

  const hit = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best: Sim | null = null;
    for (const f of simRef.current.values()) { const s = sizeFor(f.weight); if (Math.abs(f.x - x) < s / 2 + 6 && Math.abs(f.y - y) < s / 3 + 10) if (!best || f.weight > best.weight) best = f; }
    return best;
  };
  const onMove = (e: React.MouseEvent) => { const f = hit(e); hoverRef.current = f?._id ?? null; canvasRef.current!.style.cursor = f ? "pointer" : "default"; };
  const onClick = (e: React.MouseEvent) => {
    const f = hit(e);
    if (mode === "eat" && selected && f && f._id !== selected._id) { void act({ action: "eat", fishId: selected._id, targetId: f._id, ownerKey: myKeys[selected._id] }); return; }
    setSelected(f ?? null); if (mode !== "spawn") setMode("idle");
  };

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) { say(j.error || "Something went wrong."); return; }
      if (j.url) { if (j.ownerKey) localStorage.setItem("tank_pending_key", j.ownerKey); window.location.href = j.url; return; }
      if (j.fishId && j.ownerKey) { const keys = { ...myKeys, [j.fishId]: j.ownerKey }; setMyKeys(keys); localStorage.setItem("tank_keys", JSON.stringify(keys)); }
      say(j.ate === false ? "Not enough to eat: your money fed your fish instead." : "Done (demo mode, nothing charged).");
      setMode("idle"); setSelected(null);
      await load();
    } finally { setBusy(false); }
  };

  const openSpawn = (pf?: { name: string; url: string }) => { setPrefill(pf); setMode("spawn"); setSelected(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openFeed = (f: PublicFish) => { setSelected(f); setMode("idle"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const mine = selected ? !!myKeys[selected._id] : false;
  const prey = selected ? (state?.fish.filter((f) => f._id !== selected._id && f.weight < selected.weight).length ?? 0) : 0;

  return (
    <main>
      {/* ===== the tank ===== */}
      <section className="relative h-[100svh] w-full overflow-hidden" style={{ background: "linear-gradient(#1a8aa6 0%, #0e5a6f 30%, #083346 70%, #04161f 100%)" }}>
        <div className="caustics" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" onMouseMove={onMove} onClick={onClick} aria-label="Aquarium of paid fish" />

        <header className="absolute left-0 right-0 top-0 flex items-start justify-between p-4">
          <div className="max-w-[360px] select-none">
            <Wordmark />
            <p className="mt-2 text-sm text-foam/85">$1 buys you a fish with your logo. Feed it to grow. Get heavier than a rival and eat them. Every dollar is public.</p>
            <nav className="mt-2 hidden gap-3 text-xs text-foam/60 sm:flex">
              <a href="#board" className="hover:text-foam">board</a><a href="#eaten" className="hover:text-foam">the eaten</a><a href="#laws" className="hover:text-foam">laws</a>
            </nav>
          </div>
          <div className="sign px-4 py-2 text-right select-none">
            <div className="text-[10px] uppercase tracking-widest text-foam/60">total biomass</div>
            <div className="led text-4xl leading-none sm:text-5xl">${state?.biomass ?? 0}</div>
            <div className="mt-1 text-[11px] text-foam/60">{state?.fish.length ?? 0} alive · {state?.eaten ?? 0} eaten{state?.demo ? " · DEMO" : ""}</div>
          </div>
        </header>

        <aside className="glass absolute bottom-4 left-4 hidden w-64 rounded p-3 text-xs sm:block">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-foam/60">latest in the water</div>
          {state?.events.length ? state.events.slice(0, 6).map((e) => (
            <div key={e._id} className="ticker-item flex justify-between gap-2 py-0.5">
              <span className={e.type === "eat" ? "text-coral" : e.type === "spawn" ? "text-kelp" : "text-foam/90"}>{e.text}</span>
              <span className="font-pixel text-sand">${e.amount}</span>
            </div>
          )) : <div className="text-foam/70">Empty water. The first fish gets the whole tank to itself.</div>}
        </aside>

        {mode !== "spawn" && (
          <button onClick={() => openSpawn()} className="absolute bottom-4 right-4 rounded bg-coral px-5 py-3 font-pixel text-lg text-abyss shadow-lg transition hover:brightness-110">
            + Put your fish in for $1
          </button>
        )}

        {mode === "spawn" && <SpawnForm key={prefill?.url || "new"} busy={busy} prefill={prefill} onCancel={() => setMode("idle")} onSubmit={(name, url, amount) => act({ action: "spawn", name, url, amount })} />}

        {selected && mode !== "spawn" && (
          <div className="glass absolute bottom-20 right-4 w-[min(92vw,320px)] rounded p-4 sm:bottom-4 sm:right-64">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-pixel text-xl">{selected.name}</div>
                <a href={selected.url} target="_blank" rel="noopener" className="break-all text-xs text-kelp underline">{selected.url.replace(/^https?:\/\//, "")}</a>
              </div>
              <div className="text-right"><div className="led text-2xl">${selected.weight}</div><div className="text-[10px] text-foam/60">weight</div></div>
            </div>
            {mine && <div className="mt-2 text-[11px] text-sand">This one is yours. It can eat {prey} fish right now.</div>}
            {mode === "eat" ? (
              <div className="mt-3 text-sm text-coral">Click a smaller fish in the tank to eat it. Price: its weight + $1, all of it goes into your fish.</div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 5, 20].map((a) => <button key={a} disabled={busy} onClick={() => act({ action: "feed", fishId: selected._id, amount: a })} className="rounded bg-sand px-3 py-1.5 text-sm font-semibold text-abyss hover:brightness-110 disabled:opacity-50">Feed ${a}</button>)}
                {mine && <button disabled={busy || prey === 0} onClick={() => setMode("eat")} className="rounded border border-coral px-3 py-1.5 text-sm text-coral disabled:opacity-40">Eat a fish</button>}
              </div>
            )}
            <button onClick={() => { setSelected(null); setMode("idle"); }} className="mt-3 text-[11px] text-foam/60 underline">close</button>
          </div>
        )}

        {toast && <div className="glass absolute left-1/2 top-28 -translate-x-1/2 rounded px-4 py-2 text-sm">{toast}</div>}
        <a href="#board" className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] text-foam/50 hover:text-foam">▼ the board, the eaten, the laws</a>
      </section>

      <Below state={state} onFeed={openFeed} onSpawn={openSpawn} myIds={Object.keys(myKeys)} />
    </main>
  );
}

function SpawnForm({ busy, prefill, onCancel, onSubmit }: { busy: boolean; prefill?: { name: string; url: string }; onCancel: () => void; onSubmit: (n: string, u: string, a: number) => void }) {
  const [name, setName] = useState(prefill?.name || "");
  const [url, setUrl] = useState(prefill?.url || "");
  const [amount, setAmount] = useState(prefill ? 5 : 1);
  return (
    <div className="glass absolute bottom-4 right-4 w-[min(92vw,340px)] rounded p-4">
      <div className="font-pixel text-xl">{prefill ? "Come back bigger" : "New fish"}</div>
      <p className="mt-1 text-xs text-foam/70">Your logo is pulled from your site automatically. Weight = dollars. A $1 fish is a snack; a $20 fish is a threat.</p>
      <label className="mt-3 block text-xs">Name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder="Acme" className="mt-1 w-full rounded bg-abyss/70 px-2 py-1.5 text-sm text-foam" /></label>
      <label className="mt-2 block text-xs">Link<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="acme.com" className="mt-1 w-full rounded bg-abyss/70 px-2 py-1.5 text-sm text-foam" /></label>
      <label className="mt-2 block text-xs">Starting weight<div className="mt-1 flex gap-1">{[1, 5, 20, 50].map((a) => (<button key={a} type="button" onClick={() => setAmount(a)} className={`flex-1 rounded px-2 py-1.5 text-sm ${amount === a ? "bg-sand text-abyss" : "bg-abyss/70 text-foam"}`}>${a}</button>))}</div></label>
      <div className="mt-3 flex gap-2">
        <button disabled={busy || !name || !url} onClick={() => onSubmit(name, url, amount)} className="flex-1 rounded bg-coral px-3 py-2 font-pixel text-lg text-abyss disabled:opacity-50">Pay ${amount}</button>
        <button onClick={onCancel} className="rounded px-3 py-2 text-sm text-foam/70">cancel</button>
      </div>
    </div>
  );
}
