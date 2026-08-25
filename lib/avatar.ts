/* Resolving a fish's picture.
   Websites give a favicon. Social links give the actual profile picture, because
   otherwise every Telegram channel would swim around wearing the Telegram logo.
   Nothing is uploaded or stored: these are all remote URLs. */

function root(host: string) {
  const p = host.replace(/^www\./, "").split(".");
  return p.length > 2 ? p.slice(-2).join(".") : p.join(".");
}

/** Ordered list of candidate image URLs, best first. */
export function avatarSources(rawUrl: string, custom?: string): string[] {
  const out: string[] = [];
  if (custom) out.push(custom);
  let u: URL;
  try { u = new URL(rawUrl); } catch { return out; }
  const host = u.hostname.replace(/^www\./, "");
  const seg = u.pathname.split("/").filter(Boolean);
  const handle = (seg[0] || "").replace(/^@/, "");
  const r = root(host);

  if (handle) {
    if (host === "t.me" || host === "telegram.me") out.push(`https://unavatar.io/telegram/${handle}`);
    else if (r === "x.com" || r === "twitter.com") out.push(`https://unavatar.io/x/${handle}`, `https://unavatar.io/twitter/${handle}`);
    else if (r === "github.com") out.push(`https://github.com/${handle}.png`);
    else if (r === "instagram.com") out.push(`https://unavatar.io/instagram/${handle}`);
    else if (r === "youtube.com") out.push(`https://unavatar.io/youtube/${handle}`);
    else if (r === "twitch.tv") out.push(`https://unavatar.io/twitch/${handle}`);
    else if (r === "substack.com" || host.endsWith(".substack.com")) out.push(`https://unavatar.io/substack/${host.split(".")[0]}`);
    else if (r === "producthunt.com") out.push(`https://unavatar.io/producthunt/${seg[1] || handle}`);
  }
  // plain websites, and the fallback for everything above.
  // This order is the one that was verified working, do not reshuffle it.
  out.push(
    `https://${host}/favicon.ico`,
    `https://${host}/favicon.png`,
    `https://${host}/apple-touch-icon.png`,
    `https://${r}/favicon.ico`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
    `https://icons.duckduckgo.com/ip3/${r}.ico`,
    `https://www.google.com/s2/favicons?domain=${r}&sz=128`,
  );
  return out;
}

/** Hosts where the favicon would be the platform logo, not the person. */
const GENERIC = ["t.me", "telegram.me", "x.com", "twitter.com", "linkedin.com", "instagram.com", "facebook.com", "tiktok.com", "discord.gg", "discord.com", "reddit.com", "youtube.com", "medium.com", "notion.site"];

export function isGenericHost(rawUrl: string) {
  try {
    const h = new URL(rawUrl).hostname.replace(/^www\./, "");
    return GENERIC.some((g) => h === g || h.endsWith("." + g));
  } catch { return false; }
}

/** True when we have a way to fetch the real avatar for this link. */
export function hasAvatarProvider(rawUrl: string) {
  try {
    const u = new URL(rawUrl);
    const h = u.hostname.replace(/^www\./, "");
    const r = root(h);
    const handle = u.pathname.split("/").filter(Boolean)[0];
    if (!handle) return false;
    return ["t.me", "telegram.me"].includes(h) || ["x.com", "twitter.com", "github.com", "instagram.com", "youtube.com", "twitch.tv", "producthunt.com"].includes(r);
  } catch { return false; }
}
