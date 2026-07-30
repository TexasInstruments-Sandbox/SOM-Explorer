import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncData } from "./sync-data.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = path.join(projectRoot, "data", "soms.json");
const verifiedOn = "2026-07-30";

const partnerPrograms = {
  Aaeon: "Registered",
  "Beacon Embedded": "Registered",
  BeagleBoard: "Preferred",
  BytesAtWork: "Registered",
  "Conclusive Engineering": "Registered",
  "Critical Link": "Registered",
  Engicam: "Registered",
  Ezurio: "Preferred",
  Forlinx: "Registered",
  HZHYTECH: "Registered",
  Iesy: "Registered",
  iWave: "Preferred",
  Kontron: "Registered",
  MYIR: "Registered",
  Octavo: "Registered",
  Phytec: "Premium",
  Technexion: "Registered",
  Tessolve: "Registered",
  Toradex: "Premium",
  TQ: "Premium",
  Tronlong: "Registered",
  Vanteon: "Registered",
  Variscite: "Preferred",
  WEATHINK: "Registered",
  ZLG: "Registered",
  congatec: "Registered",
};

const toolIds = {
  "carbonam62-ezurio-am62": "EZURI-3P-CARBONAM62",
  "carbonam67-ezurio-am67": "EZURI-3P-CARBONAM67",
  "ig-g69m-iwave-am62l": "IWAVE-3P-OSM-LF-AM62LX",
  "iw-rainbow-g55m-iwave-am62a": "IWAVE-3P-OSM-LF-AM62A",
  "m62xx-t-zlg-am62": "ZLG-3P-M62XX",
  "m64xx-zlg-am64": "ZLG-3P-M6442",
  "m65xx-zlg-am65": "ZLG-3P-M65XX",
  "wtc-am6254s-weathink-am62": "WEATH-3P-WTC-AM6254S",
  "var-som-am62-variscite-am62": "VAR-3P-SOM-AM62",
  "var-som-am62px-variscite-am62p": "VAR-3P-SOM-AM62P",
  "vanws-vgateway-vanteon-am335": "VANWS-3P-VGATEWAY",
  "som-tl62x-tronlong-am62": "TRONL-3P-SOM-TL62",
  "som-tl64x-tronlong-am64": "TRONL-3P-SOM-TL64",
  "tqma65xx-tq-am65": "TQ-3P-SOM-TQMA65XX",
  "tqma243xl-tq-am243": "TQ-3P-SOM-TQMA243XL",
  "tqma62xx-tq-am62": "TQ-3P-SOM-TQMA62XX",
  "tqma64xxl-tq-am64": "TQ-3P-SOM-TQMA64XXL",
  "tqma335x-tq-am335": "TQ-3P-SITARASOMS",
  "tqma57xx-tq-am57": "TQ-3P-SITARASOMS",
  "verdin-am62-toradex-am62": "TRDX-3P-VERDIN-AM62",
  "aquila-am69-toradex-am69": "TRDX-3P-AQUILA-AM69",
  "axon-am62x-technexion-am62": "TECHN-3P-SOM-AXON-AM62",
  "rovy-4vm-technexion-tda4vm": "TECHN-3P-SOM-ROVY-4VM",
  "phycore-am62x-phytec-am62": "PHYTC-3P-KIT-AM62",
  "phycore-am62x-dsc-phytec-am62": "PHYTC-3P-KIT-AM62",
  "phycore-am67x-phytec-am67": "PHYTC-3P-PHYCORE-AM67",
  "phycore-am62a-phytec-am62a": "PHYTC-3P-PHYCORE-AM62A",
  "phycore-am64x-phytec-am64": "PHYTC-3P-KIT-AM64",
  "phycore-am57x-phytec-am57": "PHYTC-3P-PHYCORE-AM57X",
  "phycore-am335x-phytec-am335": "PHYTC-3P-PHYCORE-AM335X",
  "osd62x-octavo-am62": "OCTVO-3P-OSD62X",
  "be-am6254-bytesatwork-am62": "BYTES-3P-BE-AM6254",
  "fet6254-c-forlinx-am62": "FORLX-3P-FET6254-C",
  "osm-lf-am62-iesy-am62": "IESY-3P-OSM-LF-AM62",
  "mitysom-am62-critical-link-am62": "CRLNK-3P-MITYSOM-AM62",
  "mitysom-am62a-critical-link-am62a": "CRLNK-3P-MITYSOM-AM62A",
  "mitysom-am62p-critical-link-am62p": "CRLNK-3P-MITYSOM-AM62P",
  "mitysom-am57x-critical-link-am57": "CRLNK-3P-SOMS",
  "beacon-am62l-beacon-embedded-am62l": "BEACN-3P-AM62L-SOM",
  "icore-am62x-engicam-am62": "ENGCM-3P-ICORE-AM62X",
  "pico-am62-aaeon-am62": "AAEON-3P-PICOAM62",
  "beaglemod-am62-beagleboard-am62": "BEAGL-3P-BEAGLEMOD-AM62",
  "phyflex-am62l-phytec-am62l": "PHYTC-3P-PHYFLEX-AM62L",
};

const fieldPatches = {
  "carbonam62-ezurio-am62": {
    formFactorRaw: "OSM-MF",
    wireless: "Optional",
    flash: "Up to 128 GB eMMC (16 GB default)",
    ddr: "1 GB / 2 GB / 4 GB LPDDR4",
  },
  "carbonam67-ezurio-am67": {
    formFactorRaw: "OSM-MF",
    wireless: "Optional",
    flash: "Up to 128 GB eMMC (16 GB default)",
    ddr: "4 GB / 8 GB LPDDR4",
  },
  "iw-rainbow-g55m-iwave-am62a": {
    formFactorRaw: "OSM-LF",
    wireless: "Yes",
    flash: "16 GB–128 GB eMMC; 16 Mb QSPI",
    ddr: "2 GB–8 GB LPDDR4",
  },
  "var-som-am62-variscite-am62": {
    flash: "8 GB–128 GB eMMC",
    ddr: "512 MB–4 GB DDR4",
    wireless: "Yes",
  },
  "var-som-am62px-variscite-am62p": {
    id: "var-som-am62p-variscite-am62p",
    name: "VAR-SOM-AM62P",
    flash: "8 GB–128 GB eMMC",
    ddr: "512 MB–4 GB LPDDR4",
    wireless: "Yes",
  },
  "aquila-am69-toradex-am69": {
    formFactorRaw: "SO-DIMM",
    formFactorFamily: "SO-DIMM",
    flash: "Up to 128 GB eMMC",
    ddr: "Up to 32 GB LPDDR4",
    wireless: "Yes",
  },
  "phycore-am67x-phytec-am67": {
    formFactorRaw: "High-density board-to-board connectors",
    flash: "Up to 128 GB eMMC",
    ddr: "Up to 8 GB LPDDR4",
  },
  "mitysom-am62-critical-link-am62": {
    flash: "32 GB eMMC; 256 MB Octal/Quad SPI NOR",
    ddr: "4 GB DDR4",
  },
  "mitysom-am62a-critical-link-am62a": {
    flash: "Up to 128 GB eMMC; 256 MB Octal/Quad SPI NOR",
    ddr: "Up to 16 GB LPDDR4",
  },
  "mitysom-am62p-critical-link-am62p": {
    flash: "256 GB eMMC; 256 MB Octal/Quad SPI NOR",
    ddr: "8 GB LPDDR4",
  },
  "icore-am62x-engicam-am62": {
    id: "i-core-am62x-engicam-am62",
    name: "i.Core-AM62x",
    formFactorRaw: "SO-DIMM (200-pin EDIMM 2.0)",
    formFactorFamily: "SO-DIMM",
    flash: "8 GB or greater eMMC",
    ddr: "1 GB / 2 GB DDR4",
  },
};

const newModules = [
  {
    id: "carbonam62l-ezurio-am62l",
    name: "CarbonAM62L",
    vendor: "Ezurio",
    device: "AM62L",
    formFactorRaw: "OSM-SF",
    formFactorFamily: "OSM",
    region: "North America",
    tiToolId: "EZURI-3P-CARBONAM62L",
    partnerProgram: "Registered",
    wireless: "Optional",
    flash: "eMMC (capacity varies)",
    ddr: "512 MB / 1 GB / 2 GB LPDDR4",
    released: "Yes",
    lifecycle: "Production",
    sourceRow: 51,
  },
  {
    id: "rchd-am62-conclusive-engineering-am62",
    name: "RCHD-AM62",
    vendor: "Conclusive Engineering",
    device: "AM62",
    formFactorRaw: "SO-DIMM",
    formFactorFamily: "SO-DIMM",
    region: "EMEA",
    tiToolId: "CONCL-3P-RCHD-AM62",
    partnerProgram: "Unknown",
    wireless: "Yes",
    flash: "4 GB–64 GB eMMC",
    ddr: "512 MB–8 GB DDR4",
    released: "Yes",
    lifecycle: "Production",
    sourceRow: 52,
  },
  {
    id: "hz-core-am62x-hzhytech-am62",
    name: "HZ-CORE-AM62X",
    vendor: "HZHYTECH",
    device: "AM62",
    formFactorRaw: "Solder-down stamp module",
    formFactorFamily: "Solder down",
    region: "China",
    tiToolId: "HZHYT-3P-HZ-CORE-AM62X",
    partnerProgram: "Unknown",
    wireless: "Unknown",
    flash: "8 GB eMMC",
    ddr: "2 GB DDR4",
    released: "Yes",
    lifecycle: "Production",
    sourceRow: 53,
  },
  {
    id: "myc-ym62x-myir-am62",
    name: "MYC-YM62X",
    vendor: "MYIR",
    device: "AM62",
    formFactorRaw: "Not specified",
    formFactorFamily: "Proprietary connector",
    region: "China",
    tiToolId: "MYIR-3P-YM62X",
    partnerProgram: "Unknown",
    wireless: "Unknown",
    flash: "",
    ddr: "",
    released: "Yes",
    lifecycle: "Production",
    sourceRow: 54,
  },
  {
    id: "tqma67xx-tq-am67",
    name: "TQMa67xx / TQMa67xxL",
    vendor: "TQ",
    device: "AM67",
    formFactorRaw: "HDI / LGA",
    formFactorFamily: "Proprietary connector",
    region: "EMEA",
    tiToolId: "TQ-3P-SOM-TQMA67XX",
    partnerProgram: "Premium",
    wireless: "Unknown",
    flash: "Up to 128 GB eMMC; 256 MB NOR",
    ddr: "Up to 8 GB LPDDR4 with ECC",
    released: "Yes",
    lifecycle: "Production",
    sourceRow: 55,
  },
  {
    id: "phycore-am68a-phytec-am68",
    name: "phyCORE-AM68A",
    vendor: "Phytec",
    device: "AM68",
    formFactorRaw: "High-density board-to-board connectors",
    formFactorFamily: "Proprietary connector",
    region: "EMEA",
    tiToolId: "PHYTC-3P-PHYCORE-AM68",
    partnerProgram: "Premium",
    wireless: "Unknown",
    flash: "Up to 256 GB eMMC; 64 MB QSPI",
    ddr: "Up to 2 × 8 GB LPDDR4",
    released: "Yes",
    lifecycle: "Production",
    sourceRow: 56,
  },
  {
    id: "conga-stda4-congatec-tda4vm",
    name: "conga-STDA4",
    vendor: "congatec",
    device: "TDA4VM",
    formFactorRaw: "SMARC",
    formFactorFamily: "SMARC",
    region: "EMEA",
    tiToolId: "CONGA-3P-STDA4",
    partnerProgram: "Unknown",
    wireless: "Optional",
    flash: "Up to 128 GB eMMC 5.1",
    ddr: "Up to 8 GB LPDDR4",
    released: "Yes",
    lifecycle: "Production",
    sourceRow: 57,
  },
];

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
data.sourceWorkbook = "TI-SOM-List-Dec11-Rev01.xlsx (not committed)";
data.source = "Original TI SOM workbook, refreshed against the TI.com tool catalog";
data.lastVerified = verifiedOn;

data.modules.forEach((module) => {
  const originalId = module.id;
  const toolId = toolIds[originalId] || module.tiToolId;
  if (toolId) {
    module.tiToolId = toolId;
    module.tiLink = `https://www.ti.com/tool/${toolId}`;
    module.lastVerified = verifiedOn;
  } else {
    module.tiToolId = "";
    module.tiLink = "";
    module.lastVerified = "";
  }
  Object.assign(module, fieldPatches[originalId] || {});
});

newModules.forEach((module) => {
  module.tiLink = `https://www.ti.com/tool/${module.tiToolId}`;
  module.lastVerified = verifiedOn;
  const existingIndex = data.modules.findIndex((item) => item.id === module.id);
  if (existingIndex === -1) data.modules.push(module);
  else data.modules[existingIndex] = module;
});

data.modules.forEach((module) => {
  module.partnerProgram = partnerPrograms[module.vendor] || "Unknown";
});

fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
const normalized = syncData({ generatedOn: verifiedOn });
console.log(`Applied TI.com refresh: ${normalized.summary.modules} modules`);
