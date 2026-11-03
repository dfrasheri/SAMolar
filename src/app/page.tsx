import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default function Home() {
  const user = getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-brand">SAMolar</h1>
      <p className="mt-2 text-sm text-slate-500">Signed in as {user.name}.</p>
      <div className="mt-4">
        <LogoutButton />
      </div>
    </main>
  );
}
