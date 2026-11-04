// Recall reminder text in the patient's own language. Pure, so the page and
// the server write the same words. Unknown languages fall back to English.

export const RECALL_LANGS = ["en", "sq", "it", "de"] as const;
export type RecallLang = (typeof RECALL_LANGS)[number];

export const LANG_NAMES: Record<RecallLang, string> = { en: "English", sq: "Shqip", it: "Italiano", de: "Deutsch" };

export function recallLang(raw: unknown): RecallLang {
  const l = typeof raw === "string" ? raw.toLowerCase().slice(0, 2) : "";
  return (RECALL_LANGS as readonly string[]).includes(l) ? (l as RecallLang) : "en";
}

type Facts = { firstName?: string | null; reason?: string | null; dueDate?: string | null };

const TEXT: Record<RecallLang, (f: Required<Record<keyof Facts, string>>) => string> = {
  en: (f) => `Hello ${f.firstName}, this is a friendly reminder from the clinic: it is time for your ${f.reason}${f.dueDate ? ` (due ${f.dueDate})` : ""}. Reply to this message or call us to book a visit.`,
  sq: (f) => `Përshëndetje ${f.firstName}, ju kujtojmë nga klinika se është koha për ${f.reason}${f.dueDate ? ` (data ${f.dueDate})` : ""}. Na shkruani ose na telefononi për të rezervuar një vizitë.`,
  it: (f) => `Buongiorno ${f.firstName}, un promemoria dalla clinica: è il momento per ${f.reason}${f.dueDate ? ` (entro il ${f.dueDate})` : ""}. Risponda a questo messaggio o ci chiami per fissare una visita.`,
  de: (f) => `Guten Tag ${f.firstName}, eine freundliche Erinnerung der Praxis: es ist Zeit für ${f.reason}${f.dueDate ? ` (fällig am ${f.dueDate})` : ""}. Antworten Sie auf diese Nachricht oder rufen Sie uns an, um einen Termin zu vereinbaren.`,
};

const FALLBACK_REASON: Record<RecallLang, string> = { en: "checkup", sq: "kontrollin", it: "il controllo", de: "Ihre Kontrolle" };
const FALLBACK_NAME: Record<RecallLang, string> = { en: "there", sq: "", it: "", de: "" };

export function recallText(lang: RecallLang, facts: Facts) {
  return TEXT[lang]({
    firstName: facts.firstName?.trim() || FALLBACK_NAME[lang],
    reason: facts.reason?.trim() || FALLBACK_REASON[lang],
    dueDate: facts.dueDate || "",
  }).replace(/\s+,/g, ",");
}

// wa.me wants digits only, no plus and no leading 00.
export function waLink(phone: string | null | undefined, text: string) {
  const digits = (phone ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (digits.length < 6) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
