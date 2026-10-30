/**
 * Helpers for the client testimonials in data/home.tsx, shared by the home
 * page's testimonial section and the /testimonials page. A plain module (no
 * "use client") so server components can read the values too.
 */

/** Logo mark for each testimonial's company, keyed as companyOf() returns it. */
export const COMPANY_MARKS: Record<string, string> = {
  Jozu: "/assets/jozu.webp",
  "Nebius AI": "/assets/nebius.webp",
  Ittybit: "/assets/ittybit.webp",
  "Entelligence.AI": "/assets/enteligence.webp",
  "Readyset.io": "/assets/readyset.webp",
  CopilotKit: "/assets/copilotkit.webp",
  Crawlee: "/assets/crawlee.webp",
  Opire: "/assets/opire.webp",
  "Permit.io": "/assets/permit.webp",
  "VDK(VMware)": "/assets/vmware.webp",
  Tolgee: "/assets/tolgee.webp",
  WebCrumbs: "/assets/webcrumbs.webp",
  "Pieces.app": "/assets/pieces.webp",
  Latitude: "/assets/latitude.webp",
  "Novita AI": "/assets/novita-ai-mark-green.webp",
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
