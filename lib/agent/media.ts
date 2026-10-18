import exifr from "exifr";
import sharp from "sharp";
import { filePart, generateJson, hasGemini, LANG_NAME } from "../gemini";
import type { PhotoMeta, StoredFile } from "../types";

const EDITING_SOFTWARE = /photoshop|snapseed|picsart|lightroom|gimp|canva|meitu|facetune|pixlr/i;

export async function readPhotoMeta(buf: Buffer): Promise<PhotoMeta> {
  try {
    const exif = await exifr.parse(buf, { gps: true, tiff: true, exif: true });
    if (!exif) return {};
    const taken: Date | undefined = exif.DateTimeOriginal ?? exif.CreateDate;
    return {
      lat: typeof exif.latitude === "number" ? exif.latitude : undefined,
      lng: typeof exif.longitude === "number" ? exif.longitude : undefined,
      takenAt: taken instanceof Date && !isNaN(taken.getTime()) ? taken.toISOString() : undefined,
      software: typeof exif.Software === "string" ? exif.Software : undefined,
    };
  } catch {
    return {};
  }
}

export const isEditingSoftware = (s?: string) => Boolean(s && EDITING_SOFTWARE.test(s));

/** Difference hash: 64-bit perceptual fingerprint, robust to resizing and recompression. */
export async function dHash(buf: Buffer): Promise<string> {
  const px = await sharp(buf).rotate().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? "1" : "0";
  }
  return BigInt("0b" + bits).toString(16).padStart(16, "0");
}

export function hamming(a: string, b: string) {
  let x = BigInt("0x" + a) ^ BigInt("0x" + b);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

/** Normalise uploads: images become max-1600px JPEGs (EXIF is read first). */
export async function normaliseImage(buf: Buffer) {
  return sharp(buf).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
}

export async function coachPhoto(file: StoredFile): Promise<NonNullable<StoredFile["coach"]>> {
  if (!hasGemini()) return { usable: true, issue: "", tip: "" };
  return generateJson({
    system:
      "You check photos farmers send as insurance claim evidence. A usable photo clearly shows a crop field " +
      "(or flood damage to it), is in focus, reasonably lit, and shows enough of the field to judge damage. " +
      "Be lenient: only mark unusable if an assessor genuinely could not judge damage from it.",
    parts: [filePart(file.id), { text: "Is this photo usable as claim evidence?" }],
    schema: {
      type: "object",
      properties: {
        usable: { type: "boolean" },
        issue: { type: "string", description: "Short problem description, empty if usable" },
        tip: { type: "string", description: "One short instruction for a better photo, empty if usable" },
      },
      required: ["usable", "issue", "tip"],
    },
  });
}

export async function transcribe(file: StoredFile, lang: string): Promise<NonNullable<StoredFile["transcript"]>> {
  if (!hasGemini()) {
    return { text: "(voice note, set GEMINI_API_KEY to transcribe)", english: "(voice note)" };
  }
  return generateJson({
    system: `Transcribe the farmer's voice note. The farmer most likely speaks ${LANG_NAME[lang] ?? lang}.`,
    parts: [filePart(file.id), { text: "Transcribe verbatim, then translate to English." }],
    schema: {
      type: "object",
      properties: { text: { type: "string" }, english: { type: "string" } },
      required: ["text", "english"],
    },
  });
}
