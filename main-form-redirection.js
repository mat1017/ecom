(function () {
  const LEAD_KEY = "ecom_lead_identity";

  function setLeadIdentity(data) {
    try {
      localStorage.setItem(LEAD_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch {}
  }

  function wfRedirect(id, url) {
    const f = document.getElementById(id);
    if (!f) return;

    f.addEventListener("submit", (e) => {
      e.preventDefault();

      const p = {};
      const lead = {};
      let fname = "", lname = "";

      f.querySelectorAll("[data-param]").forEach((el) => {
        const k = el.dataset.param;
        const v = (el.value || "").trim();
        if (!v) return;

        if (k === "fname") fname = v;
        else if (k === "lname") lname = v;
        else if (k === "email") lead.email = v;
        else if (k === "phone") lead.phone = v;
        else p[k] = v;
      });

      const fullPhone = f.querySelector(".full-phone-input")?.value?.trim?.();
      if (fullPhone) lead.phone = fullPhone;

      const name = [fname, lname].filter(Boolean).join(" ");
      if (name) lead.name = name;

      setLeadIdentity(lead);

      const qs = new URLSearchParams(p).toString();
      location.href = url + (qs ? "?" + qs : "");
    });
  }

  wfRedirect("Main-Form", "/apply-to-work-with-ecom-capital");
})();
