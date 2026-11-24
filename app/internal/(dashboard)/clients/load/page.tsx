import { redirect } from "next/navigation";

/** Owner load is gone: your own pieces are on your Tasks week, each project's on its month. */
export default function ClientsLoadPage() {
  redirect("/tasks");
}
