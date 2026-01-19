$(document).ready(function () {
  function isValidCountryCode(code) {
    return /^[a-z]{2}$/.test(code);
  }

  let countryCodePromise = null;

  function fetchCountryData() {
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

      // MaxMind GeoIP2 City API (correct source for city + region)
      if (typeof geoip2 !== "undefined" && typeof geoip2.city === "function") {
        geoip2.city(
          (response) => {
            const data = {
              code: response?.country?.iso_code?.toLowerCase?.() || fallbackCountry,
              country: response?.country?.names?.en || "",
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
    // UTC datetime
    const utcDateTime = new Date()
      .toISOString()
      .replace("T", " ")
      .replace("Z", " UTC");

    $(".date-and-time").val(utcDateTime);

    if (data?.ip) {
      $(".ip-address").val(data.ip);
    }

    // Country, city, region (class-based, NOT name-based)
    if (data?.country) {
      $(".user_country_name").val(data.country);
    }

    if (data?.city) {
      $(".city").val(data.city);
    }

    if (data?.region) {
      $(".region").val(data.region);
    }

    // Combined geolocation string
    const geoParts = [];
    if (data.city) geoParts.push(data.city);
    if (data.region) geoParts.push(data.region);
    if (data.country) geoParts.push(data.country);

    if (geoParts.length) {
      $(".ip-geolocation").val(geoParts.join(", "));
    }
  }

  const phoneInputs = $('input[ms-code-phone-number]');
  fetchCountryData(); // trigger early, cached

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
      fetchCountryData().then((countryCode) => {
        if (countryCode) iti.setCountry(countryCode);
      });

      function formatPhoneNumber() {
        if (typeof intlTelInputUtils === "undefined") return;

        const formattedNumber = iti.getNumber(
          intlTelInputUtils.numberFormat.NATIONAL
        );
        input.value = formattedNumber;

        const fullNumber = iti.getNumber(intlTelInputUtils.numberFormat.INTERNATIONAL);

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

        form.on("submit", function () {
  if (typeof intlTelInputUtils === "undefined") return;

  const fullNumber = iti.getNumber(intlTelInputUtils.numberFormat.INTERNATIONAL);

  input.value = fullNumber;

  const fullInput = $(this).find(".full-phone-input");
  if (fullInput.length) fullInput.val(fullNumber);
});
      }
    });
  });
});
