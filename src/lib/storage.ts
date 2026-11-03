import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOADS = path.join(path.resolve(process.env.DATA_DIR || "./data"), "uploads");

export const MAX_UPLOAD = 10 * 1024 * 1024;

export type Sniffed = { mime: "image/png" | "image/jpeg" | "image/webp"; width: number | null; height: number | null };

export function sniffImage(b: Buffer): Sniffed | null {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
    return { mime: "image/png", width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) break;
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { mime: "image/jpeg", height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
    return { mime: "image/jpeg", width: null, height: null };
  }
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    return { mime: "image/webp", width: null, height: null };
  }
  return null;
}

export function saveUpload(bytes: Buffer, mime: string) {
  fs.mkdirSync(UPLOADS, { recursive: true });
  const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS, name), bytes);
  return name;
}

export function readUpload(name: string) {
  return fs.readFileSync(path.join(UPLOADS, path.basename(name)));
}
