
function wfRedirect(id, url) {
  const f = document.getElementById(id);
  if (!f) return;

  f.addEventListener("submit", () => {
    setTimeout(() => {
      const p = {};
      let fname = "", lname = "";

      f.querySelectorAll("[data-param]").forEach(el => {
        const k = el.dataset.param;
        const v = el.value?.trim();
        if (!v) return;

        if (k === "fname") fname = v;
        else if (k === "lname") lname = v;
        else p[k] = v;
      });

      const name = [fname, lname].filter(Boolean).join(" ");
      if (name) p.name = name;

      location.href = url + "?" + new URLSearchParams(p);
    }, 300);
  });
}

wfRedirect("Main-Form", "/apply-to-work-with-ecom-capital");
