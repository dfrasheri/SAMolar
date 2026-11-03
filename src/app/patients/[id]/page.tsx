"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PatientForm, { type PatientFormData } from "@/components/PatientForm";
import TreatmentsPanel from "@/components/TreatmentsPanel";
import ImagingPanel from "@/components/ImagingPanel";
import PatientHistory from "@/components/PatientHistory";

export default function PatientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [initial, setInitial] = useState<PatientFormData | null>(null);
  const [saved, setSaved] = useState(false);
  const [missing, setMissing] = useState(false);

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
          await fetch(`/api/patients/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          setSaved(true);
        }}
      />
      {saved && <p className="mt-2 text-sm text-brand">Saved.</p>}
      <PatientHistory patientId={id} />
      <TreatmentsPanel patientId={id} />
      <ImagingPanel patientId={id} />
    </div>
  );
}
