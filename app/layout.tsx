import type { Metadata } from "next";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "The Tank. $1 buys you a fish. Bigger fish eat smaller fish.",
  description:
    "A public aquarium where every fish is a brand. $1 puts your logo in the water. Feed it to grow. Get heavier than a rival and eat them. Every dollar is visible.",
  openGraph: {
    title: "The Tank. $1 buys you a fish.",
    description: "Feed it to grow. Get heavier than a rival and eat them. Every dollar is visible.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Tank. $1 buys you a fish.",
    description: "A public aquarium where every fish is a brand. Feed it to grow, eat smaller rivals. Every dollar is visible.",
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
