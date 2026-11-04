"use client";

import { useState } from "react";
import { LANG_NAMES, RECALL_LANGS, recallLang, recallText, waLink, type RecallLang } from "@/lib/recall-messages";

type Recall = { id: string; dueDate: string; reason: string | null; firstName: string | null; phone: string | null; language: string | null };

// The reminder in the patient's language, ready to copy or open in WhatsApp.
export default function RecallMessage({ recall, onContacted, onClose }: { recall: Recall; onContacted: (lang: RecallLang) => void; onClose: () => void }) {
  const [lang, setLang] = useState<RecallLang>(recallLang(recall.language));
  const [text, setText] = useState(recallText(lang, recall));
  const [copied, setCopied] = useState(false);

  function switchLang(next: RecallLang) {
    setLang(next);
    setText(recallText(next, recall));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const link = waLink(recall.phone, text);

  return (
    <div className="rounded-lg border bg-slate-50 p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {RECALL_LANGS.map((l) => (
          <button key={l} onClick={() => switchLang(l)} className={`rounded px-2 py-1 text-xs ${l === lang ? "bg-brand text-white" : "border bg-white hover:bg-slate-100"}`}>
            {LANG_NAMES[l]}
          </button>
        ))}
        {recall.language && recallLang(recall.language) === lang && <span className="ml-1 text-xs text-slate-400">patient language</span>}
      </div>
      <textarea className="h-24 w-full rounded border p-2" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={copy} className="rounded border bg-white px-3 py-1 hover:bg-slate-100">{copied ? "Copied" : "Copy"}</button>
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="rounded border bg-white px-3 py-1 hover:bg-slate-100">Open in WhatsApp</a>
        ) : (
          <span className="text-xs text-slate-400">no usable phone for WhatsApp</span>
        )}
        <button onClick={() => onContacted(lang)} className="rounded bg-brand px-3 py-1 text-white hover:bg-brand-dark">Mark contacted</button>
        <button onClick={onClose} className="text-xs text-slate-500">Close</button>
      </div>
    </div>
  );
}
