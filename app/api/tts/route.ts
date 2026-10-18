import { ai, generateText, hasGemini, LANG_NAME } from "@/lib/gemini";
import type { Lang } from "@/lib/types";

// Gemini TTS returns raw 16-bit PCM at 24 kHz; wrap it in a WAV header for the browser.
function pcmToWav(pcm: Buffer, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function POST(req: Request) {
  const { text, lang } = (await req.json()) as { text?: string; lang?: Lang };
  if (!text?.trim()) return Response.json({ error: "No text" }, { status: 400 });
  // 501 tells the client to fall back to the browser's speechSynthesis.
  if (!hasGemini()) return Response.json({ error: "TTS unavailable" }, { status: 501 });
  const language = LANG_NAME[lang ?? "en"] ?? "English";
  try {
    // Older messages may be in a language the farmer has since switched away from: translate first.
    const spoken = await generateText({
      system: `Translate the message into ${language} for a farmer to hear. If it is already in ${language}, return it unchanged. Output only the message.`,
      parts: [{ text: text.slice(0, 1200) }],
    }).catch(() => text);
    const res = await ai().models.generateContent({
      model: process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts",
      contents: [{ role: "user", parts: [{ text: `Read this aloud in ${language}, warmly and slowly: ${spoken || text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
      },
    });
    const data = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
    if (!data) return Response.json({ error: "No audio returned" }, { status: 501 });
    return new Response(new Uint8Array(pcmToWav(Buffer.from(data, "base64"))), { headers: { "Content-Type": "audio/wav" } });
  } catch (e) {
    console.error("[tts]", e);
    return Response.json({ error: (e as Error).message }, { status: 501 });
  }
}
