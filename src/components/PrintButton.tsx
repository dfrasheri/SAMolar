"use client";

export default function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="rounded bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark">
      {label}
    </button>
  );
}
