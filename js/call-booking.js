(function () {
  const CONFIG_URL = "https://mat1017.github.io/ecom/config/lead-scoring-config.json";

  const HEADLINE_SELECTOR = '[data-call-headline], .call-booking-headline';
  const EMBED_SELECTOR = '[data-calendly-embed], .calendly-embed';

  const LEAD_KEY = "ecom_lead_identity";
  const RAW_KEY = "ecom_raw_query";

  function safeParse(v) {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }

  function getLead() {
    const cached = safeParse(localStorage.getItem(LEAD_KEY) || "null");
    if (!cached || !cached.data) return null;
    const d = cached.data || {};
    const out = {};
    if ((d.name || "").trim()) out.name = String(d.name).trim();
    if ((d.email || "").trim()) out.email = String(d.email).trim();
    if ((d.phone || "").trim()) out.phone = String(d.phone).trim();
    return Object.keys(out).length ? out : null;
  }

  function getRaw() {
    const cached = safeParse(localStorage.getItem(RAW_KEY) || "null");
    if (!cached || !cached.data || typeof cached.data !== "object") return {};
    return cached.data || {};
  }

  function pickUtm(raw) {
    const out = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
      const v = raw && raw[k] ? String(raw[k]) : "";
      if (v) out[k] = v;
    });
    return out;
  }

  function qsGet(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch {
      return null;
    }
  }

  async function fetchConfig() {
    const res = await fetch(CONFIG_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("config_fetch_failed");
    return await res.json();
  }

  function setHeadline(text) {
    const el = document.querySelector(HEADLINE_SELECTOR);
    if (!el) return;
    el.textContent = text || "";
  }

  function renderCalendly(url, lead, utm) {
    const parent = document.querySelector(EMBED_SELECTOR);
    if (!parent) return;

    parent.innerHTML = "";

    if (window.Calendly && typeof window.Calendly.initInlineWidget === "function") {
      const opts = {
        url,
        parentElement: parent,
      };

      if (lead) {
        opts.prefill = {};
        if (lead.name) opts.prefill.name = lead.name;
        if (lead.email) opts.prefill.email = lead.email;
      }

      if (utm && Object.keys(utm).length) {
        opts.utm = {};
        if (utm.utm_source) opts.utm.utmSource = utm.utm_source;
        if (utm.utm_medium) opts.utm.utmMedium = utm.utm_medium;
        if (utm.utm_campaign) opts.utm.utmCampaign = utm.utm_campaign;
        if (utm.utm_term) opts.utm.utmTerm = utm.utm_term;
        if (utm.utm_content) opts.utm.utmContent = utm.utm_content;
      }

      window.Calendly.initInlineWidget(opts);
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.width = "100%";
    iframe.height = "900";
    iframe.frameBorder = "0";
    iframe.allow = "camera; microphone; fullscreen";
    parent.appendChild(iframe);
  }

  function resolveRouting(config, tier) {
    const t = Number(tier);
    if (t === 5) return config?.routing?.tier_5 || null;
    if (t === 4) return config?.routing?.tier_4 || null;
    if (t === 3) return config?.routing?.tier_3 || null;
    if (t === 2) return config?.routing?.tier_2 || null;
    return config?.routing?.tier_1 || null;
  }

  async function run() {
    const tier = qsGet("tier");
    const leadTier = qsGet((await fetchConfig()).outputs?.lead_tier_param || "lead-tier");

    const config = await fetchConfig();

    const routing = resolveRouting(config, tier);
    if (!routing) return;

    if (routing.type === "redirect") {
      window.location.href = routing.url || "/fast-starter-program";
      return;
    }

    setHeadline(routing.headline || "");

    const lead = getLead();
    const raw = getRaw();
    const utm = pickUtm(raw);

    renderCalendly(routing.url, lead, utm);
  }

  document.addEventListener("DOMContentLoaded", () => {
    run().catch(() => {});
  });
})();
