document.addEventListener("DOMContentLoaded", function () {
  const steps = document.querySelectorAll(".multistep-form-step-modal");
  const progressBar = document.querySelector(
    ".multistep-form-progressbar-progress-modal"
  );
  const stepNumber = document.querySelector(".multistep-progress-number");
  const stepPercent = document.querySelector(".multistep-progress-percent");

  const nextButtons = document.querySelectorAll(".vsl-next-button");
  const nextArrow = document.querySelector(".multistep-form-next-modal");
  const prevArrow = document.querySelector(".multistep-form-previous-modal");

  const totalSteps = steps.length;
  let currentStep = 0;

  function updateUI() {
    steps.forEach((step, index) => {
      step.style.display = index === currentStep ? "flex" : "none";
    });

    const percent = Math.round((currentStep / (totalSteps - 1)) * 100);

    if (progressBar) progressBar.style.width = percent + "%";
    if (stepNumber) stepNumber.textContent = `${currentStep + 1}/${totalSteps}`;
    if (stepPercent) stepPercent.textContent = `${percent}%`;

    if (prevArrow) {
      prevArrow.style.display = currentStep === 0 ? "none" : "flex";
    }

    if (nextArrow) {
      nextArrow.style.display =
        currentStep === totalSteps - 1 ? "none" : "flex";
    }
  }

  function canProceed() {
  const stepEl = steps[currentStep];
  const errorBox = stepEl.querySelector(".multistep-form-error");

  const hasCheckedInput = stepEl.querySelector(
    'input[type="radio"]:checked, input[type="checkbox"]:checked'
  );

  const hasFilledInput = Array.from(
    stepEl.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="tel"], textarea, select'
    )
  ).some(el => el.value.trim() !== "");

  const isValid = hasCheckedInput || hasFilledInput;

  if (!isValid) {
    if (errorBox) errorBox.style.display = "flex";
    return false;
  }

  if (errorBox) errorBox.style.display = "none";
  return true;
}


  function goNext() {
    if (!canProceed()) return;

    if (currentStep < totalSteps - 1) {
      currentStep++;
      updateUI();
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      currentStep--;
      updateUI();
    }
  }

  // Manual Next buttons
  nextButtons.forEach((btn) => {
    btn.addEventListener("click", goNext);
  });

  // Arrow navigation
  if (nextArrow) nextArrow.addEventListener("click", goNext);
  if (prevArrow) prevArrow.addEventListener("click", goPrev);

  // Auto-advance + hide error on selection
  steps.forEach((step, stepIndex) => {
  const inputs = step.querySelectorAll("input, textarea, select");
  const errorBox = step.querySelector(".multistep-form-error");

  inputs.forEach(input => {
    input.addEventListener("change", () => {
      if (errorBox) errorBox.style.display = "none";

      if (stepIndex === currentStep) {
        setTimeout(() => {
          if (canProceed()) goNext();
        }, 150);
      }
    });

    input.addEventListener("input", () => {
      if (errorBox) errorBox.style.display = "none";
    });
  });
});


  // Init
  updateUI();
});


//-- ----------------------------------- VSL SHOW POPUP ----------------------------------- 


document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".survey_button"),
        popup = document.querySelector(".vsl-popup");
  if (!btn || !popup) return;

  const show = () => popup.style.display = "flex";

  if (!btn.classList.contains("is-inactive")) return btn.onclick = show;

  const observer = new MutationObserver(() => {
    if (!btn.classList.contains("is-inactive")) {
      btn.onclick = show;
      observer.disconnect();
    }
  });

  observer.observe(btn, { attributes: true, attributeFilter: ["class"] });
});


//-- ----------------------------------- CONDITIONAL STEP FUNCTION -----------------------------------


function setupConditionalRadio({
  radioName,
  triggerValues,
  showAttr,
  hideAttr
}) {
  const radios = document.querySelectorAll(`input[name="${radioName}"]`);
  const showEls = document.querySelectorAll(`[${showAttr}]`);
  const hideEls = document.querySelectorAll(`[${hideAttr}]`);

  function applyCondition(value) {
    const shouldTrigger = triggerValues.includes(value);

    showEls.forEach(el => {
      el.style.display = shouldTrigger ? "" : "none";
    });

    hideEls.forEach(el => {
      el.style.display = shouldTrigger ? "none" : "";
    });
  }

  radios.forEach(radio => {
    radio.addEventListener("change", () => {
      applyCondition(radio.value);
    });

    if (radio.checked) {
      applyCondition(radio.value);
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  setupConditionalRadio({
    radioName: "So-we-can-see-where-you-re-starting-from-what-is-your-current-situation",
    triggerValues: ["I run my own business"],
    showAttr: 'conditional-step="2"',
    hideAttr: 'conditional-step="1"'
  });
});

//-- ----------------------------------- Autofill Data from Parameters -----------------------------------


document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  ["name", "email", "phone"].forEach(key => {
    const input = document.querySelector(`input[name="${key}"]`);
    const value = params.get(key);
    if (input && value) input.value = value;
  });
});