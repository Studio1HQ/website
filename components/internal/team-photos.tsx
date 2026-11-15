"use client";

import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { Avatar } from "@/components/internal/ui";

/** Email (lowercase) → photo URL, from lib/internal/team/photos.ts via the dashboard layout. */
const TeamPhotos = createContext<Readonly<Record<string, string>>>({});

export function TeamPhotosProvider({
  photos,
  children,
}: {
  photos: Readonly<Record<string, string>>;
  children: ReactNode;
}) {
  return <TeamPhotos.Provider value={photos}>{children}</TeamPhotos.Provider>;
}

/**
 * An avatar for someone known only by email: their team photo when they
 * have one, else initials. An explicit `src` still wins.
 */
export function TeamAvatar({ src, email, ...props }: ComponentProps<typeof Avatar>) {
  const photos = useContext(TeamPhotos);
  const photo = src ?? (email ? photos[email.trim().toLowerCase()] : undefined);
  return <Avatar {...props} email={email} src={photo} />;
}
