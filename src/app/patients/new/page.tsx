"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PatientForm from "@/components/PatientForm";

export default function NewPatientPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Seat a patient</h1>
      <PatientForm
        submitLabel="Create patient"
        onSubmit={async (data) => {
          setError("");
          const res = await fetch("/api/patients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!res.ok) return setError((await res.json()).error || "could not save");
          router.push("/patients");
        }}
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
