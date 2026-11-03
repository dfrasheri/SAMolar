"use client";

import { LOWER, UPPER } from "@/lib/teeth";

type Mark = { tooth: number | null; status: string };

function colour(tooth: number, marks: Mark[]) {
  const here = marks.filter((m) => m.tooth === tooth);
  if (here.some((m) => m.status === "planned")) return "bg-amber-200 border-amber-400";
  if (here.length) return "bg-brand text-white border-brand-dark";
  return "bg-white border-slate-300";
}

export default function ToothChart({
  marks,
  selected,
  onSelect,
}: {
  marks: Mark[];
  selected: number | null;
  onSelect: (tooth: number | null) => void;
}) {
  const row = (teeth: number[]) => (
    <div className="flex gap-1">
      {teeth.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onSelect(selected === t ? null : t)}
          className={`h-9 w-9 rounded border text-xs ${colour(t, marks)} ${selected === t ? "ring-2 ring-slate-900" : ""}`}
        >
          {t}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      {row(UPPER)}
      {row(LOWER)}
      <div className="flex gap-4 text-[10px] text-slate-500">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-200" />planned</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-brand" />done</span>
        <span>click a tooth to pick it</span>
      </div>
    </div>
  );
}
