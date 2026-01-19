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
      const shouldTrigger = triggerValues.includes(value);

      showContainers.forEach((container) => {
        container.style.display = shouldTrigger ? "" : "none";
      });

      hideContainers.forEach((container) => {
        container.style.display = shouldTrigger ? "none" : "";
        if (shouldTrigger) clearAllFields(container);
      });
    };

    radios.forEach((radio) => {
      radio.addEventListener("change", () => applyCondition(radio.value));
      if (radio.checked) applyCondition(radio.value);
    });
  };

  setupConditionalRadio({
    radioName: "So-we-can-see-where-you-re-starting-from-what-is-your-current-situation",
    triggerValues: ["I run my own business"],
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

  const writeField = (fieldKey, value) => {
    if (!value) return;
    document.querySelectorAll(`[data-field="${fieldKey}"]`).forEach((el) => {
      if (el.value) return;
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };

  const lead = getLead();
  if (lead) {
    writeField("name", lead.name);
    writeField("email", lead.email);
    writeField("phone", lead.phone);
  }
});
