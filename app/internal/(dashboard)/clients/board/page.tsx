import { redirect } from "next/navigation";

/** The cross-client "This week" board is gone: each project's month is the place now. */
export default function ClientsBoardPage() {
  redirect("/clients");
}
