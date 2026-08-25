import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = { _id: string; visits: number; visitors: number };

async function load() {
  const d = await db();
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [bySource, byRef, totals, payments, daily] = await Promise.all([
    d.collection("visits").aggregate<Row>([
      { $match: { at: { $gte: since } } },
      { $group: { _id: "$source", visits: { $sum: 1 }, v: { $addToSet: "$visitor" } } },
      { $project: { visits: 1, visitors: { $size: "$v" } } },
      { $sort: { visits: -1 } }, { $limit: 20 },
    ]).toArray(),
    d.collection("visits").aggregate<Row>([
      { $match: { at: { $gte: since }, referrer: { $ne: "" } } },
      { $group: { _id: "$referrer", visits: { $sum: 1 }, v: { $addToSet: "$visitor" } } },
      { $project: { visits: 1, visitors: { $size: "$v" } } },
      { $sort: { visits: -1 } }, { $limit: 15 },
    ]).toArray(),
    d.collection("visits").aggregate<{ visits: number; visitors: number }>([
      { $group: { _id: null, visits: { $sum: 1 }, v: { $addToSet: "$visitor" } } },
      { $project: { visits: 1, visitors: { $size: "$v" } } },
    ]).toArray(),
    d.collection("payments").find().sort({ at: -1 }).limit(200).toArray(),
    d.collection("visits").aggregate<Row>([
      { $group: { _id: { $substr: ["$at", 0, 10] }, visits: { $sum: 1 }, v: { $addToSet: "$visitor" } } },
      { $project: { visits: 1, visitors: { $size: "$v" } } },
      { $sort: { _id: -1 } }, { $limit: 10 },
    ]).toArray(),
  ]);
  const revenue = payments.reduce((s, p) => s + ((p.amount as number) || 0), 0);
  return {
    bySource, byRef, daily,
    visits: totals[0]?.visits ?? 0,
    visitors: totals[0]?.visitors ?? 0,
    orders: payments.length,
    revenue,
    recent: payments.slice(0, 12).map((p) => ({
      at: String(p.at),
      amount: (p.amount as number) || 0,
      action: String(p.meta?.action ?? ""),
      name: String(p.meta?.name ?? ""),
    })),
  };
}

function Table({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#7fb3c4" }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <tbody>
          {rows.length === 0 && (
            <tr><td style={{ padding: "8px 0", color: "#6b8290" }}>nothing yet</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r._id || "none"} style={{ borderTop: "1px solid rgba(230,247,244,.1)" }}>
              <td style={{ padding: "8px 0", wordBreak: "break-all" }}>{r._id || "direct"}</td>
              <td style={{ padding: "8px 0", textAlign: "right", width: 90 }}>{r.visits} views</td>
              <td style={{ padding: "8px 0", textAlign: "right", width: 110, color: "#d9b46f" }}>{r.visitors} unique</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Stats({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return <main style={{ padding: 40, fontFamily: "monospace" }}>nope</main>;
  }
  const s = await load();
  const rate = s.visitors ? ((s.orders / s.visitors) * 100).toFixed(1) : "0.0";
  const perVisitor = s.visitors ? (s.revenue / s.visitors).toFixed(3) : "0";

  return (
    <main style={{ minHeight: "100vh", background: "#04161f", color: "#e6f7f4", padding: "40px 24px", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>The Tank, stats</h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginTop: 24 }}>
          {[
            ["unique visitors", s.visitors],
            ["page views", s.visits],
            ["paid actions", s.orders],
            ["revenue", `$${s.revenue}`],
            ["conversion", `${rate}%`],
            ["$ per visitor", `$${perVisitor}`],
          ].map(([k, v]) => (
            <div key={String(k)} style={{ border: "1px solid rgba(230,247,244,.12)", borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: "#7fb3c4" }}>{k}</div>
              <div style={{ fontSize: 26, marginTop: 4, color: "#ffb347" }}>{v}</div>
            </div>
          ))}
        </div>

        <Table title="by source (?s= in your links)" rows={s.bySource} />
        <Table title="by referrer" rows={s.byRef} />
        <Table title="by day" rows={s.daily} />

        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#7fb3c4" }}>recent paid actions</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <tbody>
              {s.recent.length === 0 && (
                <tr><td style={{ padding: "8px 0", color: "#6b8290" }}>nothing yet</td></tr>
              )}
              {s.recent.map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid rgba(230,247,244,.1)" }}>
                  <td style={{ padding: "8px 0", color: "#6b8290" }}>{p.at.slice(5, 16).replace("T", " ")}</td>
                  <td style={{ padding: "8px 0" }}>{p.action}{p.name ? ` · ${p.name}` : ""}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", color: "#d9b46f" }}>${p.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 32, fontSize: 12, color: "#6b8290", lineHeight: 1.6 }}>
          Tag your links with ?s=x, ?s=thread, ?s=outbid, ?s=reddit to split traffic by channel.
          Conversion counts every paid action against unique visitors, so feeds and kills are included, not only new fish.
        </p>
      </div>
    </main>
  );
}
