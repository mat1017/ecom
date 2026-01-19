(function () {
  const CONFIG_URL = "https://mat1017.github.io/ecom/config/lead-scoring-config.json";

  const LEAD_KEY = "ecom_lead_identity";
  const RAW_KEY = "ecom_raw_query";

  const DEFAULT_BASE_URL = "https://calendly.com/ecomcapital/strategy-call-c1";

  const HEADLINE_SELECTOR = '[data-call="headline"], [data-call-headline], .call-booking-headline';
  const EMBED_SELECTOR = "#calendly-embed, [data-calendly-embed], .calendly-embed, [data=\"calendly-embed\"]";

  const FALLBACK_ID = "calendly-fallback";
  const FALLBACK_LINK_ID = "calendly-fallback-link";

  function clean(v) {
    if (v === undefined || v === null) return "";
    v = String(v).trim();
    if (!v || v === "undefined" || v === "null") return "";
    return v;
  }

  function digitsOnly(v) {
    v = clean(v);
    return v ? v.replace(/\D/g, "") : "";
  }

  function qs() {
    try {
      return new URLSearchParams(window.location.search || "");
    } catch {
      return new URLSearchParams();
    }
  }

  function safeJsonParse(v) {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }

  function safeGetLocalJson(key) {
    try {
      return safeJsonParse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function safeGetLead() {
    const cached = safeGetLocalJson(LEAD_KEY);
    if (!cached || typeof cached !== "object") return null;
    if (!cached.data || typeof cached.data !== "object") return null;

    const name = clean(cached.data.name);
    const email = clean(cached.data.email);
    const phone = clean(cached.data.phone);

    return { name, email, phone };
  }

  function safeGetRawQueryObject() {
    const cached = safeGetLocalJson(RAW_KEY);
    if (!cached || typeof cached !== "object") return {};
    if (!cached.data || typeof cached.data !== "object") return {};
    return cached.data || {};
  }

  function pickUtm(raw) {
    const out = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
      const v = raw && raw[k] ? clean(raw[k]) : "";
      if (v) out[k] = v;
    });
    return out;
  }

  function splitName(full) {
    full = clean(full);
    if (!full) return { firstName: "", lastName: "" };
    const parts = full.split(/\s+/).filter(Boolean);
    if (!parts.length) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }

  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function waitFor(testFn, maxMs, intervalMs, onSuccess) {
    const start = Date.now();
    (function tick() {
      if (testFn()) return onSuccess && onSuccess();
      if (Date.now() - start > maxMs) return;
      setTimeout(tick, intervalMs);
    })();
  }

  function setHeadline(text) {
    const el = document.querySelector(HEADLINE_SELECTOR);
    if (!el) return;
    el.textContent = clean(text);
  }

  function showFallback(fallbackUrl, embedEl) {
    const fbWrap = document.getElementById(FALLBACK_ID);
    const fbLink = document.getElementById(FALLBACK_LINK_ID);

    if (fbLink) fbLink.href = fallbackUrl;

    if (embedEl) embedEl.style.display = "none";
    if (fbWrap) fbWrap.style.display = "block";
  }

  function hideFallback(embedEl) {
    const fbWrap = document.getElementById(FALLBACK_ID);
    if (embedEl) embedEl.style.display = "block";
    if (fbWrap) fbWrap.style.display = "none";
  }

  async function fetchConfig() {
    const res = await fetch(CONFIG_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("config_fetch_failed");
    return await res.json();
  }

  function getRoutingFromConfig(config, tier) {
    const t = Number(tier);
    if (t === 5) return config?.routing?.tier_5 || null;
    if (t === 4) return config?.routing?.tier_4 || null;
    if (t === 3) return config?.routing?.tier_3 || null;
    if (t === 2) return config?.routing?.tier_2 || null;
    return config?.routing?.tier_1 || null;
  }

  function buildCalendlyDisplayUrl(baseUrl) {
    const displayParams = new URLSearchParams({
      hide_event_type_details: "1",
      hide_gdpr_banner: "1",
      primary_color: "257358",
    });

    const u = clean(baseUrl) || DEFAULT_BASE_URL;
    return u + (u.includes("?") ? "&" : "?") + displayParams.toString();
  }

  function buildFallbackUrl(baseUrl, firstName, lastName, email, phoneDigits) {
    const u = clean(baseUrl) || DEFAULT_BASE_URL;

    const p = new URLSearchParams({
      hide_event_type_details: "1",
      hide_gdpr_banner: "1",
    });

    const nm = clean((clean(firstName) + " " + clean(lastName)).trim());
    if (nm) p.set("name", nm);
    if (clean(email)) p.set("email", clean(email));
    if (clean(phoneDigits)) p.set("a1", clean(phoneDigits));

    return u + (u.includes("?") ? "&" : "?") + p.toString();
  }

  function getIdentity() {
    const params = qs();
    const lead = safeGetLead();
    const raw = safeGetRawQueryObject() || {};

    const urlName = clean(params.get("name"));
    const urlEmail = clean(params.get("email"));

    const name = urlName || clean(raw.name) || (lead ? clean(lead.name) : "");
    const email = urlEmail || clean(raw.email) || (lead ? clean(lead.email) : "");

    const phoneFromUrl = clean(params.get("a1")) || clean(params.get("phone"));
    const phone = phoneFromUrl || clean(raw.phone) || (lead ? clean(lead.phone) : "");

    const { firstName, lastName } = splitName(name);

    return {
      name: clean(name),
      firstName,
      lastName,
      email: clean(email),
      phoneDigits: digitsOnly(phone),
    };
  }

  function initCalendlyInline(calendlyUrl, embedEl, identity, utm, onLoaded) {
    const fallbackTimer = setTimeout(function () {
      onLoaded(false);
    }, 4500);

    function markLoaded() {
      clearTimeout(fallbackTimer);
      onLoaded(true);
    }

    window.addEventListener(
      "message",
      function (e) {
        try {
          if (!e || !e.origin) return;
          if (String(e.origin).indexOf("https://calendly.com") !== 0) return;
          markLoaded();
        } catch {}
      },
      false
    );

    waitFor(
      function () {
        return window.Calendly && typeof window.Calendly.initInlineWidget === "function";
      },
      6000,
      25,
      function () {
        const opts = {
          url: calendlyUrl,
          parentElement: embedEl,
          prefill: {
            firstName: identity.firstName,
            lastName: identity.lastName,
            email: identity.email,
            customAnswers: { a1: identity.phoneDigits },
          },
        };

        if (utm && Object.keys(utm).length) {
          opts.utm = {};
          if (utm.utm_source) opts.utm.utmSource = utm.utm_source;
          if (utm.utm_medium) opts.utm.utmMedium = utm.utm_medium;
          if (utm.utm_campaign) opts.utm.utmCampaign = utm.utm_campaign;
          if (utm.utm_term) opts.utm.utmTerm = utm.utm_term;
          if (utm.utm_content) opts.utm.utmContent = utm.utm_content;
        }

        window.Calendly.initInlineWidget(opts);
      }
    );
  }

  onReady(async function () {
    const embedEl = document.querySelector(EMBED_SELECTOR);
    if (!embedEl) return;

    if (embedEl.getAttribute("data-calendly-mounted") === "1") return;
    embedEl.setAttribute("data-calendly-mounted", "1");

    const params = qs();
    const tierParam = clean(params.get("tier"));
    const forceFallback = clean(params.get("force_fallback")) === "1";

    let baseUrl = DEFAULT_BASE_URL;
    let headline = "";

    try {
      const config = await fetchConfig();
      const routing = getRoutingFromConfig(config, tierParam);

      if (routing && routing.type === "redirect") {
        window.location.href = clean(routing.url) || "/fast-starter-program";
        return;
      }

      baseUrl = clean(routing?.url) || baseUrl;
      headline = clean(routing?.headline);
    } catch {}

    setHeadline(headline);

    const raw = safeGetRawQueryObject();
    const utm = pickUtm(raw);

    const identity = getIdentity();

    const calendlyUrl = buildCalendlyDisplayUrl(baseUrl);
    const fallbackUrl = buildFallbackUrl(baseUrl, identity.firstName, identity.lastName, identity.email, identity.phoneDigits);

    if (forceFallback) {
      showFallback(fallbackUrl, embedEl);
      return;
    }

    hideFallback(embedEl);
    embedEl.innerHTML = "";

    initCalendlyInline(calendlyUrl, embedEl, identity, utm, function (loaded) {
      if (loaded) hideFallback(embedEl);
      else showFallback(fallbackUrl, embedEl);
    });
  });
})();
