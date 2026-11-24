/**
 * The marks of the tools on the Connections page, in their own colours
 * (each company's published logo), and Studio1 Connect's own mark.
 */

type LogoProps = { className?: string };

/**
 * Studio1 Connect's mark: four shapes in a square, a blue square, an orange
 * circle, a yellow play triangle and a green square. `animated` loops it:
 * the blue square breathes in and out, the triangle turns, and the circle
 * drops onto the green square, which gives under it and springs back
 * (keyframes in app/internal/internal.css; still for reduced motion).
 */
export function ConnectMark({ className, animated = false }: LogoProps & { animated?: boolean }) {
  return (
    <svg viewBox="-3 -3 96 96" aria-hidden overflow="visible" className={[animated ? "connect-anim" : "", className].filter(Boolean).join(" ")}>
      <rect className="cm-square" x="0" y="0" width="40" height="40" rx="9" fill="#4886de" />
      <circle className="cm-dot" cx="69" cy="20" r="20" fill="#ff5a2a" />
      <path className="cm-play" d="M4 50 L4 84 L38 67 Z" fill="#ffcc00" stroke="#ffcc00" strokeWidth="8" strokeLinejoin="round" />
      <rect className="cm-base" x="49" y="48" width="40" height="40" rx="9" fill="#01796b" />
    </svg>
  );
}

export function SlackLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 122.8 122.8" aria-hidden className={className}>
      <path fill="#e01e5a" d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" />
      <path fill="#36c5f0" d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" />
      <path fill="#2eb67d" d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" />
      <path fill="#ecb22e" d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" />
    </svg>
  );
}

export function GoogleCalendarLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={className}>
      <path fill="#fff" d="M152.6 47.4H47.4v105.2h105.2z" />
      <path fill="#ea4335" d="M152.6 200 200 152.6l-23.7-4-23.7 4-4.3 21.7z" />
      <path fill="#188038" d="M0 152.6v31.6C0 192.9 7.1 200 15.8 200h31.6l4.9-23.7-4.9-23.7-25.8-4z" />
      <path fill="#1967d2" d="M200 47.4V15.8C200 7.1 192.9 0 184.2 0h-31.6c-2.9 11.7-4.3 20.4-4.3 26.1s1.4 12.8 4.3 21.3c10.5 3 18.4 4.5 23.7 4.5s13.2-1.5 23.7-4.5z" />
      <path fill="#fbbc04" d="M200 47.4h-47.4v105.2H200z" />
      <path fill="#34a853" d="M152.6 152.6H47.4V200h105.2z" />
      <path fill="#4285f4" d="M152.6 0H15.8C7.1 0 0 7.1 0 15.8v136.8h47.4V47.4h105.2z" />
      <path
        fill="#4285f4"
        d="M68.9 129c-3.9-2.7-6.6-6.6-8.1-11.7l9.1-3.8c.8 3.2 2.3 5.6 4.4 7.3s4.6 2.6 7.6 2.6c3 0 5.6-.9 7.8-2.8s3.3-4.2 3.3-7.1-1.2-5.3-3.5-7.2-5.2-2.8-8.6-2.8h-5.3v-9h4.7c2.9 0 5.4-.8 7.4-2.4s3-3.8 3-6.6c0-2.5-.9-4.4-2.7-5.9s-4.1-2.2-6.8-2.2-4.8.7-6.4 2.1-2.7 3.2-3.4 5.2l-9-3.8c1.2-3.4 3.4-6.4 6.6-9s7.3-3.9 12.3-3.9c3.7 0 7 .7 10 2.1s5.3 3.4 7 5.9 2.5 5.4 2.5 8.6-.8 5.9-2.3 8.2-3.4 4-5.7 5.2v.5c3 1.3 5.4 3.2 7.3 5.7s2.8 5.6 2.8 9.2-.9 6.7-2.7 9.5-4.3 5-7.5 6.6-6.8 2.4-10.7 2.4c-4.6 0-8.8-1.3-12.7-4zm56-45.2-10 7.2-5-7.6 18-13h6.9v61.3h-9.9z"
      />
    </svg>
  );
}

export function GmailLogo({ className }: LogoProps) {
  return (
    <svg viewBox="52 42 88 66" aria-hidden className={className}>
      <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
      <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
      <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
      <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
      <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
    </svg>
  );
}

export function GitHubLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.7 18 5 18 5c.6 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"
      />
    </svg>
  );
}

export function NotionLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M4.46 4.21c.75.6 1.03.56 2.43.47l13.21-.8c.28 0 .05-.28-.05-.33L17.86 2c-.42-.33-.98-.7-2.06-.6L3 2.33c-.46.05-.56.28-.37.47zm.8 3.08v13.9c0 .75.37 1.03 1.21.98l14.52-.84c.84-.05.94-.56.94-1.17V6.35c0-.6-.24-.93-.75-.88l-15.17.88c-.56.05-.75.33-.75.94zm14.33.75c.1.42 0 .84-.42.89l-.7.14v10.26c-.61.33-1.17.52-1.64.52-.75 0-.93-.24-1.5-.94l-4.57-7.19v6.96l1.45.33s0 .84-1.17.84l-3.22.19c-.1-.19 0-.65.33-.75l.84-.23V9.86l-1.17-.1c-.09-.42.14-1.03.8-1.07l3.45-.24 4.76 7.28v-6.44l-1.21-.14c-.1-.52.28-.89.75-.94zM1.94 1.04 15.25.06c1.63-.14 2.05-.05 3.08.7l4.25 2.98c.7.51.93.65.93 1.21v16.35c0 1.03-.37 1.63-1.68 1.73L6.38 23.96c-.98.05-1.45-.1-1.96-.75l-3.13-4.06c-.56-.75-.79-1.3-.79-1.96V2.65c0-.84.37-1.53 1.44-1.61z"
      />
    </svg>
  );
}

/** Google Chrome's mark (also used for browsers built on Chrome: Edge, Brave, Arc). */
export function ChromeLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path fill="#ea4335" d="M24 13.4L43.28 13.4A22 22 0 0 0 5.18 12.6L14.82 29.3A10.6 10.6 0 0 1 24 13.4Z" />
      <path fill="#fbbc04" d="M33.18 29.3L23.54 46A22 22 0 0 0 43.28 13.4L24 13.4A10.6 10.6 0 0 1 33.18 29.3Z" />
      <path fill="#34a853" d="M14.82 29.3L5.18 12.6A22 22 0 0 0 23.54 46L33.18 29.3A10.6 10.6 0 0 1 14.82 29.3Z" />
      <circle cx="24" cy="24" r="10.6" fill="#fff" />
      <circle cx="24" cy="24" r="8.6" fill="#4285f4" />
    </svg>
  );
}
