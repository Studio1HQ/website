import type { ReactNode, SVGProps } from "react";

type PostShareProps = {
  url: string;
  title: string;
  variant?: "default" | "sidebar";
};

type ShareLink = {
  label: string;
  href: string;
  ariaLabel: string;
  icon: ReactNode;
  hoverClassName: string;
};

function hnSubmitUrl(url: string, title: string) {
  const u = new URL("https://news.ycombinator.com/submitlink");
  u.searchParams.set("u", url);
  u.searchParams.set("t", title);
  return u.toString();
}

function redditSubmitUrl(url: string, title: string) {
  const u = new URL("https://www.reddit.com/submit");
  u.searchParams.set("url", url);
  u.searchParams.set("title", title);
  return u.toString();
}

function xIntentUrl(url: string, title: string) {
  const u = new URL("https://twitter.com/intent/tweet");
  u.searchParams.set("url", url);
  u.searchParams.set("text", title);
  return u.toString();
}

function linkedInShareUrl(url: string) {
  const u = new URL("https://www.linkedin.com/sharing/share-offsite/");
  u.searchParams.set("url", url);
  return u.toString();
}

type IconProps = SVGProps<SVGSVGElement>;

/** YC / Hacker News mark: #FF6600 tile + crisp white Y */
function HackerNewsIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <rect width="24" height="24" rx="5" fill="#FF6600" />
      <path
        fill="#fff"
        d="M11.25 13.35 7.6 6.5h2.15l1.78 3.85c.2.44.36.85.36.85s.17-.43.38-.85L14.1 6.5h2.05l-3.65 6.85V17.5h-1.25v-4.15z"
      />
    </svg>
  );
}

/** Reddit Simple Icons mark: white disc behind logo, orangered snoo on top */
function RedditIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="12" fill="#fff" />
      <path
        fill="#FF4500"
        d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"
      />
    </svg>
  );
}

function XIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

function LinkedInIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <path
        fill="currentColor"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  );
}

/** One-colour marks (currentColor) so the sidebar icons read as one set. */
function HackerNewsMono({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="5" fill="currentColor" />
      <path
        fill="#fff"
        d="M11.25 13.35 7.6 6.5h2.15l1.78 3.85c.2.44.36.85.36.85s.17-.43.38-.85L14.1 6.5h2.05l-3.65 6.85V17.5h-1.25v-4.15z"
      />
    </svg>
  );
}

function RedditMono({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"
      />
    </svg>
  );
}

const iconClass = "size-6 shrink-0";
const sidebarIconClass = "size-4 shrink-0";

export function PostShare({ url, title, variant = "default" }: PostShareProps) {
  const isSidebar = variant === "sidebar";
  const links: ShareLink[] = [
    {
      label: "Hacker News",
      href: hnSubmitUrl(url, title),
      ariaLabel: "Share on Hacker News",
      icon: isSidebar ? (
        <HackerNewsMono className={sidebarIconClass} />
      ) : (
        <HackerNewsIcon className={`${iconClass} rounded-md`} />
      ),
      hoverClassName: "hover:border-[#FF6600]/45 hover:bg-[#FF6600]/[0.08]",
    },
    {
      label: "Reddit",
      href: redditSubmitUrl(url, title),
      ariaLabel: "Share on Reddit",
      icon: isSidebar ? (
        <RedditMono className={sidebarIconClass} />
      ) : (
        <RedditIcon className={iconClass} />
      ),
      hoverClassName: "hover:border-[#FF4500]/45 hover:bg-[#FF4500]/[0.08]",
    },
    {
      label: "X",
      href: xIntentUrl(url, title),
      ariaLabel: "Share on X",
      icon: <XIcon className={isSidebar ? sidebarIconClass : iconClass} />,
      hoverClassName:
        "text-foreground hover:border-foreground/25 hover:bg-foreground/[0.06]",
    },
    {
      label: "LinkedIn",
      href: linkedInShareUrl(url),
      ariaLabel: "Share on LinkedIn",
      icon: (
        <LinkedInIcon className={isSidebar ? sidebarIconClass : iconClass} />
      ),
      hoverClassName:
        "text-[#0A66C2] hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/10",
    },
  ];

  return (
    <section
      className={
        isSidebar ? "not-prose" : "not-prose mt-12 border-t border-border pt-8"
      }
      aria-labelledby="post-share-heading"
    >
      <div className={isSidebar ? "mb-2" : "mb-5"}>
        <h2
          id="post-share-heading"
          className={
            isSidebar
              ? "text-[11.5px] text-[#141414]/50"
              : "text-base font-semibold text-foreground"
          }
        >
          Share
        </h2>
        {!isSidebar ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Pass it on if this was useful.
          </p>
        ) : null}
      </div>

      <div
        className={
          isSidebar ? "grid grid-cols-4 gap-1.5" : "flex flex-wrap gap-2"
        }
      >
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.ariaLabel}
            title={link.label}
            className={
              isSidebar
                ? `group inline-flex h-10 items-center justify-center rounded-[10px] bg-white/70 shadow-[inset_0_1px_0_#fff,0_10px_24px_-20px_rgba(20,20,20,0.35)] ring-1 ring-white/80 backdrop-blur-xl backdrop-saturate-150 text-[#141414] transition-colors duration-200 hover:text-[#f97316]`
                : `inline-flex h-11 items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 text-sm font-medium transition-colors hover:bg-muted sm:px-4 ${link.hoverClassName}`
            }
          >
            <span className="transition-transform duration-200 group-hover:scale-105">
              {link.icon}
            </span>
            {!isSidebar ? (
              <span className="hidden text-foreground sm:inline">
                {link.label}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}
