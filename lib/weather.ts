export interface WeatherSeries {
  time: string[];
  rainMm: number[];
  windKmh: number[];
}

const cache = new Map<string, WeatherSeries>();

export async function fetchWeather(lat: number, lng: number, start: string, end: string): Promise<WeatherSeries> {
  const key = `${lat},${lng},${start},${end}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=${start}&end_date=${end}&daily=precipitation_sum,wind_speed_10m_max&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const json = await res.json();
  const series: WeatherSeries = {
    time: json.daily.time,
    rainMm: json.daily.precipitation_sum.map((v: number | null) => v ?? 0),
    windKmh: json.daily.wind_speed_10m_max.map((v: number | null) => v ?? 0),
  };
  cache.set(key, series);
  return series;
}

export function summarize(s: WeatherSeries) {
  let max48 = 0;
  for (let i = 0; i < s.rainMm.length; i++) {
    max48 = Math.max(max48, s.rainMm[i] + (s.rainMm[i + 1] ?? 0));
  }
  return {
    max48hMm: Math.round(max48),
    totalMm: Math.round(s.rainMm.reduce((a, b) => a + b, 0)),
    maxWindKmh: Math.round(Math.max(...s.windKmh)),
  };
}
