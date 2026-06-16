import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/context";

export default async function Home() {
  const ctx = await getCurrentUser();
  redirect(ctx ? "/dashboard" : "/login");
}
