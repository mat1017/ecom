(function () {
  const LEAD_KEY = "ecom_lead_identity";

  function setLeadIdentity(data) {
    try {
      localStorage.setItem(LEAD_KEY, JSON.stringify({ ts: Date.now(), data }));
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

  function deleteKeys(obj, keys) {
    keys.forEach((k) => {
      if (obj[k] !== undefined) delete obj[k];
    });
    return obj;
  }

  function objectToSearchParams(obj) {
    const sp = new URLSearchParams();
    Object.keys(obj || {}).forEach((k) => {
      const v = obj[k];
      if (v === undefined || v === null || v === "") return;
      if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
      else sp.set(k, v);
    });
    return sp;
  }

  function wfRedirect(id, url) {
    const f = document.getElementById(id);
    if (!f) return;

    f.addEventListener("submit", (e) => {
      e.preventDefault();

      const lead = {};
      let fname = "", lname = "";

      const carry = deleteKeys(buildParamsObject(), ["name", "email", "phone", "fname", "lname"]);

      f.querySelectorAll("[data-param]").forEach((el) => {
        const k = el.dataset.param;
        const v = (el.value || "").trim();
        if (!v) return;

        if (k === "fname") fname = v;
        else if (k === "lname") lname = v;
        else if (k === "email") lead.email = v;
        else if (k === "phone") lead.phone = v;
        else carry[k] = v;
      });

      const fullPhone = f.querySelector(".full-phone-input")?.value?.trim?.();
      if (fullPhone) lead.phone = fullPhone;

      const name = [fname, lname].filter(Boolean).join(" ");
      if (name) lead.name = name;

      setLeadIdentity(lead);

      const qs = objectToSearchParams(carry).toString();
      location.href = url + (qs ? "?" + qs : "");
    });
  }

  wfRedirect("Main-Form", "/apply-to-work-with-ecom-capital");
})();
