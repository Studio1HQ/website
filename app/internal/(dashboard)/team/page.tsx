import { redirect } from "next/navigation";

/** Team & roles is now the Team tab on People: one list of everyone. */
export default function TeamPage() {
  redirect("/people");
}
