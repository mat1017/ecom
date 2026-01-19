(function () {
  const CONFIG_URL = "https://mat1017.github.io/ecom/config/lead-scoring-config.json";
  const LEAD_KEY = "ecom_lead_identity";
  const RAW_KEY = "ecom_raw_query";

  const EMBED_ID = "calendly-embed";
  const FALLBACK_ID = "calendly-fallback";
  const FALLBACK_LINK_ID = "calendly-fallback-link";

  const DEFAULT_BASE_URL = "https://calendly.com/ecomcapital/strategy-call-c1";

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
    return new URLSearchParams(window.location.search || "");
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
    if (!cached || typeof cached !== "object") return null;
    if (!cached.data || typeof cached.data !== "object") return null;
    return cached.data;
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
    if (!res.ok) throw new Error("Failed to load scoring config");
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

    const el = document.querySelector('[data-call="headline"]');
    if (!el) return;

    el.textContent = v;
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

    const nm = clean((firstName + " " + lastName).trim());
    if (nm) p.set("name", nm);
    if (clean(email)) p.set("email", clean(email));
    if (clean(phoneDigits)) p.set("a1", clean(phoneDigits));

    return u + (u.includes("?") ? "&" : "?") + p.toString();
  }

  function getPrefillIdentity() {
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
      firstName,
      lastName,
      email: clean(email),
      phoneDigits: digitsOnly(phone),
    };
  }

  function initCalendly(calendlyUrl, identity, container, onLoaded) {
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
        window.Calendly.initInlineWidget({
          url: calendlyUrl,
          parentElement: container,
          prefill: {
            firstName: identity.firstName,
            lastName: identity.lastName,
            email: identity.email,
            customAnswers: { a1: identity.phoneDigits },
          },
        });
      }
    );
  }

  onReady(async function () {
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
        const url = clean(routing.url) || "/fast-starter-program";
        window.location.href = url;
        return;
      }

      baseUrl = clean(routing?.url) || baseUrl;
      headline = clean(routing?.headline) || "";

      if (headline) setHeadline(headline);
    } catch {
    }

    const identity = getPrefillIdentity();

    const calendlyUrl = buildCalendlyDisplayUrl(baseUrl);
    const fallbackUrl = buildFallbackUrl(baseUrl, identity.firstName, identity.lastName, identity.email, identity.phoneDigits);

    if (forceFallback) {
      showFallback(fallbackUrl);
      return;
    }

    initCalendly(calendlyUrl, identity, container, function (loaded) {
      if (loaded) hideFallback();
      else showFallback(fallbackUrl);
    });
  });
})();
