(function () {
  if (window.__ecomSurveyUIBound) return;
  window.__ecomSurveyUIBound = true;

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

  const writeField = (fieldKey, value) => {
    if (!value) return;
    document.querySelectorAll(`[data-field="${fieldKey}"]`).forEach((el) => {
      if (el.value) return;
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };

  const setupConditionalRadio = ({ radioName, triggerValues, showAttr, hideAttr }) => {
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

    const applyCondition = (value) => {
      const shouldTrigger = (triggerValues || []).includes(value);

      showContainers.forEach((container) => {
        container.style.display = shouldTrigger ? "" : "none";
      });

      hideContainers.forEach((container) => {
        container.style.display = shouldTrigger ? "none" : "";
        if (shouldTrigger) clearAllFields(container);
      });
    };

    radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        const key = (radio.dataset && radio.dataset.answer) ? String(radio.dataset.answer) : String(radio.value || "");
        applyCondition(key);
      });

      if (radio.checked) {
        const key = (radio.dataset && radio.dataset.answer) ? String(radio.dataset.answer) : String(radio.value || "");
        applyCondition(key);
      }
    });
  };

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
          if (window.__ecomSurveyHydrating) return;

          setDisplay(errorBox, "none");

          if (stepIndex === currentStep) {
            setTimeout(() => {
              if (canProceed()) goNext();
            }, 150);
          }
        });

        input.addEventListener("input", () => {
          if (window.__ecomSurveyHydrating) return;
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

    setupConditionalRadio({
      radioName: "So-we-can-see-where-you-re-starting-from-what-is-your-current-situation",
      triggerValues: ["I run my own business", "I run my own business.", "run_business"],
      showAttr: 'conditional-step="2"',
      hideAttr: 'conditional-step="1"'
    });

    const lead = getLead();
    if (lead) {
      window.__ecomSurveyHydrating = true;
      try {
        writeField("name", lead.name);
        writeField("email", lead.email);
        writeField("phone", lead.phone);
      } finally {
        setTimeout(() => {
          window.__ecomSurveyHydrating = false;
        }, 0);
      }
    }
  });
})();

(function () {
  if (window.__ecomSurveyScoringBound) return;
  window.__ecomSurveyScoringBound = true;

  const CONFIG_URL = "https://mat1017.github.io/ecom/config/lead-scoring-config.json";
  const CALL_BOOKING_PATH = "/call-booking";
  const REDIRECT_DELAY_MS = 1200;

  const CONFIG_CACHE_KEY = "ecom_scoring_config_cache";

  function setHidden(key, value) {
    if (value === undefined || value === null) return;
    const v = String(value);
    document.querySelectorAll(`[data-field="${key}"], input[name="${key}"]`).forEach((el) => {
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function safeJsonParse(v) {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }

  async function fetchConfig() {
    try {
      const cached = safeJsonParse(sessionStorage.getItem(CONFIG_CACHE_KEY) || "null");
      if (cached && cached.ts && cached.data && Date.now() - cached.ts < (cached.ttl_ms || 0)) {
        return cached.data;
      }
    } catch {}

    const res = await fetch(CONFIG_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("config_fetch_failed");

    const data = await res.json();
    const ttl = typeof data?.ttl_ms === "number" ? data.ttl_ms : 0;

    try {
      sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({ ts: Date.now(), ttl_ms: ttl, data }));
    } catch {}

    return data;
  }

  function getSelectedAnswerKey(formEl, qid) {
    const checked = formEl.querySelector(`input[data-field="${qid}"]:checked`);
    if (checked) {
      if (checked.dataset && checked.dataset.answer) return String(checked.dataset.answer);
      if (checked.value) return String(checked.value);
    }

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

    return score;
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

  function validTier(tier) {
    return tier === 1 || tier === 2 || tier === 3 || tier === 4 || tier === 5;
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
      async () => {
        if (form.dataset.ecomScoringSubmitted === "1") return;
        form.dataset.ecomScoringSubmitted = "1";

        try {
          const config = await fetchConfig();

          const score = computeScore(config, form);
          const tier = scoreToTier(config, score);
          const route = tierToRoute(config, tier);

          if (!validTier(tier)) throw new Error("invalid_tier");

          setHidden("lead_score", score);
          setHidden("lead_tier", tier);
          setHidden("lead_route", route);
          setHidden("scoring_version", config?.version || "v1");
          setHidden("scoring_status", "ok");

          const redirectUrl = buildRedirect(config, tier, route);

          setTimeout(() => {
            window.location.href = redirectUrl;
          }, REDIRECT_DELAY_MS);
        } catch (err) {
          const msg = (err && err.message) ? String(err.message) : "unknown_error";
          setHidden("scoring_status", "error");
          setHidden("scoring_error", msg);
          form.dataset.ecomScoringSubmitted = "0";
        }
      },
      true
    );
  }

  document.addEventListener("DOMContentLoaded", bind);
})();
