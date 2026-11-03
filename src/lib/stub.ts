import crypto from "crypto";

export function stub(kind: string, data: Record<string, unknown>) {
  console.log(`[stub] ${kind}`, JSON.stringify(data));
}

export function stubCharge(method: string, amount: number) {
  const ref = `stub-${method}-${crypto.randomBytes(3).toString("hex")}`;
  stub("charge", { method, amount, ref });
  return ref;
}
