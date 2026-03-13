// Redirect to /admin — the main admin page handles everything
import { redirect } from "next/navigation";
export default function AdminDashboardRedirect() {
  redirect("/admin");
}
