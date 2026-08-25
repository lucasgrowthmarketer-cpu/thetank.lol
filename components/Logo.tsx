export function LogoMark({ size = 28 }: { size?: number }) {
  // 8x6 pixel fish, the site's own mark
  const px = [
    "00111100", "01111110", "11101111", "11111111", "01111110", "00111100",
  ];
  const cell = size / 8;
  return (
    <svg width={size} height={(size * 6) / 8} viewBox="0 0 8 6" shapeRendering="crispEdges" aria-hidden="true">
      {px.map((row, y) => row.split("").map((v, x) => v === "1" ? <rect key={`${x}${y}`} x={x} y={y} width={1} height={1} fill={x === 2 && y === 2 ? "#04161f" : "#ff6a3d"} /> : null))}
      <rect x={0} y={1} width={1} height={4} fill="#d9b46f" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-pixel text-2xl leading-none tracking-wide">THE TANK</span>
    </span>
  );
}
