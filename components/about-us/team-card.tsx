"use client";

import {
  GlobeSimple,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react/dist/ssr";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useRef, type MouseEvent } from "react";

const socialLinks = (member: {
  social: { twitter: string; linkedin: string; website: string };
}) => [
  {
    href: member.social.twitter,
    label: "X (Twitter)",
    Icon: XLogo,
    weight: "bold" as const,
  },
  {
    href: member.social.linkedin,
    label: "LinkedIn",
    Icon: LinkedinLogo,
    weight: "fill" as const,
  },
  {
    href: member.social.website,
    label: "Website",
    Icon: GlobeSimple,
    weight: "bold" as const,
  },
];

export const TeamCard = ({
  member,
}: {
  member: {
    name: string;
    role: string;
    image: StaticImageData | string;
    bio: string;
    social: {
      twitter: string;
      linkedin: string;
      website: string;
    };
  };
}) => {
  const tileRef = useRef<HTMLDivElement>(null);
  const glow = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: 0 });

  useEffect(() => () => cancelAnimationFrame(glow.current.raf), []);

  const animate = () => {
    const g = glow.current;
    g.x += (g.tx - g.x) * 0.12;
    g.y += (g.ty - g.y) * 0.12;
    tileRef.current?.style.setProperty("--mouse-x", `${g.x}px`);
    tileRef.current?.style.setProperty("--mouse-y", `${g.y}px`);
    if (Math.abs(g.tx - g.x) > 0.2 || Math.abs(g.ty - g.y) > 0.2) {
      g.raf = requestAnimationFrame(animate);
    } else {
      g.raf = 0;
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const g = glow.current;
    g.tx = e.clientX - rect.left;
    g.ty = e.clientY - rect.top;
    if (!g.raf) g.raf = requestAnimationFrame(animate);
  };

  const handleMouseEnter = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const g = glow.current;
    g.x = g.tx = e.clientX - rect.left;
    g.y = g.ty = e.clientY - rect.top;
    tileRef.current?.style.setProperty("--mouse-x", `${g.x}px`);
    tileRef.current?.style.setProperty("--mouse-y", `${g.y}px`);
  };

  return (
    <div className="group flex h-full flex-col rounded-[24px] bg-white/80 p-3 shadow-[inset_0_1px_0_#fff] ring-1 ring-inset ring-[#141414]/[0.08] transition-[transform,box-shadow,background-color] duration-500 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-[inset_0_1px_0_#fff,0_24px_40px_-28px_rgba(20,20,20,0.45)] motion-reduce:transform-none">
      {/* Portrait tile — the wrapper's 2px padding IS the border; the glow
          sits underneath and the opaque inner panel covers its center, so it
          can only ever be visible in the 2px ring */}
      <div
        ref={tileRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        className="group/tile relative rounded-[18px] bg-[#141414]/[0.08] p-[2px]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[18px] opacity-0 transition-opacity duration-500 ease-out group-hover/tile:opacity-100 [background:radial-gradient(200px_circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),#f97316_0%,rgba(249,115,22,0.4)_40%,transparent_75%)]"
        />
        <div className="relative aspect-[4/4] overflow-hidden rounded-[16px]">
          {/* Recessed paper tile the portrait stands in */}
          <div aria-hidden className="absolute inset-0 bg-[#fbfaf7]" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-[#fbfaf7] to-[#ece5da] shadow-[inset_0_3px_10px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08)]"
          />
          {typeof member.image === "string" ? (
            <Image
              src={member.image}
              alt={member.name}
              width={500}
              height={600}
              sizes="(min-width: 768px) 30vw, 90vw"
              className="absolute bottom-0 left-1/2 h-full w-auto -translate-x-1/2 object-contain object-bottom grayscale transition-all duration-700 ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
            />
          ) : (
            <Image
              src={member.image}
              alt={member.name}
              width={400}
              height={500}
              className="absolute bottom-0 left-1/2 h-full w-auto -translate-x-1/2 object-contain object-bottom grayscale transition-all duration-700 ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
            />
          )}
        </div>
      </div>

      {/* Caption: name + role on the left, socials in one slim capsule */}
      <div className="flex flex-1 items-end justify-between gap-3 px-2 pb-1.5 pt-5">
        <div className="min-w-0">
          <h3 className="truncate text-[19px] font-medium leading-tight tracking-[-0.03em] text-[#141414]">
            {member.name}
          </h3>
          <p className="mt-1.5 text-[13px] leading-snug text-[#141414]/[0.62]">
            {member.role}
          </p>
        </div>
        <div className="flex shrink-0 items-center rounded-full bg-[#141414]/[0.03] p-0.5 ring-1 ring-inset ring-[#141414]/10">
          {socialLinks(member).map(({ href, label, Icon, weight }) => (
            <Link
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${member.name} on ${label}`}
              className="flex size-8 items-center justify-center rounded-full text-[#141414] opacity-70 transition-[color,background-color,opacity] duration-300 hover:bg-[#f97316]/10 hover:text-[#f97316] hover:opacity-100"
            >
              <Icon weight={weight} className="size-[17px]" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
