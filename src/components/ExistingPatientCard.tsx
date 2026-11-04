import Link from "next/link";

export type ExistingMatch = { id: string; name: string; phone: string | null; email: string | null; by: "phone" | "email" };

// Shown when the details typed belong to a patient who is already here.
export default function ExistingPatientCard({
  match,
  canForce,
  onForce,
  onCancel,
}: {
  match: ExistingMatch;
  canForce: boolean;
  onForce?: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 max-w-2xl rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
      <div className="font-medium text-amber-900">
        This {match.by === "phone" ? "phone number" : "email"} already belongs to {match.name || "another patient"}.
      </div>
      <div className="mt-1 text-xs text-amber-800">
        {match.phone && <span className="mr-3">phone {match.phone}</span>}
        {match.email && <span>email {match.email}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link href={`/patients/${match.id}`} className="rounded bg-brand px-3 py-1 text-white hover:bg-brand-dark">Open {match.name || "that patient"}</Link>
        {canForce && onForce && (
          <button onClick={onForce} className="rounded border border-amber-400 px-3 py-1 hover:bg-amber-100">Not the same person, create anyway</button>
        )}
        <button onClick={onCancel} className="text-xs text-slate-600 underline">Change the details</button>
      </div>
      {!canForce && <p className="mt-2 text-xs text-amber-800">Two patients cannot share one phone number.</p>}
    </div>
  );
}
