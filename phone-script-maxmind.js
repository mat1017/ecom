$(document).ready(function () {
  function isValidCountryCode(code) {
    return /^[a-z]{2}$/.test(code);
  }

  let countryCodePromise = null;

  function fetchCountryCode() {
    if (countryCodePromise) return countryCodePromise;

    const cacheKey = "userCountryInfo";
    const now = Date.now();

    let cached = null;
    try {
      cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }

    // Use cache if valid (24h)
    if (cached && now - cached.timestamp < 86400000 && isValidCountryCode(cached.code)) {
      populateHiddenFields(cached);
      countryCodePromise = Promise.resolve(cached.code);
      return countryCodePromise;
    }

    const fallbackCountry = "us";

    countryCodePromise = new Promise((resolve) => {
      const saveToCache = (data) => {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ ...data, timestamp: now })
        );
        populateHiddenFields(data);
        resolve(data.code);
      };

      if (typeof geoip2 !== "undefined" && typeof geoip2.country === "function") {
        geoip2.country(
          (response) => {
            const data = {
              code: response?.country?.iso_code?.toLowerCase?.() || fallbackCountry,
              name: response?.country?.names?.en || "",
              city: response?.city?.names?.en || "",
              region: response?.subdivisions?.[0]?.names?.en || "",
              ip: response?.traits?.ip_address || "",
            };

            if (isValidCountryCode(data.code)) {
              saveToCache(data);
            } else {
              resolve(fallbackCountry);
            }
          },
          () => resolve(fallbackCountry)
        );
      } else {
        resolve(fallbackCountry);
      }
    });

    return countryCodePromise;
  }

  function populateHiddenFields(data) {
    const utcDateTime = new Date()
      .toISOString()
      .replace("T", " ")
      .replace("Z", " UTC");

    $(".date-and-time").val(utcDateTime);

    if (data?.ip) {
      $(".ip-address").val(data.ip);
    }

    const geoParts = [];
    if (data.city) geoParts.push(data.city);
    if (data.region) geoParts.push(data.region);
    if (data.name) geoParts.push(data.name);

    if (geoParts.length) {
      $(".ip-geolocation").val(geoParts.join(", "));
    }

    if ($('input[name="user_country_name"]').length && data.name) {
      $('input[name="user_country_name"]').val(data.name);
    }

    if ($('input[name="ip_address"]').length && data.ip) {
      $('input[name="ip_address"]').val(data.ip);
    }
  }

  const phoneInputs = $('input[ms-code-phone-number]');
  fetchCountryCode(); // trigger early, cached after first load

  const initializedForms = new Set();

  phoneInputs.each(function () {
    const input = this;
    const preferredCountries = $(input).attr("ms-code-phone-number").split(",");

    const iti = window.intlTelInput(input, {
      preferredCountries,
      utilsScript:
        "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
    });

    iti.promise.then(() => {
      fetchCountryCode().then((countryCode) => {
        if (countryCode) iti.setCountry(countryCode);
      });

      function formatPhoneNumber() {
        if (typeof intlTelInputUtils === "undefined") return;

        const formattedNumber = iti.getNumber(
          intlTelInputUtils.numberFormat.NATIONAL
        );
        input.value = formattedNumber;

        const countryDialCode = iti.getSelectedCountryData().dialCode;
        const fullNumber = "+" + countryDialCode + input.value.replace(/^0/, "");

        const $form = $(input).closest("form");

        const fullInput = $form.find(".full-phone-input");
        if (fullInput.length) {
          fullInput.val(fullNumber);
        }

        const hubspotField = $form.find("input[name='phone'].hs-input");
        if (hubspotField.length) {
          hubspotField.val(fullNumber).trigger("input").trigger("change");
        }
      }

      input.addEventListener("change", formatPhoneNumber);
      input.addEventListener("keyup", formatPhoneNumber);

      const form = $(input).closest("form");
      if (!initializedForms.has(form[0])) {
        initializedForms.add(form[0]);

        form.submit(function () {
          const fullNumber = iti.getNumber(
            intlTelInputUtils.numberFormat.INTERNATIONAL
          );
          input.value = fullNumber;
        });
      }
    });
  });
});
