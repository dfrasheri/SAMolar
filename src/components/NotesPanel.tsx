"use client";

import { useEffect, useState } from "react";

type Note = { id: string; body: string; authorName: string | null; createdAt: number | null };

export default function NotesPanel({ patientId }: { patientId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/patients/${patientId}/notes`);
    if (res.ok) setNotes(await res.json());
  }

  useEffect(() => {
    load();
  }, [patientId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/patients/${patientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    if (!res.ok) return setError((await res.json()).error || "could not add");
    setText("");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mt-10 max-w-2xl">
      <h2 className="mb-3 text-lg font-semibold">Notes</h2>
      <form onSubmit={add} className="mb-3 flex gap-2 text-sm">
        <input className="flex-1 rounded border px-3 py-2" placeholder="Add a note" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="rounded bg-brand px-3 py-2 text-white hover:bg-brand-dark">Add</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="rounded-lg border bg-white text-sm">
        {notes.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-3 border-b p-3 last:border-0">
            <div>
              <div>{n.body}</div>
              <div className="mt-1 text-xs text-slate-400">
                {n.authorName} · {n.createdAt ? new Date(n.createdAt * 1000).toLocaleDateString("en-GB") : ""}
              </div>
            </div>
            <button onClick={() => remove(n.id)} className="text-xs text-slate-400 hover:text-red-600">Delete</button>
          </li>
        ))}
        {notes.length === 0 && <li className="p-3 text-slate-400">No notes yet.</li>}
      </ul>
    </div>
  );
}
