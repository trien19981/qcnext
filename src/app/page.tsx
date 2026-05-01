import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const c = await cookies();
  const authed = c.get("qc_auth")?.value === "1";
  redirect(authed ? "/projects" : "/login");
}
