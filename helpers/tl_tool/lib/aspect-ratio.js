(function exposeAspectRatio(root, factory) {
  const api = Object.freeze(factory());

  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }

  Object.defineProperty(root, "aspectRatio", {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false,
  });
})(typeof globalThis === "undefined" ? this : globalThis, function createApi() {
  const DECIMAL_RATIO = /^[0-9]+(?:[.][0-9]+)?$/;
  const FRACTION_RATIO =
    /^([0-9]+(?:[.][0-9]+)?)\s*[:/]\s*([0-9]+(?:[.][0-9]+)?)$/;

  function parseAspectRatio(value) {
    if (typeof value !== "string") return null;

    const normalized = value.trim();
    if (DECIMAL_RATIO.test(normalized)) {
      const ratio = Number(normalized);
      return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
    }

    const match = normalized.match(FRACTION_RATIO);
    if (!match) return null;

    const numerator = Number(match[1]);
    const denominator = Number(match[2]);
    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      numerator <= 0 ||
      denominator <= 0
    ) {
      return null;
    }

    return numerator / denominator;
  }

  return { parseAspectRatio };
});
