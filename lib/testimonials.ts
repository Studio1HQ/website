/**
 * Helpers for the client testimonials in data/home.tsx, shared by the home
 * page's testimonial section and the /testimonials page. A plain module (no
 * "use client") so server components can read the values too.
 */

/** Logo mark for each testimonial's company, keyed as companyOf() returns it. */
export const COMPANY_MARKS: Record<string, string> = {
  Jozu: "/assets/logos/jozu.webp",
  "Nebius AI": "/assets/logos/nebius.webp",
  Ittybit: "/assets/logos/ittybit.webp",
  "Entelligence.AI": "/assets/logos/enteligence.webp",
  "Readyset.io": "/assets/logos/readyset.webp",
  CopilotKit: "/assets/logos/copilotkit.webp",
  Crawlee: "/assets/logos/crawlee.webp",
  Opire: "/assets/logos/opire.webp",
  "Permit.io": "/assets/logos/permit.webp",
  "VDK(VMware)": "/assets/logos/vmware.webp",
  Tolgee: "/assets/logos/tolgee.webp",
  WebCrumbs: "/assets/logos/webcrumbs.webp",
  "Pieces.app": "/assets/logos/pieces.webp",
  Latitude: "/assets/logos/latitude.webp",
  "Novita AI": "/assets/logos/novita-ai-mark-green.webp",
};

/** "CEO & Founder Opire" / "COO, Tolgee" -> the company name. */
export function companyOf(role: string) {
  if (role.includes(",")) return role.slice(role.lastIndexOf(",") + 1).trim();
  return role.split(" ").pop() ?? role;
}

/** "CEO & Founder Opire" / "COO, Tolgee" -> the job title alone. */
export function titleOf(role: string) {
  const company = companyOf(role);
  return role.slice(0, role.lastIndexOf(company)).replace(/[,\s]+$/, "");
}
