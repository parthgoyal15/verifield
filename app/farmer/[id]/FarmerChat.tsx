"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, LaneBadge, Logo, money, pct } from "@/components/ui";
import { getJson, postJson, type FarmerView, type MessageView } from "@/lib/client/api";
import { blobToWav } from "@/lib/client/wav";
import { T as MSG } from "@/lib/i18n";
import { COUNTRY_LANGS, eventName, formatDay, LANG_LABEL, SPEECH_LANG } from "@/lib/locale";
import type { CheckKey, DetailKey, Lang, MessageCard } from "@/lib/types";

const T: Record<Lang, Record<string, string>> = {
  vi: {
    placeholder: "Nhập tin nhắn", typing: "Verifield đang trả lời…", recording: "Đang ghi âm… chạm để gửi", wallet: "Ví", send: "Gửi",
    choose: "Bạn muốn trò chuyện bằng ngôn ngữ nào?", warning: "Cảnh báo thời tiết", advance: "Đã chuyển tạm ứng", settlement: "Đã chuyển khoản cuối",
    claim: "Yêu cầu", confidence: "Độ tin cậy", payout: "bồi thường", certificate: "Giấy chứng nhận thiệt hại", openCert: "Mở giấy chứng nhận để xin hỗ trợ →",
    enrollTitle: "Bảo hiểm mùa màng cho vụ sau", from: "Từ", enroll: "Đăng ký", enrolled: "✓ Đã gửi yêu cầu", listen: "Nghe",
    dTitle: "Thông tin yêu cầu bồi thường", dOnFile: "Đã có trong hồ sơ", dPolicy: "Hợp đồng", dField: "Ruộng", dCrop: "Cây trồng", dSown: "gieo", dYou: "Bạn cung cấp",
    dDate: "Ngày thiệt hại", dCause: "Nguyên nhân", dArea: "Diện tích bị hại", dLoss: "Mức mất mùa", dPayout: "Nhận tiền qua",
    dStatement: "Tôi cam đoan thông tin trên là đúng sự thật, ảnh chụp đúng ruộng của tôi và tôi chưa yêu cầu bồi thường cho thiệt hại này ở nơi khác.",
    dConfirm: "Tôi xác nhận và gửi yêu cầu", dSigned: "✓ Đã ký xác nhận",
  },
  tl: {
    placeholder: "Mag-type ng mensahe", typing: "Sumasagot si Verifield…", recording: "Nagre-record… pindutin para ipadala", wallet: "Wallet", send: "Ipadala",
    choose: "Anong wika ang gusto mong gamitin?", warning: "Babala sa panahon", advance: "Naipadala ang paunang bayad", settlement: "Naipadala ang huling bayad",
    claim: "Claim", confidence: "Kumpiyansa", payout: "bayad", certificate: "Sertipiko ng Pinsala", openCert: "Buksan ang sertipiko para sa tulong →",
    enrollTitle: "Crop insurance para sa susunod na season", from: "Mula", enroll: "Mag-enroll", enrolled: "✓ Naipadala ang request", listen: "Pakinggan",
    dTitle: "Mga detalye ng claim", dOnFile: "Nasa rekord na", dPolicy: "Polisiya", dField: "Palayan", dCrop: "Pananim", dSown: "itinanim", dYou: "Sinabi mo",
    dDate: "Petsa ng pinsala", dCause: "Sanhi", dArea: "Nasirang lugar", dLoss: "Nawalang pananim", dPayout: "Bayad sa",
    dStatement: "Pinapatunayan kong totoo ang impormasyong ito, sa aking palayan ang mga litrato, at hindi pa ako nag-claim para sa pinsalang ito sa iba.",
    dConfirm: "Kinukumpirma ko, ipadala ang claim", dSigned: "✓ Nakumpirma",
  },
  hi: {
    placeholder: "संदेश लिखें", typing: "Verifield जवाब दे रहा है…", recording: "रिकॉर्डिंग… भेजने के लिए दबाएँ", wallet: "वॉलेट", send: "भेजें",
    choose: "आप किस भाषा में बात करना चाहेंगे?", warning: "मौसम चेतावनी", advance: "अग्रिम राशि भेजी गई", settlement: "अंतिम भुगतान भेजा गया",
    claim: "दावा", confidence: "भरोसा", payout: "भुगतान", certificate: "नुकसान प्रमाणपत्र", openCert: "राहत आवेदन के लिए प्रमाणपत्र खोलें →",
    enrollTitle: "अगले सीज़न के लिए फसल बीमा", from: "शुरुआत", enroll: "नाम लिखवाएँ", enrolled: "✓ अनुरोध भेजा गया", listen: "सुनें",
    dTitle: "दावे का विवरण", dOnFile: "रिकॉर्ड में दर्ज", dPolicy: "पॉलिसी", dField: "खेत", dCrop: "फसल", dSown: "बुवाई", dYou: "आपने बताया",
    dDate: "नुकसान की तारीख", dCause: "कारण", dArea: "प्रभावित क्षेत्र", dLoss: "फसल नुकसान", dPayout: "भुगतान खाता",
    dStatement: "मैं घोषणा करता/करती हूँ कि यह जानकारी सही है, फोटो मेरे ही खेत की हैं, और इस नुकसान के लिए मैंने कहीं और दावा नहीं किया है।",
    dConfirm: "मैं पुष्टि करता/करती हूँ, दावा भेजें", dSigned: "✓ पुष्टि हो गई",
  },
  en: {
    placeholder: "Type a message", typing: "Verifield is replying…", recording: "Recording… tap to send", wallet: "Wallet", send: "Send",
    choose: "Which language would you like to chat in?", warning: "Weather warning", advance: "Cash advance sent", settlement: "Final payment sent",
    claim: "Claim", confidence: "Confidence", payout: "payout", certificate: "Verified Damage Certificate", openCert: "Open certificate for relief application →",
    enrollTitle: "Crop insurance for next season", from: "From", enroll: "Enroll", enrolled: "✓ Request sent", listen: "Listen",
    dTitle: "Claim details", dOnFile: "Already on file", dPolicy: "Policy", dField: "Field", dCrop: "Crop", dSown: "sown", dYou: "You told us",
    dDate: "Date of loss", dCause: "Cause", dArea: "Area damaged", dLoss: "Crop lost", dPayout: "Payout to",
    dStatement: "I declare this information is true, the photos are of my own field, and I have not claimed for this loss anywhere else.",
    dConfirm: "I confirm, submit my claim", dSigned: "✓ Confirmed",
  },
};
const CROP: Record<Lang, Record<string, string>> = { vi: { rice: "Lúa" }, tl: { rice: "Palay" }, hi: { rice: "धान" }, en: { rice: "Rice" } };
const CHECK_LABEL: Record<CheckKey, string> = { photos: "Photos", satellite: "Satellite", weather: "Rainfall", policy: "Policy", fraud: "Fraud" };

type Pending = { file: File; preview: string };

export default function FarmerChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [view, setView] = useState<FarmerView>();
  const [error, setError] = useState<string>();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [optimistic, setOptimistic] = useState<{ text: string; previews: string[]; audio?: boolean }>();
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState<MediaRecorder>();
  const [pickLang, setPickLang] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(
    () =>
      getJson<FarmerView>(`/api/farmers/${id}`)
        .then((v) => {
          setView(v);
          setError(undefined);
        })
        .catch((e) => setError((e as Error).message)),
    [id],
  );

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  const count = (view?.messages.length ?? 0) + (optimistic ? 1 : 0) + (busy ? 1 : 0);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [count]);

  async function send(files: File[], message: string, audio = false) {
    if (!files.length && !message.trim()) return;
    setBusy(true);
    setOptimistic({ text: message, previews: files.filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f)), audio });
    setText("");
    setPending([]);
    try {
      let fileIds: string[] = [];
      if (files.length) {
        const form = new FormData();
        files.forEach((f) => form.append("file", f));
        const up = await fetch("/api/upload", { method: "POST", body: form });
        const body = await up.json();
        if (!up.ok) throw new Error(body.error);
        fileIds = body.files.map((f: { id: string }) => f.id);
      }
      await postJson("/api/chat", { farmerId: id, text: message, fileIds });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOptimistic(undefined);
      setBusy(false);
    }
  }

  function addPhotos(list: FileList | null) {
    if (!list) return;
    // Copy now: the FileList is live and empties when the input is reset right after this call.
    const added = Array.from(list).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPending((p) => [...p, ...added]);
  }

  async function toggleRecording() {
    if (recording) {
      recording.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(undefined);
        const raw = new Blob(chunks, { type: rec.mimeType });
        let audio: Blob = raw;
        try {
          audio = await blobToWav(raw);
        } catch {
          /* keep the original container */
        }
        const ext = audio.type.includes("wav") ? "wav" : "webm";
        const voice = new File([audio], `voice.${ext}`, { type: audio.type });
        await send([voice, ...pending.map((p) => p.file)], text, true);
      };
      rec.start();
      setRecording(rec);
    } catch (e) {
      setError(`Microphone unavailable: ${(e as Error).message}`);
    }
  }

  async function answer(key: DetailKey, value: string) {
    setBusy(true);
    try {
      setView(await postJson<FarmerView>(`/api/farmers/${id}/answer`, { key, value }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function chooseLanguage(language: Lang) {
    try {
      setView(await postJson<FarmerView>(`/api/farmers/${id}/language`, { language }));
      setPickLang(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!view) return <div className="p-10 text-sm text-slate-500">{error ?? "Fetching chat…"}</div>;
  const { farmer, fields, policy, claims, event } = view;
  const t = T[farmer.language];
  const askLanguage = !farmer.session.languageChosen || pickLang;
  const locked = busy || askLanguage;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 gap-6 p-0 sm:p-6">
      {/* Phone */}
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-white shadow-xl sm:h-[calc(100dvh-3rem)] sm:rounded-3xl sm:border sm:border-slate-200">
        <header className="flex items-center gap-3 bg-emerald-700 px-4 py-3 text-white">
          <Link href="/farmer" className="text-xl leading-none opacity-80">‹</Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-emerald-700">V</div>
          <div className="min-w-0 flex-1">
            <div className="font-medium leading-tight">Verifield</div>
            <div className="truncate text-xs opacity-80">
              {farmer.name} · {farmer.region}
            </div>
          </div>
          <button
            onClick={() => setPickLang((v) => !v)}
            className="rounded-lg bg-emerald-800/60 px-2 py-1 text-xs hover:bg-emerald-800"
            title="Change language"
          >
            🌐 {LANG_LABEL[farmer.language]}
          </button>
          <div className="rounded-lg bg-emerald-800/60 px-2 py-1 text-right">
            <div className="text-[10px] uppercase opacity-70">
              {farmer.wallet.provider} {t.wallet}
            </div>
            <div className="text-sm font-semibold">{money(farmer.wallet.balance, farmer.wallet.currency)}</div>
          </div>
        </header>

        <div ref={scrollRef} className="chat-bg flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {view.messages.length === 0 && !optimistic && (
            <div className="mx-auto mt-8 max-w-xs rounded-lg bg-white/80 p-3 text-center text-xs text-slate-600">
              No messages yet. Use the insurer console to send the storm warning, or send photos of your field to start a claim.
            </div>
          )}
          {view.messages.map((m) => (
            <Bubble key={m.id} m={m} lang={farmer.language} onError={setError} onAnswer={farmer.session.draft && !locked ? answer : undefined} />
          ))}
          {optimistic && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-lg rounded-tr-none bg-[#d9fdd3] p-2 text-sm opacity-70 shadow-sm">
                {optimistic.previews.length > 0 && (
                  <div className="mb-1 grid grid-cols-2 gap-1">
                    {optimistic.previews.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p} src={p} alt="" className="h-28 w-full rounded object-cover" />
                    ))}
                  </div>
                )}
                {optimistic.audio && <div className="text-xs text-slate-600">🎤 Voice note</div>}
                {optimistic.text}
              </div>
            </div>
          )}
          {askLanguage && (
            <div className="flex justify-start">
              <div className="w-full max-w-[85%] rounded-lg rounded-tl-none bg-white p-3 text-sm shadow-sm">
                <div className="font-medium">🌐 {COUNTRY_LANGS[farmer.country].map((l) => T[l].choose).join(" / ")}</div>
                <div className="mt-2 flex gap-2">
                  {COUNTRY_LANGS[farmer.country].map((l) => (
                    <button
                      key={l}
                      onClick={() => chooseLanguage(l)}
                      className={`flex-1 rounded-lg border py-2 font-medium ${
                        farmer.session.languageChosen && farmer.language === l
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                      }`}
                    >
                      {LANG_LABEL[l]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {busy && <div className="w-fit rounded-lg bg-white px-3 py-2 text-xs italic text-slate-500 shadow-sm">{t.typing}</div>}
        </div>

        {error && <div className="bg-rose-50 px-3 py-1 text-xs text-rose-700">{error}</div>}

        {pending.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-t border-slate-200 bg-slate-50 p-2">
            {pending.map((p, i) => (
              <div key={p.preview} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="h-16 w-16 rounded object-cover" />
                <button
                  onClick={() => setPending((ps) => ps.filter((_, j) => j !== i))}
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-slate-800 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(pending.map((p) => p.file), text);
          }}
        >
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
          <button type="button" disabled={locked} onClick={() => photoInput.current?.click()} className="h-10 w-10 shrink-0 rounded-full text-xl hover:bg-slate-200 disabled:opacity-40" title="Photo">
            📷
          </button>
          <input
            value={recording ? t.recording : text}
            onChange={(e) => setText(e.target.value)}
            disabled={locked || Boolean(recording)}
            placeholder={t.placeholder}
            className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-500"
          />
          {text.trim() || pending.length ? (
            <button disabled={locked} className="h-10 shrink-0 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-50">
              {t.send}
            </button>
          ) : (
            <button
              type="button"
              disabled={locked}
              onClick={toggleRecording}
              className={`h-10 w-10 shrink-0 rounded-full text-lg text-white ${recording ? "animate-pulse bg-rose-600" : "bg-emerald-600"} disabled:opacity-40`}
              title="Voice note"
            >
              {recording ? "■" : "🎤"}
            </button>
          )}
        </form>
      </div>

      {/* Context panel (desktop) */}
      <aside className="hidden w-80 shrink-0 space-y-4 lg:block">
        <Logo className="text-lg" />
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="font-medium">{farmer.name}</div>
          <div className="text-slate-500">
            {farmer.region} · {LANG_LABEL[farmer.language]}
          </div>
          {fields.map((f) => (
            <div key={f.id} className="mt-3 text-slate-600">
              {f.name}: {f.areaHa} ha {f.crop}, sown {f.sowingDate}
              {f.baseline && <div className="text-xs text-emerald-700">✓ Baseline photo on file</div>}
            </div>
          ))}
          <div className="mt-3 text-slate-600">{policy ? `Insured: ${policy.scheme}` : "Not insured"}</div>
          <div className="mt-3 text-xs text-slate-500">
            {eventName(event, farmer.country)}: <b>{event.status}</b>
          </div>
        </div>
        {claims.map((c) => (
          <Link key={c.id} href={`/claim/${c.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 text-sm hover:border-emerald-400">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs">{c.id}</span>
              <LaneBadge lane={c.lane} />
            </div>
            <ul className="mt-2 space-y-0.5 text-slate-600">
              {(Object.keys(CHECK_LABEL) as CheckKey[]).map((k) => (
                <li key={k} className="flex items-center gap-1">
                  <CheckIcon status={c.checkStatus[k] as never} /> {CHECK_LABEL[k]}
                </li>
              ))}
            </ul>
            {c.confidence !== undefined && (
              <div className="mt-2 text-xs text-slate-500">
                Confidence {pct(c.confidence)} · loss {c.lossPct}% · {c.payout ? money(c.payout.amount, c.payout.currency) : c.insured ? "no payout" : "certificate"}
              </div>
            )}
          </Link>
        ))}
        <Link href="/insurer" className="block text-center text-sm text-emerald-700 hover:underline">
          Open insurer console →
        </Link>
      </aside>
    </main>
  );
}

// Voices load asynchronously in some browsers.
function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  const now = speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1000);
  });
}

/** Gemini TTS in the farmer's language; falls back to a matching browser voice. */
async function speak(text: string, lang: Lang) {
  try {
    const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
    if (!r.ok) throw new Error("no tts");
    await new Audio(URL.createObjectURL(await r.blob())).play();
    return;
  } catch {
    /* use the browser voice below */
  }
  const tag = SPEECH_LANG[lang];
  const voices = await voicesReady();
  const voice =
    voices.find((v) => v.lang.replace("_", "-") === tag) ?? voices.find((v) => v.lang.toLowerCase().startsWith(lang === "tl" ? "fil" : lang));
  if (!voice && lang !== "en") throw new Error(`No ${LANG_LABEL[lang]} voice is installed in this browser. Add GEMINI_API_KEY for Gemini voices.`);
  const u = new SpeechSynthesisUtterance(text);
  u.lang = tag;
  if (voice) u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

type OnAnswer = ((key: DetailKey, value: string) => void) | undefined;

function Bubble({ m, lang, onError, onAnswer }: { m: MessageView; lang: Lang; onError: (e: string) => void; onAnswer: OnAnswer }) {
  const mine = m.role === "farmer";
  const time = new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const images = m.files.filter((f) => f!.kind === "image");
  const audio = m.files.filter((f) => f!.kind === "audio");
  if (!mine && !m.text && m.card) return <Card card={m.card} lang={lang} onAnswer={onAnswer} />;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-lg p-2 text-sm shadow-sm ${mine ? "rounded-tr-none bg-[#d9fdd3]" : "rounded-tl-none bg-white"}`}>
        {images.length > 0 && (
          <div className={`mb-1 grid gap-1 ${images.length > 1 ? "grid-cols-2" : ""}`}>
            {images.map((f) => (
              <div key={f!.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f!.url} alt="" className="h-32 w-full rounded object-cover" />
                {f!.coach && !f!.coach.usable && (
                  <div className="absolute inset-x-0 bottom-0 rounded-b bg-rose-600/90 px-1 py-0.5 text-[10px] text-white">Retake: {f!.coach.issue}</div>
                )}
              </div>
            ))}
          </div>
        )}
        {audio.map((f) => (
          <div key={f!.id} className="mb-1">
            <audio controls src={f!.url} className="h-8 w-56" />
            {f!.transcript && (
              <div className="mt-1 text-xs italic text-slate-600">
                “{f!.transcript.text}”
                {f!.transcript.english && f!.transcript.english !== f!.transcript.text && (
                  <div className="not-italic text-slate-400">EN: {f!.transcript.english}</div>
                )}
              </div>
            )}
          </div>
        ))}
        {m.text && <div className="whitespace-pre-wrap">{m.text}</div>}
        {m.card && <div className="mt-2"><Card card={m.card} lang={lang} onAnswer={onAnswer} inline /></div>}
        <div className="mt-0.5 flex items-center justify-end gap-2 text-[10px] text-slate-400">
          {!mine && m.text && (
            <button
              onClick={() => speak(m.text, lang).catch((e) => onError((e as Error).message))}
              title={T[lang].listen}
              className="flex items-center gap-0.5 rounded px-1 text-xs text-emerald-700 hover:bg-emerald-50"
            >
              🔊 {T[lang].listen}
            </button>
          )}
          {time}
        </div>
      </div>
    </div>
  );
}

function Card({ card, lang, inline, onAnswer }: { card: MessageCard; lang: Lang; inline?: boolean; onAnswer: OnAnswer }) {
  const t = T[lang];
  const wrap = (cls: string, children: React.ReactNode) => (
    <div className={inline ? "" : "flex justify-start"}>
      <div className={`w-full max-w-[85%] rounded-xl p-3 text-sm shadow-sm ${cls}`}>{children}</div>
    </div>
  );
  switch (card.type) {
    case "warning":
      return wrap("bg-amber-100 text-amber-900 border border-amber-300", <b>⚠ {t.warning}: {lang === "en" ? card.eventName : (card.localName ?? card.eventName)}</b>);
    case "advance":
    case "settlement":
      return wrap(
        "bg-gradient-to-br from-emerald-600 to-emerald-800 text-white",
        <>
          <div className="text-xs uppercase opacity-80">
            {card.type === "advance" ? t.advance : t.settlement} · {card.provider}
          </div>
          <div className="mt-1 text-2xl font-semibold">+{money(card.amount, card.currency)}</div>
          <div className="mt-1 text-xs opacity-80">{t.claim} {card.claimId}</div>
        </>,
      );
    case "decision":
      return wrap(
        "bg-white border border-slate-200",
        <>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs">{card.claimId}</span>
            <LaneBadge lane={card.lane} />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {t.confidence} {pct(card.confidence)}
            {card.payout ? ` · ${t.payout} ${money(card.payout, card.currency)}` : ""}
          </div>
        </>,
      );
    case "certificate":
      return wrap(
        "bg-indigo-600 text-white",
        <>
          <div className="text-xs uppercase opacity-80">{t.certificate}</div>
          <Link href={`/certificate/${card.certificateId}`} className="mt-1 inline-block font-medium underline">
            {t.openCert}
          </Link>
        </>,
      );
    case "enroll":
      return wrap("bg-white border border-emerald-300", <EnrollCard premium={card.premium} t={t} />);
    case "question":
      return (
        <div className="flex flex-wrap gap-1.5">
          {card.options.map((o) => {
            const picked = card.answer === o.value;
            return (
              <button
                key={o.value}
                disabled={!onAnswer || Boolean(card.answer)}
                onClick={() => onAnswer?.(card.key, o.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  picked ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-300 text-emerald-800 enabled:hover:bg-emerald-50 disabled:opacity-50"
                }`}
              >
                {o.i18n[lang] ?? o.i18n.en}
              </button>
            );
          })}
        </div>
      );
    case "declaration": {
      const d = card.details;
      const row = (label: string, value: React.ReactNode) => (
        <div className="flex justify-between gap-3 py-0.5">
          <span className="text-slate-500">{label}</span>
          <span className="text-right font-medium">{value}</span>
        </div>
      );
      return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
          <div className="font-semibold">📋 {t.dTitle}</div>
          <div className="mt-1 text-[10px] uppercase text-slate-400">{t.dOnFile}</div>
          {card.policyId && row(t.dPolicy, <span className="font-mono">{card.policyId}</span>)}
          {row(t.dField, `${card.fieldName} · ${card.areaHa} ha`)}
          {row(t.dCrop, `${CROP[lang][card.crop] ?? card.crop} · ${t.dSown} ${formatDay(card.sowingDate, lang)}`)}
          <div className="mt-1 text-[10px] uppercase text-slate-400">{t.dYou}</div>
          {row(t.dDate, !d.lossDate || d.lossDate === "unknown" ? (MSG.optNotSure()[lang]) : formatDay(d.lossDate, lang))}
          {row(t.dCause, d.cause ? MSG.optCause[d.cause][lang] : "–")}
          {row(t.dArea, `${d.affectedAreaHa ?? "–"} ha`)}
          {row(t.dLoss, `~${d.lossPct ?? "–"}%`)}
          {card.payoutTo && row(t.dPayout, d.payoutConfirmed === false ? MSG.optPayoutNo()[lang] : card.payoutTo)}
          <p className="mt-2 rounded bg-white p-2 italic text-slate-600">{t.dStatement}</p>
          <button
            disabled={!onAnswer || card.accepted}
            onClick={() => onAnswer?.("declaration", "accept")}
            className="mt-2 w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white disabled:bg-emerald-200 disabled:text-emerald-800"
          >
            {card.accepted ? t.dSigned : t.dConfirm}
          </button>
        </div>
      );
    }
  }
}

function EnrollCard({ premium, t }: { premium: string; t: Record<string, string> }) {
  const [done, setDone] = useState(false);
  return (
    <>
      <div className="font-medium">{t.enrollTitle}</div>
      <div className="text-xs text-slate-500">
        {t.from} {premium}
      </div>
      <button
        onClick={() => setDone(true)}
        disabled={done}
        className="mt-2 w-full rounded-lg bg-emerald-600 py-1.5 text-sm font-medium text-white disabled:bg-emerald-200 disabled:text-emerald-800"
      >
        {done ? t.enrolled : t.enroll}
      </button>
    </>
  );
}
