import { redirect } from "next/navigation";

/** The paper design is now the home page. */
export default function PaperLanding() {
  redirect("/");
}
