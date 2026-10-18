import { dHash, normaliseImage, readPhotoMeta } from "@/lib/agent/media";
import { db, nowIso, uid } from "@/lib/store";
import type { StoredFile } from "@/lib/types";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const out: { id: string; kind: StoredFile["kind"]; url: string }[] = [];

  for (const entry of form.getAll("file")) {
    if (!(entry instanceof File)) continue;
    if (entry.size > MAX_BYTES) return Response.json({ error: `${entry.name} is larger than 15 MB` }, { status: 413 });
    const raw = Buffer.from(await entry.arrayBuffer());
    const id = uid("file");
    let file: StoredFile;

    if (entry.type.startsWith("image/")) {
      // Read EXIF before normalising: re-encoding strips it.
      const meta = await readPhotoMeta(raw);
      let data: Buffer;
      try {
        data = await normaliseImage(raw);
      } catch {
        return Response.json({ error: `${entry.name} is not a readable image` }, { status: 400 });
      }
      file = { id, kind: "image", mime: "image/jpeg", data, createdAt: nowIso(), meta, hash: await dHash(data) };
    } else if (entry.type.startsWith("audio/")) {
      file = { id, kind: "audio", mime: entry.type.split(";")[0], data: raw, createdAt: nowIso() };
    } else {
      return Response.json({ error: `Unsupported file type ${entry.type}` }, { status: 415 });
    }

    db().files[id] = file;
    out.push({ id, kind: file.kind, url: `/api/files/${id}` });
  }
  return Response.json({ files: out });
}
