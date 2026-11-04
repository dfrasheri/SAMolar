"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PatientForm, { type PatientFormData } from "@/components/PatientForm";
import ExistingPatientCard, { type ExistingMatch } from "@/components/ExistingPatientCard";

export default function NewPatientPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [match, setMatch] = useState<{ match: ExistingMatch; canForce: boolean; data: PatientFormData } | null>(null);

  async function create(data: PatientFormData, force = false) {
    setError("");
    setMatch(null);
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, force }),
    });
    const j = await res.json();
    if (res.status === 409 && j.code === "patient-exists") return setMatch({ match: j.match, canForce: j.canForce, data });
    if (!res.ok) return setError(j.error || "could not save");
    router.push(`/patients/${j.id}`);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Seat a patient</h1>
      <PatientForm
        submitLabel="Create patient"
        onSubmit={(data) => create(data)}
      />
      {match && (
        <ExistingPatientCard match={match.match} canForce={match.canForce} onForce={() => create(match.data, true)} onCancel={() => setMatch(null)} />
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
