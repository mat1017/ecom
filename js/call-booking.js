(function () {
  const CONFIG_URL = "https://mat1017.github.io/ecom/config/lead-scoring-config.json";

  const LEAD_KEY = "ecom_lead_identity";
  const RAW_KEY = "ecom_raw_query";

  const EMBED_ID = "calendly-embed";
  const FALLBACK_ID = "calendly-fallback";
  const FALLBACK_LINK_ID = "calendly-fallback-link";

  const DEFAULT_BASE_URL = "https://calendly.com/ecomcapital/strategy-call-c1";
  const WIDGET_SRC = "https://assets.calendly.com/assets/external/widget.js";

  const HEADLINE_SELECTORS = ['[data-call="headline"]', "[data-call-headline]", ".call-booking-headline"];

  function clean(v) {
    if (v === undefined || v === null) return "";
    v = String(v).trim();
    if (!v || v === "undefined" || v === "null") return "";
    return v;
  }

  function pickLastScalar(v) {
    if (Array.isArray(v)) {
      for (let i = v.length - 1; i >= 0; i--) {
        const c = clean(v[i]);
        if (c) return c;
      }
      return "";
    }
    if (typeof v === "object" && v !== null) return "";
    return clean(v);
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

  function safeSetLocalJson(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
    } catch {}
  }

  function safeGetLead() {
    const cached = safeGetLocalJson(LEAD_KEY);
    if (!cached || typeof cached !== "object") return null;
    if (!cached.data || typeof cached.data !== "object") return null;

    const name = pickLastScalar(cached.data.name);
    const email = pickLastScalar(cached.data.email);
    const phone = pickLastScalar(cached.data.phone);

    if (!name && !email && !phone) return null;
    return { name, email, phone };
  }

  function safeGetRawQueryObject() {
    const cached = safeGetLocalJson(RAW_KEY);
    if (!cached || typeof cached !== "object") return {};
    if (!cached.data || typeof cached.data !== "object") return {};
    return cached.data || {};
  }

  function maybeRepairStoredIdentityAndRaw() {
    const leadWrap = safeGetLocalJson(LEAD_KEY);
    if (leadWrap && leadWrap.data && typeof leadWrap.data === "object") {
      const fixed = {
        ...leadWrap,
        data: {
          ...leadWrap.data,
          name: pickLastScalar(leadWrap.data.name),
          email: pickLastScalar(leadWrap.data.email),
          phone: pickLastScalar(leadWrap.data.phone),
        },
      };
      safeSetLocalJson(LEAD_KEY, fixed);
    }

    const rawWrap = safeGetLocalJson(RAW_KEY);
    if (rawWrap && rawWrap.data && typeof rawWrap.data === "object") {
      const fixedData = { ...rawWrap.data };
      ["name", "email", "phone"].forEach((k) => {
        if (k in fixedData) fixedData[k] = pickLastScalar(fixedData[k]);
      });
      safeSetLocalJson(RAW_KEY, { ...rawWrap, data: fixedData });
    }
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

  function showFallback(fallbackUrl) {
    const embed = document.getElementById(EMBED_ID);
    const fbWrap = document.getElementById(FALLBACK_ID);
    const fbLink = document.getElementById(FALLBACK_LINK_ID);

    if (fbLink) fbLink.href = fallbackUrl;

    if (embed) embed.style.display = "none";
    if (fbWrap) fbWrap.style.display = "block";
  }

  function hideFallback() {
    const embed = document.getElementById(EMBED_ID);
    const fbWrap = document.getElementById(FALLBACK_ID);

    if (embed) embed.style.display = "block";
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

  function setHeadline(text) {
    const v = clean(text);
    if (!v) return;

    for (let i = 0; i < HEADLINE_SELECTORS.length; i++) {
      const el = document.querySelector(HEADLINE_SELECTORS[i]);
      if (el) {
        el.textContent = v;
        return;
      }
    }
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

  function pickUtm(raw) {
    const out = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
      const v = pickLastScalar(raw && raw[k] ? raw[k] : "");
      if (v) out[k] = v;
    });
    return out;
  }

  function buildFallbackUrl(baseUrl, identity, utm) {
    const u = clean(baseUrl) || DEFAULT_BASE_URL;
    const p = new URLSearchParams({
      hide_event_type_details: "1",
      hide_gdpr_banner: "1",
    });

    const nm = clean((identity.firstName + " " + identity.lastName).trim());
    if (nm) p.set("name", nm);
    if (clean(identity.email)) p.set("email", clean(identity.email));
    if (clean(identity.phoneDigits)) p.set("a1", clean(identity.phoneDigits));

    if (utm && Object.keys(utm).length) {
      if (utm.utm_source) p.set("utm_source", utm.utm_source);
      if (utm.utm_medium) p.set("utm_medium", utm.utm_medium);
      if (utm.utm_campaign) p.set("utm_campaign", utm.utm_campaign);
      if (utm.utm_term) p.set("utm_term", utm.utm_term);
      if (utm.utm_content) p.set("utm_content", utm.utm_content);
    }

    return u + (u.includes("?") ? "&" : "?") + p.toString();
  }

  function getPrefillIdentity() {
    const params = qs();
    const lead = safeGetLead();
    const raw = safeGetRawQueryObject() || {};

    const urlName = pickLastScalar(params.get("name"));
    const urlEmail = pickLastScalar(params.get("email"));
    const urlPhone = pickLastScalar(params.get("a1")) || pickLastScalar(params.get("phone"));

    const leadName = lead ? pickLastScalar(lead.name) : "";
    const leadEmail = lead ? pickLastScalar(lead.email) : "";
    const leadPhone = lead ? pickLastScalar(lead.phone) : "";

    const rawName = pickLastScalar(raw.name);
    const rawEmail = pickLastScalar(raw.email);
    const rawPhone = pickLastScalar(raw.phone);

    const name = urlName || leadName || rawName;
    const email = urlEmail || leadEmail || rawEmail;
    const phone = urlPhone || leadPhone || rawPhone;

    const { firstName, lastName } = splitName(name);

    return {
      firstName,
      lastName,
      email: clean(email),
      phoneDigits: digitsOnly(phone),
    };
  }

  function ensureCalendlyWidgetLoaded(onLoaded) {
    if (window.Calendly && typeof window.Calendly.initInlineWidget === "function") {
      onLoaded(true);
      return;
    }

    const existing = document.querySelector('script[src="' + WIDGET_SRC + '"]');
    if (existing) {
      waitFor(
        function () {
          return window.Calendly && typeof window.Calendly.initInlineWidget === "function";
        },
        6000,
        25,
        function () {
          onLoaded(true);
        }
      );
      return;
    }

    const s = document.createElement("script");
    s.src = WIDGET_SRC;
    s.async = true;
    s.onload = function () {
      waitFor(
        function () {
          return window.Calendly && typeof window.Calendly.initInlineWidget === "function";
        },
        6000,
        25,
        function () {
          onLoaded(true);
        }
      );
    };
    s.onerror = function () {
      onLoaded(false);
    };
    document.head.appendChild(s);
  }

  function initCalendlyInline(calendlyUrl, identity, utm, container, onLoaded) {
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

    ensureCalendlyWidgetLoaded(function (ok) {
      if (!ok) return onLoaded(false);

      const opts = {
        url: calendlyUrl,
        parentElement: container,
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

      try {
        window.Calendly.initInlineWidget(opts);
      } catch {
        return onLoaded(false);
      }
    });
  }

  onReady(async function () {
    maybeRepairStoredIdentityAndRaw();

    const container = document.getElementById(EMBED_ID);
    if (!container) return;

    if (container.getAttribute("data-calendly-mounted") === "1") return;
    container.setAttribute("data-calendly-mounted", "1");

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
      headline = clean(routing?.headline) || "";
      if (headline) setHeadline(headline);
    } catch {}

    const raw = safeGetRawQueryObject() || {};
    const utm = pickUtm(raw);
    const identity = getPrefillIdentity();

    const calendlyUrl = buildCalendlyDisplayUrl(baseUrl);
    const fallbackUrl = buildFallbackUrl(baseUrl, identity, utm);

    if (forceFallback) {
      showFallback(fallbackUrl);
      return;
    }

    initCalendlyInline(calendlyUrl, identity, utm, container, function (loaded) {
      if (loaded) hideFallback();
      else showFallback(fallbackUrl);
    });
  });
})();
