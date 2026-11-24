/**
 * The dashboard's icon set: lucide outline icons, one consistent stroke and
 * size, behind the Phosphor names and props the dashboard already uses
 * (`size`, `weight`, `className`). Swap an icon here and it changes on every
 * page.
 *
 * `weight="bold"` draws a heavier stroke; `weight="fill"` fills the shapes
 * that read well filled (stars, hearts, dots, check circles) and otherwise
 * draws a heavier stroke. Brand marks (GitHub, Discord, LinkedIn, …) stay on
 * Phosphor: they're logos, not interface icons.
 */

import {
  forwardRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import type {
  Icon as PhosphorIcon,
  IconProps as PhosphorIconProps,
} from "@phosphor-icons/react";
import * as L from "lucide-react";

export {
  DevToLogo,
  DiscordLogo,
  GithubLogo,
  InstagramLogo,
  LinkedinLogo,
  MediumLogo,
  RedditLogo,
  SlackLogo,
  ThreadsLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";

type Weight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

/** The same props Phosphor took, so every existing call site keeps working. */
export type IconProps = PhosphorIconProps;

/** One type for interface icons and the brand marks, interchangeable. */
export type Icon = PhosphorIcon;

/** Shapes that look right filled in. */
const FILLABLE = new Set([
  "Star",
  "Heart",
  "Circle",
  "Bookmark",
  "Flag",
  "PushPin",
  "Lightning",
]);

function make(name: string, Glyph: L.LucideIcon): Icon {
  const Wrapped = forwardRef<SVGSVGElement, IconProps>(function DashboardIcon(
    { size = 16, weight = "regular" as Weight, mirrored, style, ...rest },
    ref,
  ) {
    const fill =
      weight === "fill" && FILLABLE.has(name) ? "currentColor" : "none";
    const stroke =
      weight === "bold" || weight === "fill"
        ? 2.25
        : weight === "light" || weight === "thin"
          ? 1.5
          : 2;
    return (
      <Glyph
        ref={ref}
        size={size}
        strokeWidth={stroke}
        absoluteStrokeWidth={false}
        fill={fill}
        style={mirrored ? { transform: "scaleX(-1)", ...style } : style}
        {...(rest as L.LucideProps)}
      />
    );
  });
  Wrapped.displayName = name;
  return Wrapped as ForwardRefExoticComponent<
    IconProps & RefAttributes<SVGSVGElement>
  > as Icon;
}

export const AirplaneTilt = make("AirplaneTilt", L.Plane);
export const AppWindow = make("AppWindow", L.AppWindow);
export const Archive = make("Archive", L.Archive);
export const ArrowBendUpLeft = make("ArrowBendUpLeft", L.Reply);
export const ArrowClockwise = make("ArrowClockwise", L.RotateCw);
export const ArrowCounterClockwise = make("ArrowCounterClockwise", L.RotateCcw);
export const ArrowDown = make("ArrowDown", L.ArrowDown);
export const ArrowDownRight = make("ArrowDownRight", L.ArrowDownRight);
export const ArrowLeft = make("ArrowLeft", L.ArrowLeft);
export const ArrowRight = make("ArrowRight", L.ArrowRight);
export const ArrowSquareOut = make("ArrowSquareOut", L.ExternalLink);
export const ArrowUUpLeft = make("ArrowUUpLeft", L.Undo2);
export const ArrowUp = make("ArrowUp", L.ArrowUp);
export const ArrowUpRight = make("ArrowUpRight", L.ArrowUpRight);
export const ArrowsClockwise = make("ArrowsClockwise", L.RefreshCw);
export const ArrowsDownUp = make("ArrowsDownUp", L.ArrowDownUp);
export const Article = make("Article", L.Newspaper);
export const Bank = make("Bank", L.Landmark);
export const Bell = make("Bell", L.Bell);
export const Binoculars = make("Binoculars", L.Send);
export const Briefcase = make("Briefcase", L.BriefcaseBusiness);
export const Buildings = make("Buildings", L.Building2);
export const Butterfly = make("Butterfly", L.AtSign);
export const CalendarBlank = make("CalendarBlank", L.Calendar);
export const CalendarCheck = make("CalendarCheck", L.CalendarCheck);
export const CalendarPlus = make("CalendarPlus", L.CalendarPlus);
export const CalendarStar = make("CalendarStar", L.CalendarHeart);
export const Camera = make("Camera", L.Camera);
export const CaretDown = make("CaretDown", L.ChevronDown);
export const CaretLeft = make("CaretLeft", L.ChevronLeft);
export const CaretRight = make("CaretRight", L.ChevronRight);
export const ChartBar = make("ChartBar", L.ChartColumn);
export const ChartLine = make("ChartLine", L.ChartLine);
export const ChartLineUp = make("ChartLineUp", L.TrendingUp);
export const ChatCircle = make("ChatCircle", L.MessageCircle);
export const ChatCircleDots = make("ChatCircleDots", L.MessageCircleMore);
export const ChatCircleText = make("ChatCircleText", L.MessageSquareText);
export const ChatText = make("ChatText", L.MessageSquareText);
export const Check = make("Check", L.Check);
export const CheckCircle = make("CheckCircle", L.CircleCheck);
export const CheckSquare = make("CheckSquare", L.SquareCheck);
export const Circle = make("Circle", L.Circle);
export const CircleNotch = make("CircleNotch", L.LoaderCircle);
export const ClipboardText = make("ClipboardText", L.ClipboardList);
export const Clock = make("Clock", L.Clock);
export const ClockCounterClockwise = make("ClockCounterClockwise", L.History);
export const Coins = make("Coins", L.Coins);
export const Columns = make("Columns", L.Columns3);
export const Compass = make("Compass", L.Compass);
export const CookingPot = make("CookingPot", L.CookingPot);
export const Copy = make("Copy", L.Copy);
export const Crown = make("Crown", L.Crown);
export const DotsThree = make("DotsThree", L.Ellipsis);
export const DownloadSimple = make("DownloadSimple", L.Download);
export const EnvelopeOpen = make("EnvelopeOpen", L.MailOpen);
export const EnvelopeSimple = make("EnvelopeSimple", L.Mail);
export const Eye = make("Eye", L.Eye);
export const EyeSlash = make("EyeSlash", L.EyeOff);
export const FilePdf = make("FilePdf", L.FileText);
export const FileText = make("FileText", L.FileText);
export const Files = make("Files", L.Files);
export const Flag = make("Flag", L.Flag);
export const FloppyDisk = make("FloppyDisk", L.Save);
export const Folders = make("Folders", L.Folder);
export const FunnelSimple = make("FunnelSimple", L.ListFilter);
export const Gauge = make("Gauge", L.Gauge);
export const GitCommit = make("GitCommit", L.GitCommitHorizontal);
export const GitPullRequest = make("GitPullRequest", L.GitPullRequest);
export const Globe = make("Globe", L.Globe);
export const HandWaving = make("HandWaving", L.Hand);
export const Handshake = make("Handshake", L.Handshake);
export const Heart = make("Heart", L.Heart);
export const Hourglass = make("Hourglass", L.Hourglass);
export const IdentificationCard = make("IdentificationCard", L.IdCard);
export const ImageSquare = make("ImageSquare", L.Image);
export const Info = make("Info", L.Info);
export const Kanban = make("Kanban", L.SquareKanban);
export const Lightning = make("Lightning", L.Zap);
export const List = make("List", L.Menu);
export const ListChecks = make("ListChecks", L.ListChecks);
export const LockSimple = make("LockSimple", L.Lock);
export const MagnifyingGlass = make("MagnifyingGlass", L.Search);
export const Megaphone = make("Megaphone", L.Megaphone);
export const Microphone = make("Microphone", L.Mic);
export const Minus = make("Minus", L.Minus);
export const Newspaper = make("Newspaper", L.Newspaper);
export const NotePencil = make("NotePencil", L.SquarePen);
export const Package = make("Package", L.Package);
export const PaperPlaneTilt = make("PaperPlaneTilt", L.Send);
export const Paperclip = make("Paperclip", L.Paperclip);
export const PencilSimple = make("PencilSimple", L.Pencil);
export const Phone = make("Phone", L.Phone);
export const Play = make("Play", L.Play);
export const Plus = make("Plus", L.Plus);
export const Presentation = make("Presentation", L.Presentation);
export const Printer = make("Printer", L.Printer);
export const Prohibit = make("Prohibit", L.Ban);
export const ProhibitInset = make("ProhibitInset", L.CircleSlash);
export const PushPin = make("PushPin", L.Pin);
export const Quotes = make("Quotes", L.Quote);
export const Receipt = make("Receipt", L.ReceiptText);
export const RocketLaunch = make("RocketLaunch", L.Rocket);
export const Rows = make("Rows", L.Rows3);
export const ShareNetwork = make("ShareNetwork", L.Share2);
export const SidebarSimple = make("SidebarSimple", L.PanelLeft);
export const SignOut = make("SignOut", L.LogOut);
export const SlidersHorizontal = make("SlidersHorizontal", L.SlidersHorizontal);
export const Sparkle = make("Sparkle", L.Sparkles);
export const SquaresFour = make("SquaresFour", L.LayoutGrid);
export const Star = make("Star", L.Star);
export const Stop = make("Stop", L.Square);
export const SuitcaseSimple = make("SuitcaseSimple", L.Briefcase);
export const Tag = make("Tag", L.Tag);
export const Target = make("Target", L.Target);
export const Trash = make("Trash", L.Trash2);
export const Tray = make("Tray", L.Inbox);
export const Trophy = make("Trophy", L.Trophy);
export const UploadSimple = make("UploadSimple", L.Upload);
export const UserCheck = make("UserCheck", L.UserCheck);
export const UserCircle = make("UserCircle", L.CircleUser);
export const UserGear = make("UserGear", L.UserCog);
export const UserPlus = make("UserPlus", L.UserPlus);
export const UserSound = make("UserSound", L.BadgeCheck);
export const Users = make("Users", L.Users);
export const UsersFour = make("UsersFour", L.Users);
export const UsersThree = make("UsersThree", L.UsersRound);
export const VideoCamera = make("VideoCamera", L.Video);
export const Wallet = make("Wallet", L.Wallet);
export const Warning = make("Warning", L.TriangleAlert);
export const WarningCircle = make("WarningCircle", L.CircleAlert);
export const X = make("X", L.X);
export const XCircle = make("XCircle", L.CircleX);

/**
 * The sidebar's own set: one icon per area that says what the area is
 * (companies for Clients, a paper plane for Outreach, a cap for the
 * cohort, …), kept apart so a page's icons can change without touching it.
 */
export const Nav = {
  Layers: make("NavLayers", L.Layers3),
  Workflow: make("NavWorkflow", L.Workflow),
  Radio: make("NavRadio", L.Radio),
  Network: make("NavNetwork", L.Network),
  Cog: make("NavCog", L.Cog),
  LayoutDashboard: make("NavLayoutDashboard", L.LayoutDashboard),
  Building2: make("NavBuilding2", L.Building2),
  Building: make("NavBuilding", L.Building),
  FolderKanban: make("NavFolderKanban", L.FolderKanban),
  LayoutList: make("NavLayoutList", L.LayoutList),
  CalendarRange: make("NavCalendarRange", L.CalendarRange),
  Scale: make("NavScale", L.Scale),
  FileChartColumn: make("NavFileChartColumn", L.FileChartColumn),
  LayoutTemplate: make("NavLayoutTemplate", L.LayoutTemplate),
  Target: make("NavTarget", L.Target),
  Megaphone: make("NavMegaphone", L.Megaphone),
  TrendingUp: make("NavTrendingUp", L.TrendingUp),
  BriefcaseBusiness: make("NavBriefcaseBusiness", L.BriefcaseBusiness),
  Newspaper: make("NavNewspaper", L.Newspaper),
  FileText: make("NavFileText", L.FileText),
  ChartColumn: make("NavChartColumn", L.ChartColumn),
  Globe: make("NavGlobe", L.Globe),
  UsersRound: make("NavUsersRound", L.UsersRound),
  CalendarDays: make("NavCalendarDays", L.CalendarDays),
  Trophy: make("NavTrophy", L.Trophy),
  HandCoins: make("NavHandCoins", L.HandCoins),
  School: make("NavSchool", L.School),
  PiggyBank: make("NavPiggyBank", L.PiggyBank),
  ListChecks: make("NavListChecks", L.ListChecks),
  MailOpen: make("NavMailOpen", L.MailOpen),
  Banknote: make("NavBanknote", L.Banknote),
  ReceiptText: make("NavReceiptText", L.ReceiptText),
  CreditCard: make("NavCreditCard", L.CreditCard),
  Sun: make("NavSun", L.Sun),
  SquareCheckBig: make("NavSquareCheckBig", L.SquareCheckBig),
  Phone: make("NavPhone", L.Phone),
  Contact: make("NavContact", L.Contact),
  UserSearch: make("NavUserSearch", L.UserSearch),
  GraduationCap: make("NavGraduationCap", L.GraduationCap),
  Mail: make("NavMail", L.Mail),
  Handshake: make("NavHandshake", L.Handshake),
} as const;
