function wfRedirect(id, url) {
  const f = document.getElementById(id);
  if (!f) return;

  f.addEventListener("submit", (e) => {
    e.preventDefault();

    const merged = new URLSearchParams(window.location.search);

    let fname = "", lname = "";

    f.querySelectorAll("[data-param]").forEach(el => {
      const k = el.dataset.param;
      const v = el.value?.trim();
      if (!v) return;

      if (k === "fname") fname = v;
      else if (k === "lname") lname = v;
      else merged.set(k, v);
    });

    const name = [fname, lname].filter(Boolean).join(" ");
    if (name) merged.set("name", name);

    location.href = url + "?" + merged.toString();
  });
}

wfRedirect("Main-Form", "/apply-to-work-with-ecom-capital");
