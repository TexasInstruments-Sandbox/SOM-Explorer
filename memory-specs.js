(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TI_SOM_MEMORY = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const units = ["B", "KB", "MB", "GB", "TB"];

  function formatCapacity(bytes) {
    const exponent = Math.min(units.length - 1, Math.max(0, Math.floor(Math.log(bytes) / Math.log(1024))));
    const amount = Number((bytes / (1024 ** exponent)).toFixed(3));
    return `${amount} ${units[exponent]}`;
  }

  function summarize(value, kind) {
    const source = String(value || "").trim();
    if (!source || source.toUpperCase() === "RAM") return "Not published";

    const typePattern = kind === "ram"
      ? /\b(?:LP\s*-?\s*DDR|DDR)\s*-?\s*[2-5]\s*[LX]?\b|\bSDRAM\b/gi
      : /\beMMC\b|\bUFS\b|\bNAND\b|\b(?:(?:Octal\/Quad\s+SPI|QSPI|OSPI|SPI)\s+)?NOR\b|\bEEPROM\b/gi;
    const types = [...source.matchAll(typePattern)].map((match) => ({
      index: match.index,
      name: kind === "ram" ? match[0].replace(/[\s-]/g, "").toUpperCase()
        : /^emmc$/i.test(match[0]) ? "eMMC" : match[0],
    }));
    // Unit case matters: Mb is megabits, while MB is megabytes.
    const capacityPattern = /\b(?:(\d+(?:\.\d+)?)\s*[×x]\s*)?(\d+(?:\.\d+)?)\s*([KMGTkmgt][Bb])\b/g;
    const capacities = [];
    for (const match of source.matchAll(capacityPattern)) {
      const end = match.index + match[0].length;
      const separator = source.indexOf(";", end);
      const segmentEnd = separator === -1 ? source.length : separator;
      // Lists share a following type; later default/custom maxima inherit the preceding type.
      const type = types.find((item) => item.index >= end && item.index < segmentEnd)
        || types.filter((item) => item.index < match.index).at(-1);
      const prefix = source.slice(capacities.at(-1)?.end || 0, match.index);
      const exponent = "KMGT".indexOf(match[3][0].toUpperCase()) + 1;
      const bytes = Number(match[1] || 1) * Number(match[2]) * (1024 ** exponent) / (match[3][1] === "b" ? 8 : 1);
      if (bytes <= 0) continue;
      capacities.push({
        bytes,
        end,
        type: type?.name || "",
        variable: /\b(?:up\s+to|optional)\b/i.test(prefix) || /\d\s*[/–—-]\s*$/.test(prefix),
      });
    }
    if (!capacities.length) return source;

    // Show the largest memory device, without adding ancillary NOR or EEPROM to flash.
    const maximum = capacities.reduce((largest, item) => item.bytes > largest.bytes ? item : largest);
    const sameType = capacities.filter((item) => item.type === maximum.type);
    const variable = sameType.some((item) => item.variable)
      || new Set(sameType.map((item) => item.bytes)).size > 1
      || (capacities.length > 1 && /\bor\b/i.test(source));
    const unbounded = /\bhigher capacities\b|\bor greater\b/i.test(source);
    const amount = `${unbounded ? "" : variable ? "Up to " : ""}${formatCapacity(maximum.bytes)}${unbounded ? "+" : ""}`;
    const type = maximum.type ? ` ${maximum.type}` : "";
    const ecc = kind === "ram" && /\bECC\b/i.test(source)
      ? /\boptional\s+ECC\b/i.test(source) ? " (optional ECC)" : " with ECC"
      : "";
    return `${amount}${type}${ecc}`;
  }

  return Object.freeze({
    ramSummary: (value) => summarize(value, "ram"),
    flashSummary: (value) => summarize(value, "flash"),
  });
});
