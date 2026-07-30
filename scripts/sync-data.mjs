import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = path.join(projectRoot, "data", "soms.json");
const scriptPath = path.join(projectRoot, "data", "soms-data.js");
const logoSourcesPath = path.join(projectRoot, "assets", "logos", "sources.json");
const partnerBadgeManifestPath = path.join(projectRoot, "assets", "partner-badges", "manifest.json");
const partnerBadgeSourcesPath = path.join(projectRoot, "assets", "partner-badges", "sources.json");
const mirrors = [
  { json: path.join(projectRoot, "data", "partners.json"), script: path.join(projectRoot, "data", "partners-data.js"), globalName: "TI_SOM_PARTNERS" },
  { json: path.join(projectRoot, "assets", "logos", "manifest.json"), script: path.join(projectRoot, "assets", "logos", "manifest-data.js"), globalName: "TI_SOM_LOGOS" },
  { json: partnerBadgeManifestPath, script: path.join(projectRoot, "assets", "partner-badges", "manifest-data.js"), globalName: "TI_PARTNER_PROGRAM_BADGES" },
  { json: path.join(projectRoot, "assets", "form-factors", "manifest.json"), script: path.join(projectRoot, "assets", "form-factors", "manifest-data.js"), globalName: "TI_SOM_FORM_FACTOR_LOGOS" },
];

function countUnique(modules, key) {
  return new Set(modules.map((module) => module[key]).filter(Boolean)).size;
}

function buildSearchText(module) {
  return [
    module.name,
    module.vendor,
    module.device,
    module.formFactorRaw,
    module.formFactorFamily,
    module.region,
    module.partnerProgram,
    module.wireless,
    module.flash,
    module.ddr,
    module.lifecycle,
    module.tiToolId,
  ].filter(Boolean).join(" ").toLowerCase();
}

function normalizeData(data, generatedOn = data.generatedOn) {
  const normalized = structuredClone(data);
  normalized.generatedOn = generatedOn;
  normalized.modules.forEach((module) => {
    module.tiToolId ||= "";
    module.lastVerified ||= "";
    module.searchText = buildSearchText(module);
  });
  normalized.summary = {
    modules: normalized.modules.length,
    vendors: countUnique(normalized.modules, "vendor"),
    devices: countUnique(normalized.modules, "device"),
    regions: countUnique(normalized.modules, "region"),
    formFactorFamilies: ["Board", "OSM", "Proprietary connector", "SMARC", "SO-DIMM", "Solder down"]
      .filter((value) => normalized.modules.some((module) => module.formFactorFamily === value)),
  };
  return normalized;
}

function validateData(data) {
  const errors = [];
  const requiredFields = ["id", "name", "vendor", "device", "formFactorRaw", "formFactorFamily", "region", "lifecycle"];
  const ids = new Set();
  const sourceRows = new Set();
  const partnerProgramsByVendor = new Map();
  const allowedPartnerPrograms = new Set(["Premium", "Preferred", "Registered", "Unknown"]);

  data.modules.forEach((module, index) => {
    requiredFields.forEach((field) => {
      if (!module[field]) errors.push(`Module ${index + 1} is missing ${field}`);
    });
    if (ids.has(module.id)) errors.push(`Duplicate id: ${module.id}`);
    ids.add(module.id);
    if (sourceRows.has(module.sourceRow)) errors.push(`Duplicate sourceRow: ${module.sourceRow}`);
    sourceRows.add(module.sourceRow);
    if (module.tiToolId && module.tiLink !== `https://www.ti.com/tool/${module.tiToolId}`) {
      errors.push(`${module.id} has mismatched tiToolId and tiLink`);
    }
    if (module.lastVerified && !module.tiToolId) {
      errors.push(`${module.id} has lastVerified without a TI tool ID`);
    }
    if (!allowedPartnerPrograms.has(module.partnerProgram)) errors.push(`${module.id} has invalid partnerProgram: ${module.partnerProgram}`);
    if (!partnerProgramsByVendor.has(module.vendor)) partnerProgramsByVendor.set(module.vendor, new Set());
    partnerProgramsByVendor.get(module.vendor).add(module.partnerProgram);
  });

  const partners = JSON.parse(fs.readFileSync(mirrors[0].json, "utf8"));
  const logos = JSON.parse(fs.readFileSync(mirrors[1].json, "utf8"));
  const logoSources = JSON.parse(fs.readFileSync(logoSourcesPath, "utf8"));
  const partnerBadges = JSON.parse(fs.readFileSync(partnerBadgeManifestPath, "utf8"));
  const partnerBadgeSources = JSON.parse(fs.readFileSync(partnerBadgeSourcesPath, "utf8"));
  new Set(data.modules.map((module) => module.vendor)).forEach((vendor) => {
    if (!partners[vendor]?.partnerPage) errors.push(`Missing partner page for ${vendor}`);
    if (!logos[vendor]) errors.push(`Missing logo mapping for ${vendor}`);
    else {
      const logoPath = path.join(projectRoot, logos[vendor]);
      if (!fs.existsSync(logoPath)) errors.push(`Missing logo file for ${vendor}: ${logos[vendor]}`);
      else if (fs.readFileSync(logoPath).toString("utf8").includes("placeholder logo")) errors.push(`Placeholder logo is still mapped for ${vendor}`);
    }
    if (!logoSources[vendor]?.logoSource) errors.push(`Missing logo source for ${vendor}`);
    if (logoSources[vendor]?.localPath !== logos[vendor]) errors.push(`Logo source path does not match manifest for ${vendor}`);
    if (partnerProgramsByVendor.get(vendor)?.size !== 1) errors.push(`Partner program is inconsistent for ${vendor}`);
    const program = [...(partnerProgramsByVendor.get(vendor) || [])][0];
    if (program === "Unknown" && partners[vendor]?.partnerPage?.startsWith("https://www.ti.com/partner/")) {
      errors.push(`TI.com partner ${vendor} must fall back to Registered instead of Unknown`);
    }
  });

  ["Premium", "Preferred", "Registered"].forEach((status) => {
    const badgePath = partnerBadges[status];
    if (!badgePath || !fs.existsSync(path.join(projectRoot, badgePath))) errors.push(`Missing ${status} partner badge`);
    if (!partnerBadgeSources[status]?.source) errors.push(`Missing source for ${status} partner badge`);
    if (partnerBadgeSources[status]?.localPath !== badgePath) errors.push(`Partner badge source path does not match manifest for ${status}`);
  });

  if (errors.length) throw new Error(errors.join("\n"));
}

export function syncData({ check = false, generatedOn } = {}) {
  const source = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const normalized = normalizeData(source, generatedOn || source.generatedOn);
  validateData(normalized);

  const expectedJson = `${JSON.stringify(normalized, null, 2)}\n`;
  const expectedScript = `window.TI_SOM_DATA = ${JSON.stringify(normalized, null, 2)};\n`;
  const mirrorOutputs = mirrors.map((mirror) => {
    const value = JSON.parse(fs.readFileSync(mirror.json, "utf8"));
    return { ...mirror, output: `window.${mirror.globalName} = ${JSON.stringify(value, null, 2)};\n` };
  });

  if (check) {
    const currentJson = fs.readFileSync(jsonPath, "utf8");
    const currentScript = fs.readFileSync(scriptPath, "utf8");
    const mirrorsMatch = mirrorOutputs.every((mirror) => fs.readFileSync(mirror.script, "utf8") === mirror.output);
    if (currentJson !== expectedJson || currentScript !== expectedScript || !mirrorsMatch) {
      throw new Error("Generated SOM data is out of sync. Run: node scripts/sync-data.mjs");
    }
    return normalized;
  }

  fs.writeFileSync(jsonPath, expectedJson);
  fs.writeFileSync(scriptPath, expectedScript);
  mirrorOutputs.forEach((mirror) => fs.writeFileSync(mirror.script, mirror.output));
  return normalized;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const data = syncData({
    check: process.argv.includes("--check"),
    generatedOn: process.argv.includes("--check") ? undefined : new Date().toISOString().slice(0, 10),
  });
  console.log(`${data.summary.modules} modules / ${data.summary.vendors} partners / data files in sync`);
}
