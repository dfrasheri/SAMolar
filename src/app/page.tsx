import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function Home() {
  if (!getSessionUser()) redirect("/login");

  return (
    <div>
      <h1 className="text-xl font-semibold">Waiting room</h1>
      <p className="mt-2 text-sm text-slate-500">Nothing here yet. Healthy, or just not admitted.</p>
    </div>
  );
}
