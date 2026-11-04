const STYLE = {
  early: "bg-emerald-50 text-emerald-700",
  ontime: "bg-sky-50 text-sky-700",
  late: "bg-red-50 text-red-700",
} as const;

const LABEL = { early: "early", ontime: "on time", late: "late" } as const;

export default function BandChip({ band, lateBy }: { band: keyof typeof STYLE | null; lateBy?: number }) {
  if (!band) return <span className="text-xs text-slate-400">back in</span>;
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${STYLE[band]}`}>
      {LABEL[band]}
      {band === "late" && lateBy ? ` +${lateBy} min` : ""}
    </span>
  );
}
