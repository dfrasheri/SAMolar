"use client";

import { useState } from "react";

export type PatientFormData = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  language: string;
  notes: string;
};

export const emptyPatient: PatientFormData = {
  firstName: "", lastName: "", phone: "", email: "", country: "", city: "", language: "", notes: "",
};

const inputs: { key: keyof PatientFormData; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "language", label: "Language" },
];

export default function PatientForm({
  initial = emptyPatient,
  submitLabel,
  onSubmit,
}: {
  initial?: PatientFormData;
  submitLabel: string;
  onSubmit: (data: PatientFormData) => Promise<void>;
}) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSubmit(data);
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="grid max-w-2xl grid-cols-2 gap-3 rounded-lg border bg-white p-4">
      {inputs.map(({ key, label }) => (
        <label key={key} className="text-xs text-slate-500">
          {label}
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900"
            value={data[key]}
            onChange={(e) => setData({ ...data, [key]: e.target.value })}
          />
        </label>
      ))}
      <label className="col-span-2 text-xs text-slate-500">
        Notes
        <textarea
          className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900"
          rows={3}
          value={data.notes}
          onChange={(e) => setData({ ...data, notes: e.target.value })}
        />
      </label>
      <div className="col-span-2">
        <button disabled={saving} className="rounded bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark">
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
