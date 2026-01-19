(function () {
  function getParameterByName(name) {
    const m = location.search.match(RegExp("[?&]" + name + "=([^&]*)"));
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
  }

  function saveUtmsToStorage() {
    const expires = new Date(Date.now() + 86400000).toUTCString();
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
      const v = getParameterByName(k);
      if (!v) return;

      try {
        document.cookie = `${k}=${encodeURIComponent(v)}; path=/; expires=${expires}`;
      } catch {}

      try {
        sessionStorage.setItem(k, v);
      } catch {}
    });
  }

  function getStoredValue(name) {
    const m = document.cookie.match(RegExp("(^| )" + name + "=([^;]+)"));
    if (m) return decodeURIComponent(m[2]);

    try {
      return sessionStorage.getItem(name);
    } catch {
      return null;
    }
  }

  function populateUtmHiddenFields() {
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
      const v = getParameterByName(k) || getStoredValue(k);
      if (!v) return;

      document.querySelectorAll(`input[name="${k}"]`).forEach((el) => {
        el.value = v;
      });
    });
  }

  const RAW_CACHE_KEY = "ecom_raw_query";
  const RAW_TTL_MS = 86400000;

  function safeJsonParse(v) {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }

  function getRawCached() {
    const cached = safeJsonParse(localStorage.getItem(RAW_CACHE_KEY) || "null");
    if (!cached) return null;
    if (!cached.ts || Date.now() - cached.ts > RAW_TTL_MS) return null;
    return cached.data || null;
  }

  function setRawCached(data) {
    try {
      localStorage.setItem(RAW_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
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

  function writeRawQueryFields() {
    const fromUrl = buildParamsObject();
    const hasUrlParams = Object.keys(fromUrl).length > 0;

    if (hasUrlParams) setRawCached(fromUrl);

    const data = hasUrlParams ? fromUrl : getRawCached() || {};
    const json = JSON.stringify(data);

    document
      .querySelectorAll('input[name="raw_query"], input[data-field="raw_query"], input.raw-query')
      .forEach((el) => {
        el.value = json;
      });
  }

  function attachSubmitListeners() {
    document.querySelectorAll("form").forEach((form) => {
      if (form.dataset.ecomRawQueryBound === "1") return;
      form.dataset.ecomRawQueryBound = "1";
      form.addEventListener("submit", writeRawQueryFields);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    saveUtmsToStorage();
    populateUtmHiddenFields();
    writeRawQueryFields();
    attachSubmitListeners();
  });
})();
