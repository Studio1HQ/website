import {
  Bank,
  Binoculars,
  Briefcase,
  Compass,
  EnvelopeSimple,
  Folders,
  IdentificationCard,
  NotePencil,
  Trophy,
  UserGear,
  type Icon,
} from "@/components/internal/icons";
import type { AreaKey } from "@/lib/internal/overview";

export type CardKey = AreaKey | "audiences";

/** Each area of the overview: its name and icon (the cards and "Needs you"). */
export const AREAS: Record<CardKey, { name: string; icon: Icon }> = {
  hiring: { name: "Hiring", icon: Briefcase },
  hackathons: { name: "Hackathons", icon: Trophy },
  blog: { name: "Blog", icon: NotePencil },
  team: { name: "Team", icon: IdentificationCard },
  money: { name: "Money", icon: Bank },
  community: { name: "Community", icon: Compass },
  clients: { name: "Clients", icon: Folders },
  outreach: { name: "Outreach", icon: Binoculars },
  access: { name: "Team access", icon: UserGear },
  audiences: { name: "Audiences", icon: EnvelopeSimple },
};
