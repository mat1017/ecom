(function () {
  const CACHE_KEY = "ecom_raw_query";
  const TTL_MS = 86400000;

  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  const LEAD_KEY = "ecom_lead_identity";
  const LEAD_TTL_MS = 86400000;

  function safeJsonParse(v) {
    try { return JSON.parse(v); } catch { return null; }
  }

  function now() {
    return Date.now();
  }

  function getCached() {
    const cached = safeJsonParse(localStorage.getItem(CACHE_KEY) || "null");
    if (!cached || !cached.ts || now() - cached.ts > TTL_MS) return {};
    return cached.data && typeof cached.data === "object" ? cached.data : {};
  }

  function setCached(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now(), data }));
    } catch {}
  }

  function buildParamsObject() {
    const params = new URLSearchParams(window.location.search);
    const obj = {};
    params.forEach((value, key) => {
      if (obj[key] === undefined) obj[key] = value;
      else if (Array.isArray(obj[key])) obj[key].push(value);
      else obj[key] = [obj[key], value];
    });
    return obj;
  }

  function mergeObjects(a, b) {
    const out = { ...(a || {}) };
    Object.keys(b || {}).forEach((k) => {
      const bv = b[k];
      const av = out[k];

      if (av === undefined) out[k] = bv;
      else if (Array.isArray(av)) out[k] = av.concat(bv);
      else if (Array.isArray(bv)) out[k] = [av].concat(bv);
      else if (av !== bv) out[k] = [av, bv];
    });
    return out;
  }

  function setCookie(name, value, ttlMs) {
    try {
      const expires = new Date(now() + ttlMs).toUTCString();
      document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; expires=${expires}`;
    } catch {}
  }

  function getCookie(name) {
    try {
      const safe = name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
      const m = document.cookie.match(new RegExp("(^| )" + safe + "=([^;]+)"));
      return m ? decodeURIComponent(m[2]) : null;
    } catch {
      return null;
    }
  }

  function saveUtms(urlObj) {
    UTM_KEYS.forEach((k) => {
      const v = urlObj[k];
      if (!v) return;
      try { sessionStorage.setItem(k, v); } catch {}
      setCookie(k, v, TTL_MS);
    });
  }

  function getStoredUtm(k) {
    try {
      return (sessionStorage.getItem(k) || getCookie(k) || "").trim() || null;
    } catch {
      return (getCookie(k) || "").trim() || null;
    }
  }

  function populateUtmFields() {
    UTM_KEYS.forEach((k) => {
      const v = getStoredUtm(k);
      if (!v) return;
      document.querySelectorAll(`input[name="${k}"]`).forEach((el) => { el.value = v; });
    });
  }

  function writeRawQueryFields(dataObj) {
    const json = JSON.stringify(dataObj || {});
    document
      .querySelectorAll('input[name="raw_query"], input[data-field="raw_query"], input.raw-query')
      .forEach((el) => { el.value = json; });
  }

  function getLeadIdentity() {
    const cached = safeJsonParse(localStorage.getItem(LEAD_KEY) || "null");
    if (!cached || !cached.ts || now() - cached.ts > LEAD_TTL_MS) return null;
    const d = cached.data && typeof cached.data === "object" ? cached.data : null;
    if (!d) return null;

    const name = (d.name || "").trim();
    const email = (d.email || "").trim();
    const phone = (d.phone || "").trim();

    const out = {};
    if (name) out.name = name;
    if (email) out.email = email;
    if (phone) out.phone = phone;

    return Object.keys(out).length ? out : null;
  }

  function isApplicationContext(formEl) {
    const root = formEl.closest('[data-ecom-form="application"]');
    return !!root;
  }

  function run() {
    const fromUrl = buildParamsObject();
    const cached = getCached();

    const merged = mergeObjects(cached, fromUrl);

    if (Object.keys(fromUrl).length) {
      setCached(merged);
      saveUtms(fromUrl);
    }

    writeRawQueryFields(merged);
    populateUtmFields();
  }

  function runForApplicationSubmit(formEl) {
    const fromUrl = buildParamsObject();
    const cached = getCached();
    let merged = mergeObjects(cached, fromUrl);

    const lead = getLeadIdentity();
    if (lead) merged = mergeObjects(merged, lead);

    if (Object.keys(fromUrl).length) {
      setCached(merged);
      saveUtms(fromUrl);
    }

    writeRawQueryFields(merged);
    populateUtmFields();
  }

  document.addEventListener("DOMContentLoaded", () => {
    run();

    document.querySelectorAll("form").forEach((form) => {
      if (form.dataset.ecomRawQueryBound === "1") return;
      form.dataset.ecomRawQueryBound = "1";

      form.addEventListener("submit", () => {
        if (isApplicationContext(form)) runForApplicationSubmit(form);
        else run();
      }, true);
    });
  });
})();
