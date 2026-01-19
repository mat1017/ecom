document.addEventListener("DOMContentLoaded", () => {
  const steps = Array.from(document.querySelectorAll(".multistep-form-step-modal"));
  const progressBar = document.querySelector(".multistep-form-progressbar-progress-modal");
  const stepNumber = document.querySelector(".multistep-progress-number");
  const stepPercent = document.querySelector(".multistep-progress-percent");

  const nextButtons = Array.from(document.querySelectorAll(".vsl-next-button"));
  const nextArrow = document.querySelector(".multistep-form-next-modal");
  const prevArrow = document.querySelector(".multistep-form-previous-modal");

  const totalSteps = steps.length;
  let currentStep = 0;

  const setText = (el, text) => {
    if (el) el.textContent = text;
  };

  const setDisplay = (el, value) => {
    if (el) el.style.display = value;
  };

  const updateUI = () => {
    if (!totalSteps) return;

    steps.forEach((step, index) => {
      step.style.display = index === currentStep ? "flex" : "none";
    });

    const percent = totalSteps > 1 ? Math.round((currentStep / (totalSteps - 1)) * 100) : 100;

    if (progressBar) progressBar.style.width = percent + "%";
    setText(stepNumber, `${Math.min(currentStep + 1, totalSteps)}/${totalSteps}`);
    setText(stepPercent, `${percent}%`);

    if (prevArrow) prevArrow.style.display = currentStep === 0 ? "none" : "flex";
    if (nextArrow) nextArrow.style.display = currentStep === totalSteps - 1 ? "none" : "flex";
  };

  const canProceed = () => {
    const stepEl = steps[currentStep];
    if (!stepEl) return true;

    const errorBox = stepEl.querySelector(".multistep-form-error");

    const hasChecked = !!stepEl.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked');

    const hasFilled = Array.from(
      stepEl.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea, select')
    ).some((el) => (el.value || "").trim() !== "");

    const ok = hasChecked || hasFilled;

    if (!ok) setDisplay(errorBox, "flex");
    else setDisplay(errorBox, "none");

    return ok;
  };

  const goNext = () => {
    if (!totalSteps) return;
    if (!canProceed()) return;
    if (currentStep < totalSteps - 1) {
      currentStep++;
      updateUI();
    }
  };

  const goPrev = () => {
    if (!totalSteps) return;
    if (currentStep > 0) {
      currentStep--;
      updateUI();
    }
  };

  nextButtons.forEach((btn) => btn.addEventListener("click", goNext));
  if (nextArrow) nextArrow.addEventListener("click", goNext);
  if (prevArrow) prevArrow.addEventListener("click", goPrev);

  steps.forEach((step, stepIndex) => {
    const inputs = Array.from(step.querySelectorAll("input, textarea, select"));
    const errorBox = step.querySelector(".multistep-form-error");

    inputs.forEach((input) => {
      input.addEventListener("change", () => {
        setDisplay(errorBox, "none");

        if (stepIndex === currentStep) {
          setTimeout(() => {
            if (canProceed()) goNext();
          }, 150);
        }
      });

      input.addEventListener("input", () => {
        setDisplay(errorBox, "none");
      });
    });
  });

  updateUI();

  const btn = document.querySelector(".survey_button");
  const popup = document.querySelector(".vsl-popup");

  if (btn && popup) {
    const show = () => {
      popup.style.display = "flex";
    };

    if (!btn.classList.contains("is-inactive")) {
      btn.onclick = show;
    } else {
      const observer = new MutationObserver(() => {
        if (!btn.classList.contains("is-inactive")) {
          btn.onclick = show;
          observer.disconnect();
        }
      });

      observer.observe(btn, { attributes: true, attributeFilter: ["class"] });
    }
  }

  const setupConditionalRadioByKey = ({ radioName, triggerAnswerKeys, showAttr, hideAttr }) => {
    const radios = Array.from(document.querySelectorAll(`input[name="${radioName}"]`));
    if (!radios.length) return;

    const showContainers = Array.from(document.querySelectorAll(`[${showAttr}]`));
    const hideContainers = Array.from(document.querySelectorAll(`[${hideAttr}]`));

    const clearAllFields = (container) => {
      if (!container) return;

      container.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach((input) => {
        input.checked = false;
      });

      container
        .querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea')
        .forEach((input) => {
          input.value = "";
        });

      container.querySelectorAll("select").forEach((select) => {
        select.selectedIndex = 0;
      });

      container.querySelectorAll(".multistep-form-error").forEach((error) => {
        error.style.display = "none";
      });
    };

    const readSelectedKey = () => {
      const checked = radios.find((r) => r.checked);
      if (!checked) return null;
      const k = checked.dataset && checked.dataset.answer ? String(checked.dataset.answer) : "";
      return k || null;
    };

    const applyCondition = () => {
      const key = readSelectedKey();
      const shouldTrigger = key ? triggerAnswerKeys.includes(key) : false;

      showContainers.forEach((container) => {
        container.style.display = shouldTrigger ? "" : "none";
      });

      hideContainers.forEach((container) => {
        container.style.display = shouldTrigger ? "none" : "";
        if (shouldTrigger) clearAllFields(container);
      });
    };

    radios.forEach((radio) => {
      radio.addEventListener("change", applyCondition);
    });

    applyCondition();
  };

  setupConditionalRadioByKey({
    radioName: "So-we-can-see-where-you-re-starting-from-what-is-your-current-situation",
    triggerAnswerKeys: ["run_business"],
    showAttr: 'conditional-step="2"',
    hideAttr: 'conditional-step="1"',
  });

  const LEAD_KEY = "ecom_lead_identity";
  const TTL_MS = 86400000;

  const safeParse = (v) => {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  const getLead = () => {
    const cached = safeParse(localStorage.getItem(LEAD_KEY) || "null");
    if (!cached || !cached.ts || Date.now() - cached.ts > TTL_MS) return null;
    return cached.data || null;
  };

  const writeFieldIfEmpty = (fieldKey, value) => {
    if (!value) return;
    document.querySelectorAll(`[data-field="${fieldKey}"]`).forEach((el) => {
      if ((el.value || "").trim()) return;
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };

  const lead = getLead();
  if (lead) {
    writeFieldIfEmpty("name", lead.name);
    writeFieldIfEmpty("email", lead.email);
    writeFieldIfEmpty("phone", lead.phone);
  }
});

(function () {
  const CONFIG_URL = "https://mat1017.github.io/ecom/config/lead-scoring-config.json";
  const CALL_BOOKING_PATH = "/call-booking";

  let configCache = null;
  let configError = null;

  function setHidden(key, value) {
    if (value === undefined || value === null) return;
    const v = String(value);
    document.querySelectorAll(`[data-field="${key}"], input[name="${key}"]`).forEach((el) => {
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  async function preloadConfig() {
    try {
      const res = await fetch(CONFIG_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("config_fetch_failed");
      const json = await res.json();
      configCache = json;
      configError = null;
    } catch (e) {
      configCache = null;
      configError = e && e.message ? String(e.message) : "config_fetch_failed";
    }
  }

  function getSelectedAnswerKey(formEl, qid) {
    const checked = formEl.querySelector(`input[data-field="${qid}"]:checked`);
    if (checked && checked.dataset && checked.dataset.answer) return String(checked.dataset.answer);

    const select = formEl.querySelector(`select[data-field="${qid}"]`);
    if (select && select.value) return String(select.value);

    const text = formEl.querySelector(`textarea[data-field="${qid}"], input[type="text"][data-field="${qid}"]`);
    if (text && text.value) return String(text.value);

    return null;
  }

  function computeScore(config, formEl) {
    const questions = Array.isArray(config?.questions) ? config.questions : [];
    const rules = Array.isArray(config?.rules?.conditional_scoring) ? config.rules.conditional_scoring : [];

    const answersByQid = {};
    questions.forEach((q) => {
      answersByQid[q.id] = getSelectedAnswerKey(formEl, q.id);
    });

    const ignore = new Set();
    rules.forEach((r) => {
      const actual = answersByQid[r.if_question_id];
      if (actual === null || actual === undefined) return;

      const matchEq = r.if_answer_equals !== undefined && actual === String(r.if_answer_equals);
      const matchNe = r.if_answer_not_equals !== undefined && actual !== String(r.if_answer_not_equals);

      if (matchEq || matchNe) {
        (r.ignore_question_ids || []).forEach((qid) => ignore.add(qid));
      }
    });

    let score = 0;

    questions.forEach((q) => {
      if (ignore.has(q.id)) return;
      if (q.enrichment_only) return;

      const ansKey = answersByQid[q.id];
      if (!ansKey) return;

      const pts = q.answers ? q.answers[ansKey] : undefined;
      if (typeof pts === "number") score += pts;
    });

    return { score, answersByQid };
  }

  function scoreToTier(config, score) {
    const t = config?.thresholds || {};
    if (typeof t.tier_5_min === "number" && score >= t.tier_5_min) return 5;
    if (typeof t.tier_4_min === "number" && score >= t.tier_4_min) return 4;
    if (typeof t.tier_3_min === "number" && score >= t.tier_3_min) return 3;
    if (typeof t.tier_2_min === "number" && score >= t.tier_2_min) return 2;
    return 1;
  }

  function tierToRoute(config, tier) {
    const map = config?.outputs?.lead_tier_values || {};
    if (tier === 5) return map.tier_5 || "AE";
    if (tier === 4) return map.tier_4 || "AE";
    if (tier === 3) return map.tier_3 || "AE";
    if (tier === 2) return map.tier_2 || "SDR";
    return map.tier_1 || "DOWNSELL";
  }

  function buildRedirect(config, tier, route) {
    if (tier === 1) return config?.routing?.tier_1?.url || "/fast-starter-program";

    const qs = new URLSearchParams();
    qs.set(config?.outputs?.lead_tier_param || "lead-tier", route);
    qs.set("tier", String(tier));
    return `${CALL_BOOKING_PATH}?${qs.toString()}`;
  }

  function bind() {
    const root = document.querySelector('[data-ecom-form="application"]');
    if (!root) return;

    const form = root.querySelector("form");
    if (!form) return;

    if (form.dataset.ecomScoringBound === "1") return;
    form.dataset.ecomScoringBound = "1";

    form.addEventListener(
      "submit",
      () => {
        root.classList.add("is-redirecting");

        if (!configCache) {
          setHidden("scoring_status", "error");
          setHidden("scoring_error", configError || "config_not_ready");
          return;
        }

        try {
          const { score, answersByQid } = computeScore(configCache, form);
          const tier = scoreToTier(configCache, score);
          const route = tierToRoute(configCache, tier);

          setHidden("lead_score", score);
          setHidden("lead_tier", tier);
          setHidden("lead_route", route);
          setHidden("scoring_version", configCache?.version || "v1");
          setHidden("scoring_status", "ok");
          setHidden("scoring_error", "");

          Object.keys(answersByQid || {}).forEach((qid) => {
            const k = answersByQid[qid];
            if (!k) return;
            setHidden(`${qid}_key`, k);
          });

          const redirectUrl = buildRedirect(configCache, tier, route);

          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 650);
        } catch (e) {
          setHidden("scoring_status", "error");
          setHidden("scoring_error", e && e.message ? String(e.message) : "scoring_failed");
        }
      },
      true
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    preloadConfig();
    bind();
  });
})();
