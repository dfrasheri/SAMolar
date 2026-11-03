"use client";

import { useEffect, useRef, useState } from "react";

type Image = { id: string; width: number; height: number; caption: string | null };
type Obj = {
  id: string;
  box: { left: number; top: number; right: number; bottom: number };
  confidence: number | null;
  svgPath: string;
};
type Seg = { id: string; prompt: string; source: string; objects: Obj[] };

const COLOURS = ["#0f766e", "#b45309", "#7c3aed", "#be123c", "#1d4ed8", "#4d7c0f", "#c2410c", "#0e7490"];
const CHIPS = ["tooth", "molar", "premolar", "dental implant", "crown"];

function naturalSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = url;
  });
}

export default function ImagingPanel({ patientId }: { patientId: string }) {
  const [images, setImages] = useState<Image[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [seg, setSeg] = useState<Seg | null>(null);
  const [prompt, setPrompt] = useState("tooth");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function load(select?: string) {
    const res = await fetch(`/api/patients/${patientId}/images`);
    if (!res.ok) return;
    const rows: Image[] = await res.json();
    setImages(rows);
    if (select) setCurrent(select);
    else if (!current && rows.length) setCurrent(rows[0].id);
  }

  useEffect(() => {
    load();
  }, [patientId]);

  useEffect(() => {
    setSeg(null);
    if (!current) return;
    fetch(`/api/images/${current}/segment`)
      .then((r) => r.json())
      .then((rows: Seg[]) => setSeg(rows[0] ?? null));
  }, [current]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const size = await naturalSize(file);
    const form = new FormData();
    form.append("file", file);
    form.append("width", String(size.w));
    form.append("height", String(size.h));
    const res = await fetch(`/api/patients/${patientId}/images`, { method: "POST", body: form });
    const data = await res.json();
    if (fileInput.current) fileInput.current.value = "";
    if (!res.ok) return setError(data.error || "could not upload");
    load(data.id);
  }

  async function run() {
    if (!current) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/images/${current}/segment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "segmentation failed");
    setSeg(data);
  }

  const image = images.find((i) => i.id === current);

  return (
    <div className="mt-10 max-w-3xl">
      <h2 className="mb-3 text-lg font-semibold">X-rays</h2>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} />
        {images.map((i, n) => (
          <button
            key={i.id}
            onClick={() => setCurrent(i.id)}
            className={`rounded border px-2 py-1 ${current === i.id ? "border-brand bg-brand-soft text-brand-dark" : "bg-white"}`}
          >
            {i.caption || `image ${n + 1}`}
          </button>
        ))}
      </div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {!image && <p className="text-sm text-slate-400">No X-rays yet. Upload a panoramic image to try the segmentation.</p>}

      {image && (
        <>
          <div className="relative mb-3 overflow-hidden rounded-lg border bg-black">
            <img src={`/api/images/${image.id}/file`} alt="x-ray" className="block w-full" />
            {seg && (
              <svg viewBox={`0 0 ${image.width} ${image.height}`} className="absolute inset-0 h-full w-full">
                {seg.objects.map((o, n) => (
                  <g key={o.id} transform={`translate(${o.box.left} ${o.box.top})`}>
                    <path d={o.svgPath} fill={COLOURS[n % COLOURS.length]} fillOpacity={0.45} stroke={COLOURS[n % COLOURS.length]} strokeWidth={2} />
                  </g>
                ))}
              </svg>
            )}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => setPrompt(c)} className={`rounded border px-2 py-1 ${prompt === c ? "border-brand bg-brand-soft" : "bg-white"}`}>
                {c}
              </button>
            ))}
            <input className="rounded border px-2 py-1" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <button onClick={run} disabled={busy} className="rounded bg-brand px-3 py-1.5 text-white hover:bg-brand-dark">
              {busy ? "Segmenting..." : "Segment"}
            </button>
          </div>

          {seg && (
            <p className="text-sm text-slate-600">
              Found {seg.objects.length} for "{seg.prompt}".{" "}
              {seg.source === "mock" ? (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                  mock: no MODEL_API_KEY set, these shapes are placeholders, not a model result
                </span>
              ) : (
                <span className="rounded bg-brand-soft px-1.5 py-0.5 text-xs text-brand-dark">SAM 3.1 via Meta Model API</span>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
