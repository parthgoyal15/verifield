import type { Country, Currency, DisasterEvent, Lang } from "./types";

// Pure display helpers, shared by server code and client components.

export const COUNTRY_NAME: Record<Country, string> = { VN: "Vietnam", PH: "Philippines", IN: "India" };
export const COUNTRY_FLAG: Record<Country, string> = { VN: "🇻🇳", PH: "🇵🇭", IN: "🇮🇳" };
export const COUNTRY_CURRENCY: Record<Country, Currency> = { VN: "VND", PH: "PHP", IN: "INR" };
/** Languages a farmer can choose in each country: the local language first, then English. */
export const COUNTRY_LANGS: Record<Country, Lang[]> = { VN: ["vi", "en"], PH: ["tl", "en"], IN: ["hi", "en"] };
export const SPEECH_LANG: Record<Lang, string> = { vi: "vi-VN", tl: "fil-PH", hi: "hi-IN", en: "en-IN" };
export const LANG_LABEL: Record<Lang, string> = { vi: "Tiếng Việt", tl: "Tagalog", hi: "हिन्दी", en: "English" };

export const eventName = (event: Pick<DisasterEvent, "name" | "names">, country: Country) => event.names?.[country] ?? event.name;

export const formatDay = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(SPEECH_LANG[lang], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
