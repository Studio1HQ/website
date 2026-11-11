import type { ReactNode } from "react";

/**
 * Simplified round flags for the world-map markers, drawn in a 10x10 box
 * (the caller clips them to a circle). India shows the Studio1 mark: it is
 * the hub every arc starts from.
 */
const star = (cx: number, cy: number, r: number, fill: string) => {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return <polygon points={points} fill={fill} />;
};

export const MAP_FLAGS: Record<string, ReactNode> = {
  USA: (
    <>
      <rect width="10" height="10" fill="#fff" />
      {[0, 2, 4, 6, 8].map((y) => (
        <rect key={y} y={y * (10 / 9.5)} width="10" height="1.05" fill="#b22234" />
      ))}
      <rect width="5" height="5.3" fill="#3c3b6e" />
    </>
  ),
  France: (
    <>
      <rect width="3.34" height="10" fill="#0055a4" />
      <rect x="3.33" width="3.34" height="10" fill="#fff" />
      <rect x="6.66" width="3.34" height="10" fill="#ef4135" />
    </>
  ),
  Netherlands: (
    <>
      <rect width="10" height="3.34" fill="#ae1c28" />
      <rect y="3.33" width="10" height="3.34" fill="#fff" />
      <rect y="6.66" width="10" height="3.34" fill="#21468b" />
    </>
  ),
  Israel: (
    <>
      <rect width="10" height="10" fill="#fff" />
      <rect y="1.6" width="10" height="1.2" fill="#0038b8" />
      <rect y="7.2" width="10" height="1.2" fill="#0038b8" />
      <polygon points="5,3.4 6.4,5.8 3.6,5.8" fill="none" stroke="#0038b8" strokeWidth="0.45" />
      <polygon points="5,6.6 3.6,4.2 6.4,4.2" fill="none" stroke="#0038b8" strokeWidth="0.45" />
    </>
  ),
  Brazil: (
    <>
      <rect width="10" height="10" fill="#009c3b" />
      <polygon points="5,1.4 9.2,5 5,8.6 0.8,5" fill="#ffdf00" />
      <circle cx="5" cy="5" r="2" fill="#002776" />
    </>
  ),
  Singapore: (
    <>
      <rect width="10" height="5" fill="#ef3340" />
      <rect y="5" width="10" height="5" fill="#fff" />
      <circle cx="3.2" cy="2.5" r="1.6" fill="#fff" />
      <circle cx="3.8" cy="2.5" r="1.45" fill="#ef3340" />
    </>
  ),
  Vietnam: (
    <>
      <rect width="10" height="10" fill="#da251d" />
      {star(5, 5.2, 2.9, "#ffcd00")}
    </>
  ),
  Australia: (
    <>
      <rect width="10" height="10" fill="#012169" />
      <rect x="2" width="1" height="5" fill="#fff" />
      <rect y="2" width="5" height="1" fill="#fff" />
      <rect x="2.2" width="0.6" height="5" fill="#c8102e" />
      <rect y="2.2" width="5" height="0.6" fill="#c8102e" />
      {star(2.6, 7.4, 1.1, "#fff")}
      {star(7.4, 3.2, 0.7, "#fff")}
      {star(8.2, 6.6, 0.7, "#fff")}
      {star(6.4, 8, 0.7, "#fff")}
    </>
  ),
};
