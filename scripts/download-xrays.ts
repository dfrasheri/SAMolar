import fs from "fs";
import path from "path";

const OUT = path.resolve(process.env.DATA_DIR || "./data", "xrays");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "SAMolarDemo/0.1 (portfolio project; https://github.com/dfrasheri/SAMolar)";
const OK_LICENSES = ["CC BY 3.0", "CC BY 4.0", "CC BY-SA 3.0", "CC BY-SA 4.0", "CC0", "Public domain"];

const FILES = [
  { title: "Basic panoramic radiograph.jpg", slug: "panoramic-1" },
  { title: "Mixed dentition pan.jpg", slug: "panoramic-2" },
  { title: "Deciduous teeth-boy-OPG-10,10,2019.jpg", slug: "panoramic-3" },
];

const strip = (html: string) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function info(title: string) {
  const url = `${API}?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&iiextmetadatafilter=LicenseShortName|Artist&titles=${encodeURIComponent("File:" + title)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`commons api ${res.status}`);
  const page = Object.values((await res.json()).query.pages)[0] as any;
  const meta = page.imageinfo?.[0]?.extmetadata;
  if (!meta) throw new Error("file not found on commons");
  return {
    license: strip(meta.LicenseShortName?.value ?? ""),
    artist: strip(meta.Artist?.value ?? "unknown"),
    page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const credits: string[] = [];

  for (const f of FILES) {
    const target = path.join(OUT, `${f.slug}.jpg`);
    try {
      const meta = await info(f.title);
      if (!OK_LICENSES.includes(meta.license)) {
        console.log(`skip ${f.title}: licence is "${meta.license}"`);
        continue;
      }
      if (!fs.existsSync(target)) {
        const res = await fetch(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f.title)}?width=1280`, { headers: { "User-Agent": UA } });
        if (!res.ok) throw new Error(`download ${res.status}`);
        fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
        console.log(`saved ${f.slug}.jpg`);
      } else {
        console.log(`have ${f.slug}.jpg`);
      }
      credits.push(`${f.slug}.jpg | ${f.title} | ${meta.artist} | ${meta.license} | ${meta.page}`);
    } catch (e) {
      console.log(`failed ${f.title}: ${(e as Error).message}`);
    }
  }

  fs.writeFileSync(path.join(OUT, "CREDITS.txt"), credits.join("\n") + "\n");
  console.log(`${credits.length} of ${FILES.length} images ready in ${OUT}`);
}

main();
