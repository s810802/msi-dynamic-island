// Cloudflare Worker:替天氣牆代為呼叫 OpenWeather,API Key 存在 Cloudflare 的機密變數(OWM_KEY),
// 不會出現在網頁原始碼裡。網頁只需要呼叫同網域的 /api/weather?kind=weather|forecast&lat=..&lon=..
const OWM = "https://api.openweathermap.org/data/2.5";
const KINDS = new Set(["weather", "forecast"]);
const CACHE_SECONDS = 600;   // 同一個地點 10 分鐘內只問 OpenWeather 一次,省額度也加快速度

const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", ...extra },
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/weather") return json({ error: "not found" }, 404);
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405);
    if (!env.OWM_KEY) return json({ error: "server key missing" }, 500);

    const kind = url.searchParams.get("kind") || "weather";
    const lat = Number(url.searchParams.get("lat")), lon = Number(url.searchParams.get("lon"));
    // 只允許查台灣一帶,避免被拿去當通用代理
    if (!KINDS.has(kind) || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < 21 || lat > 27 || lon < 117 || lon > 123) {
      return json({ error: "bad request" }, 400);
    }
    // 座標取到小數 3 位,讓快取更容易命中
    const key = new Request(`https://cache.local/${kind}?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`);
    const cache = caches.default;
    const hit = await cache.match(key);
    if (hit) return new Response(hit.body, { status: hit.status, headers: { ...Object.fromEntries(hit.headers), "x-cache": "HIT" } });

    const upstream = await fetch(`${OWM}/${kind}?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}&appid=${env.OWM_KEY}&units=metric&lang=zh_tw`);
    const body = await upstream.text();
    const res = new Response(body, {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": `public, max-age=${CACHE_SECONDS}`, "x-cache": "MISS" },
    });
    if (upstream.ok) ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  },
};
