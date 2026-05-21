const fieldNames = [
  "name",
  "vendor",
  "device",
  "formFactorRaw",
  "formFactorFamily",
  "region",
  "tiLink",
  "partnerProgram",
  "wireless",
  "flash",
  "ddr",
  "released",
  "lifecycle",
  "id",
  "sourceRow",
  "searchText",
];

const choiceFields = {
  formFactorFamily: ["Proprietary connector", "OSM", "SMARC", "Solder down", "SO-DIMM", "Board"],
  partnerProgram: ["Premium", "Preferred", "Registered", "Unknown"],
  wireless: ["Yes", "No", "Unknown"],
  released: ["Yes", "No", "Unknown"],
  lifecycle: ["Concept", "Preview", "Production"],
};

const partnerLevelFields = new Set(["region", "partnerProgram"]);

const partnerLevelLabels = {
  region: "Region",
  partnerProgram: "Partner Program Status",
};

const palette = {
  Premium: "#990000",
  Preferred: "#137f8c",
  Registered: "#cc0000",
  Unknown: "#808080",
};

const state = {
  data: null,
  selectedId: "",
  search: "",
  filters: {
    vendor: "All",
    device: "All",
    partnerProgram: "All",
  },
  dirty: false,
};

const dom = {
  editorStatus: document.querySelector("#editorStatus"),
  recordCount: document.querySelector("#recordCount"),
  recordList: document.querySelector("#recordList"),
  recordSearch: document.querySelector("#recordSearch"),
  vendorFilter: document.querySelector("#vendorFilter"),
  deviceFilter: document.querySelector("#deviceFilter"),
  programFilter: document.querySelector("#programFilter"),
  summaryGrid: document.querySelector("#summaryGrid"),
  form: document.querySelector("#recordForm"),
  formMode: document.querySelector("#formMode"),
  formTitle: document.querySelector("#formTitle"),
  newRecord: document.querySelector("#newRecord"),
  duplicateRecord: document.querySelector("#duplicateRecord"),
  deleteRecord: document.querySelector("#deleteRecord"),
  importJson: document.querySelector("#importJson"),
  jsonFile: document.querySelector("#jsonFile"),
  copyJson: document.querySelector("#copyJson"),
  downloadJson: document.querySelector("#downloadJson"),
  downloadDataScript: document.querySelector("#downloadDataScript"),
  vendorOptions: document.querySelector("#vendorOptions"),
  deviceOptions: document.querySelector("#deviceOptions"),
  regionOptions: document.querySelector("#regionOptions"),
};

const inputs = Object.fromEntries(fieldNames.map((name) => [name, document.querySelector(`#${name}`)]));

init().catch((error) => {
  dom.editorStatus.textContent = `Unable to load data: ${error.message}`;
});

async function init() {
  state.data = await loadSomData();
  normalizeAllModules();
  state.selectedId = state.data.modules[0]?.id || "";
  populateChoiceSelects();
  bindEvents();
  renderAll();
}

async function loadSomData() {
  if (window.TI_SOM_DATA) return structuredCloneSafe(window.TI_SOM_DATA);
  const response = await fetch("./data/soms.json");
  if (!response.ok) throw new Error("data/soms.json could not be loaded");
  return response.json();
}

function bindEvents() {
  dom.recordSearch.addEventListener("input", () => {
    state.search = dom.recordSearch.value.trim().toLowerCase();
    renderRecordList();
  });

  [
    [dom.vendorFilter, "vendor"],
    [dom.deviceFilter, "device"],
    [dom.programFilter, "partnerProgram"],
  ].forEach(([select, key]) => {
    select.addEventListener("change", () => {
      state.filters[key] = select.value;
      renderRecordList();
    });
  });

  dom.recordList.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-record-id]");
    if (!trigger) return;
    selectRecord(trigger.dataset.recordId);
  });

  dom.form.addEventListener("input", (event) => {
    if (event.target.readOnly) return;
    updateSelectedFromForm();
  });

  dom.form.addEventListener("change", (event) => {
    if (event.target.readOnly) return;
    updateSelectedFromForm();
  });

  dom.newRecord.addEventListener("click", addRecord);
  dom.duplicateRecord.addEventListener("click", duplicateRecord);
  dom.deleteRecord.addEventListener("click", deleteRecord);
  dom.importJson.addEventListener("click", () => dom.jsonFile.click());
  dom.jsonFile.addEventListener("change", importJson);
  dom.copyJson.addEventListener("click", copyJson);
  dom.downloadJson.addEventListener("click", () => downloadFile("soms.json", exportJson(), "application/json"));
  dom.downloadDataScript.addEventListener("click", () => downloadFile("soms-data.js", exportDataScript(), "text/javascript"));
}

function renderAll() {
  updateStatus();
  populateFiltersAndLists();
  renderSummary();
  renderRecordList();
  renderForm();
}

function updateStatus(message) {
  const suffix = state.dirty ? "Unsaved edits" : "No unsaved edits";
  dom.editorStatus.textContent = message || `${state.data.modules.length} boards loaded / ${suffix}`;
}

function populateChoiceSelects() {
  Object.entries(choiceFields).forEach(([key, values]) => {
    inputs[key].innerHTML = values.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("");
  });
}

function populateFiltersAndLists() {
  populateFilter(dom.vendorFilter, uniqueValues("vendor"), state.filters.vendor);
  populateFilter(dom.deviceFilter, uniqueValues("device"), state.filters.device);
  populateFilter(dom.programFilter, choiceFields.partnerProgram, state.filters.partnerProgram);
  populateDatalist(dom.vendorOptions, uniqueValues("vendor"));
  populateDatalist(dom.deviceOptions, uniqueValues("device"));
  populateDatalist(dom.regionOptions, uniqueValues("region"));
}

function populateFilter(select, values, selected) {
  const options = ["All", ...values];
  select.innerHTML = options.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("");
  select.value = options.includes(selected) ? selected : "All";
}

function populateDatalist(list, values) {
  list.innerHTML = values.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
}

function renderSummary() {
  const modules = state.data.modules;
  const cards = [
    ["Boards", modules.length],
    ["Partners", countUnique(modules, "vendor")],
    ["Devices", countUnique(modules, "device")],
  ];
  dom.summaryGrid.innerHTML = cards.map(([label, value]) => `
    <article class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderRecordList() {
  const records = filteredRecords();
  dom.recordCount.textContent = `${records.length} of ${state.data.modules.length} records`;

  if (records.length === 0) {
    dom.recordList.innerHTML = `<div class="record-card"><strong>No boards match</strong><span>Clear search or filters to see more records.</span></div>`;
    return;
  }

  dom.recordList.innerHTML = records.map((module) => `
    <button class="record-card ${module.id === state.selectedId ? "is-active" : ""}" type="button" data-record-id="${escapeAttr(module.id)}" style="--card-color:${programColor(module.partnerProgram)}">
      <strong>${escapeHtml(module.name || "Untitled board")}</strong>
      <span>${escapeHtml(module.vendor || "Unknown partner")} / ${escapeHtml(module.device || "Unknown device")}</span>
      <span>${escapeHtml(module.partnerProgram || "Unknown")} / ${escapeHtml(module.formFactorFamily || "Unknown")}</span>
    </button>
  `).join("");
}

function renderForm() {
  const module = selectedRecord();
  const disabled = !module;
  dom.form.querySelectorAll("input, select, textarea").forEach((item) => {
    item.disabled = disabled;
  });
  dom.duplicateRecord.disabled = disabled;
  dom.deleteRecord.disabled = disabled;

  if (!module) {
    dom.formMode.textContent = "No board selected";
    dom.formTitle.textContent = "Select or add a board";
    fieldNames.forEach((field) => {
      inputs[field].value = "";
    });
    return;
  }

  dom.formMode.textContent = module.sourceRow ? `Source row ${module.sourceRow}` : "New board";
  dom.formTitle.textContent = module.name || "Untitled board";
  fieldNames.forEach((field) => {
    inputs[field].value = module[field] ?? "";
  });
}

function filteredRecords() {
  const terms = state.search.split(/\s+/).filter(Boolean);
  return state.data.modules
    .filter((module) => {
      const matchesSearch = terms.every((term) => (module.searchText || "").includes(term));
      const matchesFilters = Object.entries(state.filters).every(([key, value]) => value === "All" || module[key] === value);
      return matchesSearch && matchesFilters;
    })
    .sort(moduleSorter);
}

function selectRecord(id) {
  state.selectedId = id;
  renderRecordList();
  renderForm();
}

function addRecord() {
  const nextRow = Math.max(1, ...state.data.modules.map((module) => Number(module.sourceRow) || 0)) + 1;
  const module = normalizeModule({
    name: "New SOM",
    vendor: "New Partner",
    device: "AM62",
    formFactorRaw: "",
    formFactorFamily: "Proprietary connector",
    region: "Unknown",
    tiLink: "",
    partnerProgram: "Unknown",
    wireless: "Unknown",
    flash: "",
    ddr: "",
    released: "Unknown",
    lifecycle: "Preview",
    sourceRow: nextRow,
  });
  module.id = uniqueIdFor(module, "");
  state.data.modules.push(module);
  state.selectedId = module.id;
  markDirty("New board added");
  renderAll();
}

function duplicateRecord() {
  const module = selectedRecord();
  if (!module) return;
  const clone = structuredCloneSafe(module);
  clone.name = `${clone.name} copy`;
  clone.sourceRow = Math.max(1, ...state.data.modules.map((item) => Number(item.sourceRow) || 0)) + 1;
  clone.id = uniqueIdFor(clone, "");
  normalizeModule(clone);
  state.data.modules.push(clone);
  state.selectedId = clone.id;
  markDirty("Board duplicated");
  renderAll();
}

function deleteRecord() {
  const module = selectedRecord();
  if (!module) return;
  if (!window.confirm(`Delete ${module.name}?`)) return;
  const index = state.data.modules.findIndex((item) => item.id === module.id);
  state.data.modules.splice(index, 1);
  state.selectedId = state.data.modules[Math.max(0, index - 1)]?.id || state.data.modules[0]?.id || "";
  markDirty("Board deleted");
  renderAll();
}

function updateSelectedFromForm() {
  const module = selectedRecord();
  if (!module) return;
  const oldId = module.id;
  const beforeValues = Object.fromEntries(fieldNames.map((field) => [field, module[field] ?? ""]));
  fieldNames.forEach((field) => {
    if (inputs[field].readOnly) return;
    module[field] = inputs[field].value.trim();
  });
  normalizeModule(module);
  const changedFields = fieldNames.filter((field) => {
    if (inputs[field].readOnly) return false;
    return String(beforeValues[field] ?? "") !== String(module[field] ?? "");
  });
  if (changedFields.length === 0) return;
  const partnerMessages = applyPartnerLevelUpdates(module, changedFields);
  module.id = uniqueIdFor(module, oldId);
  state.selectedId = module.id;
  inputs.id.value = module.id;
  inputs.sourceRow.value = module.sourceRow || "";
  inputs.searchText.value = module.searchText;
  markDirty(partnerMessages[0] || "Board updated");
  populateFiltersAndLists();
  renderSummary();
  renderRecordList();
  dom.formTitle.textContent = module.name || "Untitled board";
}

function applyPartnerLevelUpdates(sourceModule, changedFields) {
  const changedPartnerFields = [...partnerLevelFields].filter((field) => changedFields.includes(field));
  if (changedPartnerFields.length === 0) return [];

  const affectedModules = state.data.modules.filter((module) => samePartner(module.vendor, sourceModule.vendor));
  changedPartnerFields.forEach((field) => {
    affectedModules.forEach((module) => {
      module[field] = sourceModule[field];
      normalizeModule(module);
    });
  });

  return changedPartnerFields.map((field) => {
    const boardLabel = affectedModules.length === 1 ? "board" : "boards";
    return `${partnerLevelLabels[field]} updated for ${affectedModules.length} ${sourceModule.vendor} ${boardLabel}`;
  });
}

function normalizeAllModules() {
  state.data.modules.forEach((module) => normalizeModule(module));
  state.data.modules.forEach((module) => {
    module.id = uniqueIdFor(module, module.id);
  });
}

function normalizeModule(module) {
  module.name = valueOr(module.name, "Untitled SOM");
  module.vendor = valueOr(module.vendor, "Unknown");
  module.device = valueOr(module.device, "Unknown");
  module.formFactorRaw = module.formFactorRaw || "";
  module.formFactorFamily = validChoice(module.formFactorFamily, choiceFields.formFactorFamily, "Proprietary connector");
  module.region = valueOr(module.region, "Unknown");
  module.tiLink = module.tiLink || "";
  module.partnerProgram = validChoice(module.partnerProgram, choiceFields.partnerProgram, "Unknown");
  module.wireless = validChoice(module.wireless, choiceFields.wireless, "Unknown");
  module.flash = module.flash || "";
  module.ddr = module.ddr || "";
  module.released = validChoice(module.released, choiceFields.released, "Unknown");
  module.lifecycle = validChoice(module.lifecycle, choiceFields.lifecycle, "Preview");
  module.sourceRow = Number(module.sourceRow) || "";
  module.searchText = buildSearchText(module);
  return module;
}

function uniqueIdFor(module, currentId) {
  const base = slugify(`${module.name}-${module.vendor}-${module.device}`) || "som-record";
  const ids = new Set(state.data.modules.filter((item) => item.id !== currentId).map((item) => item.id));
  let next = base;
  let index = 2;
  while (ids.has(next)) {
    next = `${base}-${index}`;
    index += 1;
  }
  return next;
}

async function importJson() {
  const file = dom.jsonFile.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.modules)) throw new Error("JSON must include a modules array");
    state.data = data;
    normalizeAllModules();
    state.selectedId = state.data.modules[0]?.id || "";
    state.dirty = true;
    renderAll();
    updateStatus("Imported JSON / Unsaved edits");
  } catch (error) {
    window.alert(`Import failed: ${error.message}`);
  } finally {
    dom.jsonFile.value = "";
  }
}

async function copyJson() {
  const json = exportJson();
  try {
    await navigator.clipboard.writeText(json);
    updateStatus("JSON copied to clipboard");
  } catch {
    window.prompt("Copy JSON", json);
  }
}

function exportJson() {
  return `${JSON.stringify(exportData(), null, 2)}\n`;
}

function exportDataScript() {
  return `window.TI_SOM_DATA = ${JSON.stringify(exportData(), null, 2)};\n`;
}

function exportData() {
  const data = structuredCloneSafe(state.data);
  data.generatedOn = new Date().toISOString().slice(0, 10);
  data.summary = {
    modules: data.modules.length,
    vendors: countUnique(data.modules, "vendor"),
    devices: countUnique(data.modules, "device"),
    regions: countUnique(data.modules, "region"),
    formFactorFamilies: choiceFields.formFactorFamily.filter((value) => data.modules.some((module) => module.formFactorFamily === value)),
  };
  data.modules.forEach((module) => normalizeModule(module));
  return data;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  updateStatus(`${filename} downloaded`);
}

function selectedRecord() {
  return state.data.modules.find((module) => module.id === state.selectedId);
}

function markDirty(message) {
  state.dirty = true;
  updateStatus(message ? `${message} / Unsaved edits` : undefined);
}

function uniqueValues(key) {
  return [...new Set(state.data.modules.map((module) => module[key]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

function countUnique(modules, key) {
  return new Set(modules.map((module) => module[key]).filter(Boolean)).size;
}

function moduleSorter(a, b) {
  return a.vendor.localeCompare(b.vendor, undefined, { sensitivity: "base" })
    || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    || a.device.localeCompare(b.device, undefined, { numeric: true, sensitivity: "base" });
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
    module.lifecycle,
  ].filter(Boolean).join(" ").toLowerCase();
}

function validChoice(value, choices, fallback) {
  return choices.includes(value) ? value : fallback;
}

function valueOr(value, fallback) {
  return String(value || "").trim() || fallback;
}

function samePartner(left, right) {
  return valueOr(left, "Unknown").toLowerCase() === valueOr(right, "Unknown").toLowerCase();
}

function programColor(value) {
  return palette[value] || palette.Unknown;
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
