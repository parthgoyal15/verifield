import { readFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI, type Content, type GenerateContentConfig, type Part } from "@google/genai";
import { db } from "./store";

let client: GoogleGenAI | undefined;

export const hasGemini = () => Boolean(process.env.GEMINI_API_KEY);
export const geminiModel = () => process.env.GEMINI_MODEL || "gemini-flash-latest";

export function ai() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export async function generate(contents: Content[], config: GenerateContentConfig = {}) {
  return ai().models.generateContent({ model: geminiModel(), contents, config });
}

/** One-shot call that returns JSON matching `schema` (plain JSON Schema). */
export async function generateJson<T>(opts: { system?: string; parts: Part[]; schema: object }): Promise<T> {
  const res = await generate([{ role: "user", parts: opts.parts }], {
    systemInstruction: opts.system,
    responseMimeType: "application/json",
    responseJsonSchema: opts.schema,
  });
  return JSON.parse(res.text ?? "{}") as T;
}

export async function generateText(opts: { system?: string; parts: Part[] }): Promise<string> {
  const res = await generate([{ role: "user", parts: opts.parts }], { systemInstruction: opts.system });
  return (res.text ?? "").trim();
}

export function filePart(fileId: string): Part {
  const f = db().files[fileId];
  return { inlineData: { mimeType: f.mime, data: f.data.toString("base64") } };
}

export async function publicImagePart(publicPath: string): Promise<Part> {
  const data = await readFile(path.join(process.cwd(), "public", publicPath));
  return { inlineData: { mimeType: "image/png", data: data.toString("base64") } };
}

export const LANG_NAME: Record<string, string> = { vi: "Vietnamese", tl: "Tagalog (Filipino)", hi: "Hindi (Devanagari script)", en: "English" };
