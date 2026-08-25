import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: "#04161f",
        deep: "#083346",
        mid: "#0e5a6f",
        foam: "#e6f7f4",
        sand: "#d9b46f",
        coral: "#ff6a3d",
        kelp: "#3fd98a",
      },
      fontFamily: {
        pixel: ['"Pixelify Sans"', "monospace"],
        body: ['"Space Grotesk"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
