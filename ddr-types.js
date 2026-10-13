(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TI_SOM_DDR = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const DDR_TYPES = Object.freeze([
    "DDR2", "DDR3", "DDR3L", "DDR4", "DDR5",
    "LPDDR2", "LPDDR3", "LPDDR4", "LPDDR4X", "LPDDR5", "LPDDR5X",
    "Unknown",
  ]);

  function deriveDdrTypes(value) {
    const found = new Set();
    // Match complete memory type names, so LPDDR4 never also matches DDR4.
    const pattern = /\b(LP\s*-?\s*DDR|DDR)\s*-?\s*([2-5])\s*([LX]?)(?![A-Z0-9])/gi;
    for (const match of String(value || "").matchAll(pattern)) {
      const type = `${match[1].replace(/[\s-]/g, "")}${match[2]}${match[3]}`.toUpperCase();
      if (DDR_TYPES.includes(type)) found.add(type);
    }
    return found.size ? DDR_TYPES.filter((type) => found.has(type)) : ["Unknown"];
  }

  return Object.freeze({ DDR_TYPES, deriveDdrTypes });
});
