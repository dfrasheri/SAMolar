"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PatientForm, { type PatientFormData } from "@/components/PatientForm";
import TreatmentsPanel from "@/components/TreatmentsPanel";
import ImagingPanel from "@/components/ImagingPanel";
import PatientHistory from "@/components/PatientHistory";
import NotesPanel from "@/components/NotesPanel";
import ExistingPatientCard, { type ExistingMatch } from "@/components/ExistingPatientCard";

export default function PatientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [initial, setInitial] = useState<PatientFormData | null>(null);
  const [saved, setSaved] = useState(false);
  const [missing, setMissing] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [match, setMatch] = useState<ExistingMatch | null>(null);

  useEffect(() => {
    fetch(`/api/patients/${id}`).then(async (res) => {
      if (!res.ok) return setMissing(true);
      const p = await res.json();
      setInitial({
        firstName: p.firstName ?? "", lastName: p.lastName ?? "", phone: p.phone ?? "",
        email: p.email ?? "", country: p.country ?? "", city: p.city ?? "",
        language: p.language ?? "", notes: p.notes ?? "",
      });
    });
  }, [id]);

  async function archive() {
    await fetch(`/api/patients/${id}`, { method: "DELETE" });
    router.push("/patients");
  }

  if (missing) return <p className="text-sm text-slate-500">No such patient.</p>;
  if (!initial) return <p className="text-sm text-slate-400">Loading...</p>;

  return (
    <div>
      <div className="mb-4 flex max-w-2xl items-center justify-between">
        <h1 className="text-xl font-semibold">Patient</h1>
        <button onClick={archive} className="text-sm text-red-600">Archive</button>
      </div>
      <PatientForm
        initial={initial}
        submitLabel="Save"
        onSubmit={async (data) => {
          setSaved(false);
          setSaveError("");
          setMatch(null);
          const res = await fetch(`/api/patients/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const j = await res.json().catch(() => ({}));
          if (res.status === 409 && j.match) return setMatch(j.match);
          if (!res.ok) return setSaveError(j.error || "could not save");
          setSaved(true);
        }}
      />
      {saved && <p className="mt-2 text-sm text-brand">Saved.</p>}
      {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}
      {match && <ExistingPatientCard match={match} canForce={false} onCancel={() => setMatch(null)} />}
      <NotesPanel patientId={id} />
      <PatientHistory patientId={id} />
      <TreatmentsPanel patientId={id} />
      <ImagingPanel patientId={id} />
    </div>
  );
}
