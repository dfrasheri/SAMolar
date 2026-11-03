import { decodeMaskToSVGPath, parseImageStream, recordsOfKind } from "@meta-sam/parser";

export type SegObject = {
  id: string;
  box: { left: number; top: number; right: number; bottom: number };
  confidence: number | null;
  svgPath: string;
};

export type SegResult = { objects: SegObject[]; source: "meta" | "mock" };

const SAFE_PATH = /^[MLZAa0-9.\s,-]*$/;

export function cleanPrompt(raw: unknown) {
  const p = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return /^[a-z][a-z -]{0,39}$/.test(p) && p.split(/\s+/).length <= 4 ? p : null;
}

export function cleanObjects(list: unknown, width: number, height: number): SegObject[] {
  if (!Array.isArray(list)) return [];
  const out: SegObject[] = [];
  for (const o of list.slice(0, 200)) {
    const b = o?.box;
    const ok =
      typeof o?.id === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(o.id) &&
      b && [b.left, b.top, b.right, b.bottom].every(Number.isInteger) &&
      b.left >= 0 && b.top >= 0 && b.right <= width && b.bottom <= height && b.right > b.left && b.bottom > b.top &&
      typeof o.svgPath === "string" && o.svgPath.length < 200000 && SAFE_PATH.test(o.svgPath);
    if (!ok) continue;
    const c = typeof o.confidence === "number" && o.confidence >= 0 && o.confidence <= 1 ? o.confidence : null;
    out.push({ id: o.id, box: { left: b.left, top: b.top, right: b.right, bottom: b.bottom }, confidence: c, svgPath: o.svgPath });
  }
  return out;
}

export async function parseSamText(raw: string): Promise<SegObject[]> {
  async function* events() {
    yield { type: "response.output_text.delta", item_id: "m", output_index: 0, content_index: 0, delta: raw };
    yield { type: "response.output_text.done", item_id: "m", output_index: 0, content_index: 0, text: raw };
    yield { type: "response.completed" };
  }
  const result = await parseImageStream(events()).finalResult;
  const boxes = new Map(recordsOfKind(result.records, "box").map((b) => [b.objectId, b]));
  return recordsOfKind(result.records, "mask").map((m) => ({
    id: m.objectId,
    box: { left: m.bounds.left, top: m.bounds.top, right: m.bounds.right, bottom: m.bounds.bottom },
    confidence: m.confidence ?? boxes.get(m.objectId)?.confidence ?? null,
    svgPath: decodeMaskToSVGPath(m.mask),
  }));
}

function mockObjects(width: number, height: number, prompt: string): SegObject[] {
  const n = 3 + (prompt.length % 5);
  const w = Math.floor(width / (n + 2));
  const h = Math.floor(height / 4);
  const top = Math.floor(height / 2 - h / 2);
  return Array.from({ length: n }, (_, i) => {
    const left = w + i * w;
    const rx = w / 2 - 2;
    const ry = h / 2;
    return {
      id: String(i),
      box: { left, top, right: left + w, bottom: top + h },
      confidence: null,
      svgPath: `M ${w / 2 - rx} ${ry} A ${rx} ${ry} 0 1 0 ${w / 2 + rx} ${ry} A ${rx} ${ry} 0 1 0 ${w / 2 - rx} ${ry} Z`,
    };
  });
}

export async function segmentImage(dataUrl: string, prompt: string, width: number, height: number): Promise<SegResult> {
  const key = process.env.MODEL_API_KEY?.trim();
  if (!key) return { objects: mockObjects(width, height, prompt), source: "mock" };

  const base = process.env.META_API_BASE?.trim() || "https://api.meta.ai/v1";
  const res = await fetch(`${base}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "sam-3.1",
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: dataUrl },
          ],
        },
      ],
      stream: false,
      metadata: { include_confidence: "true" },
    }),
  });
  if (!res.ok) throw new Error(`segmentation service answered ${res.status}`);
  const body = await res.json();
  const raw: string =
    body.output_text ?? (body.output || []).flatMap((o: any) => o.content || []).map((c: any) => c.text || "").join("");
  return { objects: cleanObjects(await parseSamText(raw), width, height), source: "meta" };
}
