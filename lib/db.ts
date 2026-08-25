import { MongoClient, Db, ObjectId } from "mongodb";
import type { Fish, Event } from "./types";

let client: MongoClient | null = null;

export async function db(): Promise<Db> {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI missing");
    client = new MongoClient(uri);
    await client.connect();
    const d = client.db();
    await Promise.all([
      d.collection("fish").createIndex({ alive: 1 }),
      d.collection("events").createIndex({ at: -1 }),
      d.collection("payments").createIndex({ sessionId: 1 }, { unique: true }),
      d.collection("visits").createIndex({ at: -1 }),
      d.collection("visits").createIndex({ source: 1 }),
    ]).catch(() => {});
  }
  return client.db();
}

export function oid(id: string) {
  try { return new ObjectId(id); } catch { return null; }
}

export function faviconFor(url: string) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch { return ""; }
}

export function cleanUrl(raw: string) {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  const parsed = new URL(u);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad url");
  return parsed.toString();
}

export function cleanImageUrl(raw: string) {
  const u = new URL(raw.trim());
  if (u.protocol !== "https:") throw new Error("image link must start with https");
  if (u.href.length > 500) throw new Error("image link too long");
  return u.toString();
}

export function cleanName(raw: string) {
  const n = raw.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 32);
  if (n.length < 1) throw new Error("name required");
  return n;
}

async function logEvent(d: Db, e: Omit<Event, "_id" | "at">) {
  await d.collection("events").insertOne({ ...e, at: new Date().toISOString() });
}

async function recordPayment(d: Db, sessionId: string, amount: number, meta: Record<string, string>) {
  await d.collection("payments").insertOne({ sessionId, amount, meta, at: new Date().toISOString() });
}

/** Apply a paid action. Throws on invalid; idempotent per sessionId. */
export async function applyAction(sessionId: string, meta: Record<string, string>, amount: number) {
  const d = await db();
  const dup = await d.collection("payments").findOne({ sessionId });
  if (dup) return { ok: true, dup: true };

  if (meta.action === "spawn") {
    const name = cleanName(meta.name || "");
    const url = cleanUrl(meta.url || "");
    const fish: Omit<Fish, "_id"> = {
      name, url, logo: faviconFor(url),
      image: meta.image || undefined,
      weight: amount,
      hue: Math.floor(Math.random() * 360),
      seed: Math.random(),
      ownerKey: meta.ownerKey,
      createdAt: new Date().toISOString(),
      alive: true,
      kills: 0,
    };
    const r = await d.collection("fish").insertOne(fish);
    await logEvent(d, { type: "spawn", text: `${name} entered the tank`, amount });
    await recordPayment(d, sessionId, amount, meta);
    return { ok: true, fishId: r.insertedId.toString() };
  }

  if (meta.action === "feed") {
    const id = oid(meta.fishId || "");
    const f = id && (await d.collection("fish").findOne({ _id: id, alive: true }));
    if (!f) throw new Error("fish not found");
    await d.collection("fish").updateOne({ _id: id! }, { $inc: { weight: amount } });
    await logEvent(d, { type: "feed", text: `${f.name} was fed`, amount });
    await recordPayment(d, sessionId, amount, meta);
    return { ok: true };
  }

  if (meta.action === "eat") {
    const id = oid(meta.fishId || "");
    const tid = oid(meta.targetId || "");
    const f = id && (await d.collection("fish").findOne({ _id: id, alive: true }));
    const t = tid && (await d.collection("fish").findOne({ _id: tid, alive: true }));
    if (!f) throw new Error("fish not found");
    if (f.ownerKey !== meta.ownerKey) throw new Error("not your fish");
    // Conditions may have changed between checkout and payment: money always feeds the eater,
    // the kill only happens if the rules still hold.
    const canEat = t && f.weight > t.weight && amount >= t.weight + 1 && String(t._id) !== String(f._id);
    await d.collection("fish").updateOne({ _id: id! }, { $inc: { weight: amount, kills: canEat ? 1 : 0 } });
    if (canEat) {
      await d.collection("fish").updateOne({ _id: tid! }, { $set: { alive: false, eatenBy: f.name, eatenById: String(f._id), eatenAt: new Date().toISOString() } });
      await logEvent(d, { type: "eat", text: `${f.name} ate ${t.name}`, amount });
    } else {
      await logEvent(d, { type: "feed", text: `${f.name} was fed`, amount });
    }
    await recordPayment(d, sessionId, amount, meta);
    return { ok: true, ate: !!canEat };
  }

  throw new Error("unknown action");
}

export async function getFish(id: string) {
  const _id = oid(id);
  if (!_id) return null;
  const d = await db();
  const f = await d.collection("fish").findOne({ _id }, { projection: { ownerKey: 0 } });
  if (!f) return null;
  const [heavier, alive, biomass] = await Promise.all([
    d.collection("fish").countDocuments({ alive: true, weight: { $gt: f.weight } }),
    d.collection("fish").countDocuments({ alive: true }),
    d.collection("payments").aggregate([{ $group: { _id: null, t: { $sum: "$amount" } } }]).toArray(),
  ]);
  return {
    ...f,
    _id: String(f._id),
    rank: f.alive ? heavier + 1 : null,
    aliveCount: alive,
    biomass: biomass[0]?.t ?? 0,
  } as unknown as {
    _id: string; name: string; url: string; image?: string; weight: number; hue: number;
    alive: boolean; kills?: number; eatenBy?: string; eatenAt?: string; createdAt: string;
    rank: number | null; aliveCount: number; biomass: number;
  };
}

export async function getState() {
  const d = await db();
  const [fish, dead, legends, events, sums, eaten] = await Promise.all([
    d.collection("fish").find({ alive: true }, { projection: { ownerKey: 0 } }).sort({ weight: -1 }).limit(400).toArray(),
    d.collection("fish").find({ alive: false }, { projection: { ownerKey: 0 } }).sort({ eatenAt: -1 }).limit(30).toArray(),
    d.collection("fish").find({}, { projection: { ownerKey: 0 } }).sort({ weight: -1 }).limit(5).toArray(),
    d.collection("events").find().sort({ at: -1 }).limit(20).toArray(),
    d.collection("payments").aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]).toArray(),
    d.collection("fish").countDocuments({ alive: false }),
  ]);
  return {
    fish: fish.map((f) => ({ ...f, _id: String(f._id) })),
    dead: dead.map((f) => ({ ...f, _id: String(f._id) })),
    legends: legends.map((f) => ({ ...f, _id: String(f._id) })),
    events: events.map((e) => ({ ...e, _id: String(e._id) })),
    biomass: sums[0]?.total ?? 0,
    eaten,
    demo: !process.env.STRIPE_SECRET_KEY,
  };
}
