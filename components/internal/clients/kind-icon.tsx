import {
  AppWindow,
  Article,
  ArrowsClockwise,
  Briefcase,
  Buildings,
  CalendarStar,
  ChartBar,
  ChartLineUp,
  ChatCircleText,
  Circle,
  ClipboardText,
  CookingPot,
  GitPullRequest,
  Handshake,
  HandWaving,
  ListChecks,
  MagnifyingGlass,
  Megaphone,
  Microphone,
  Newspaper,
  Phone,
  RedditLogo,
  RocketLaunch,
  ShareNetwork,
  UserCircle,
  UsersThree,
  VideoCamera,
} from "@phosphor-icons/react/dist/ssr";
import type {
  DeliverableKind,
  PartnerType,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";

/**
 * One icon per kind of work and per kind of partner, so lists and headings
 * read at a glance. No hooks: safe in server and client components.
 */

type IconComponent = typeof Article;

const KIND_ICONS: Record<DeliverableKind, IconComponent> = {
  blog: Article,
  republish: ArrowsClockwise,
  video: VideoCamera,
  demo: AppWindow,
  cookbook: CookingPot,
  cookbook_pr: GitPullRequest,
  launch_post: RocketLaunch,
  social_post: ShareNetwork,
  reddit_post: RedditLogo,
  community_post: ChatCircleText,
  outreach: UsersThree,
  talk: Microphone,
  event: CalendarStar,
  call: Phone,
  onboarding: HandWaving,
  audit: MagnifyingGlass,
  case_study: Briefcase,
  report: ChartBar,
  snapshot: ChartLineUp,
  plan: ListChecks,
  other: Circle,
};

const PARTNER_ICONS: Record<PartnerType, IconComponent> = {
  co_gtm: Handshake,
  partner: Buildings,
  event: CalendarStar,
  community: UsersThree,
  ambassador: UserCircle,
  media: Newspaper,
  other: ClipboardText,
};

export function KindIcon({
  kind,
  size = 15,
  className,
}: {
  kind: DeliverableKind;
  size?: number;
  className?: string;
}) {
  const Icon = KIND_ICONS[kind] ?? Circle;
  return (
    <Icon
      size={size}
      aria-hidden
      className={cn("shrink-0 text-[var(--i-muted)]", className)}
    />
  );
}

export function PartnerIcon({
  type,
  size = 14,
  className,
}: {
  type: PartnerType;
  size?: number;
  className?: string;
}) {
  const Icon = PARTNER_ICONS[type] ?? Megaphone;
  return (
    <Icon
      size={size}
      aria-hidden
      className={cn("shrink-0 text-[var(--i-muted)]", className)}
    />
  );
}
