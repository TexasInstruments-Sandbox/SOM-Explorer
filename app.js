const DATA_URL = "./data/soms.json";
const LOGO_MANIFEST_URL = "./assets/logos/manifest.json";
const FORM_FACTOR_MANIFEST_URL = "./assets/form-factors/manifest.json";
const PARTNERS_URL = "./data/partners.json";

const dimensions = {
  device: { label: "Device", plural: "devices", get: (m) => m.device },
  region: { label: "Region", plural: "regions", get: (m) => m.region },
  vendor: { label: "Partner", plural: "partners", get: (m) => m.vendor },
  formFactorFamily: { label: "Form factor", plural: "form factors", get: (m) => m.formFactorFamily },
  lifecycle: { label: "Status", plural: "statuses", get: (m) => m.lifecycle },
  partnerProgram: { label: "Partner Program Status", plural: "partner program statuses", get: (m) => m.partnerProgram },
  wireless: { label: "Wireless", plural: "wireless values", get: (m) => m.wireless },
};

const orders = {
  device: ["AM62L", "AM62", "AM62A", "AM64", "AM243", "AM57", "AM62P", "AM67", "TDA4VM", "AM69", "AM65", "AM437", "AM335"],
  region: ["US", "EU", "China", "India", "Taiwan", "Israel", "Switzerland", "Unknown"],
  formFactorFamily: ["Proprietary connector", "OSM", "SMARC", "Solder down", "SO-DIMM", "Board"],
  lifecycle: ["Concept", "Preview", "Production"],
  partnerProgram: ["Registered", "Preferred", "Premium", "Unknown"],
  wireless: ["Yes", "No", "Unknown"],
};

const palette = {
  "Proprietary connector": "#3f3f3f",
  OSM: "#137f8c",
  SMARC: "#1b5fa7",
  "Solder down": "#cc0000",
  "SO-DIMM": "#666666",
  Board: "#2f7d32",
  Concept: "#b00000",
  Preview: "#137f8c",
  Production: "#777777",
  Registered: "#cc0000",
  Preferred: "#137f8c",
  Premium: "#990000",
  Unknown: "#808080",
  US: "#cc0000",
  EU: "#1b5fa7",
  China: "#137f8c",
  India: "#9b6a00",
  Taiwan: "#2f7d32",
  Israel: "#6f4aa0",
  Switzerland: "#555555",
  Yes: "#137f8c",
  No: "#555555",
  Unknown: "#808080",
};

const fallbackColors = ["#cc0000", "#137f8c", "#1b5fa7", "#2f7d32", "#9b6a00", "#555555", "#6f4aa0", "#006b60"];

const regionMap = {
  US: { x: 230, y: 205, labelX: 170, labelY: 145 },
  EU: { x: 510, y: 185, labelX: 458, labelY: 116 },
  Switzerland: { x: 520, y: 205, labelX: 505, labelY: 262 },
  Israel: { x: 565, y: 242, labelX: 580, labelY: 300 },
  India: { x: 690, y: 295, labelX: 642, labelY: 352 },
  China: { x: 765, y: 222, labelX: 738, labelY: 150 },
  Taiwan: { x: 833, y: 279, labelX: 804, labelY: 338 },
};

const state = {
  modules: [],
  metadata: {},
  companyLogos: {},
  formFactorLogos: {},
  partners: {},
  viewMode: "board",
  groupBy: "device",
  colorBy: "formFactorFamily",
  search: "",
  filters: {
    region: "All",
    device: "All",
    vendor: "All",
    formFactorFamily: "All",
    lifecycle: "All",
    partnerProgram: "All",
  },
};

const dom = {
  sourceLine: document.querySelector("#sourceLine"),
  searchInput: document.querySelector("#searchInput"),
  groupBy: document.querySelector("#groupBy"),
  colorBy: document.querySelector("#colorBy"),
  filterStack: document.querySelector("#filterStack"),
  resetFilters: document.querySelector("#resetFilters"),
  kpis: document.querySelector("#kpis"),
  viewEyebrow: document.querySelector("#viewEyebrow"),
  viewTitle: document.querySelector("#viewTitle"),
  legend: document.querySelector("#legend"),
  visualization: document.querySelector("#visualization"),
  drawer: document.querySelector("#detailDrawer"),
  drawerContent: document.querySelector("#drawerContent"),
  drawerClose: document.querySelector("#drawerClose"),
  shareView: document.querySelector("#shareView"),
  exportCsv: document.querySelector("#exportCsv"),
  printView: document.querySelector("#printView"),
};

async function init() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Unable to load ${DATA_URL}`);
  state.metadata = await response.json();
  state.modules = state.metadata.modules;
  [state.companyLogos, state.formFactorLogos, state.partners] = await Promise.all([loadLogoManifest(), loadFormFactorManifest(), loadPartners()]);
  hydrateFromUrl();
  bindEvents();
  buildFilterControls();
  syncControls();
  render();
}

function bindEvents() {
  dom.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    updateUrl();
    render();
  });

  dom.groupBy.addEventListener("change", (event) => {
    state.groupBy = event.target.value;
    updateUrl();
    render();
  });

  dom.colorBy.addEventListener("change", (event) => {
    state.colorBy = event.target.value;
    updateUrl();
    render();
  });

  document.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.viewMode = button.dataset.viewMode;
      if (state.viewMode === "map") {
        state.groupBy = "region";
        state.colorBy = "region";
      }
      if (state.viewMode === "partners") state.groupBy = "vendor";
      if (state.viewMode === "formFactors") state.groupBy = "formFactorFamily";
      document.querySelectorAll("[data-view-mode]").forEach((item) => item.classList.toggle("is-active", item === button));
      syncControls();
      updateUrl();
      render();
    });
  });

  dom.filterStack.addEventListener("change", (event) => {
    const filter = event.target.dataset.filter;
    if (!filter) return;
    state.filters[filter] = event.target.value;
    updateUrl();
    render();
  });

  dom.resetFilters.addEventListener("click", () => {
    state.search = "";
    Object.keys(state.filters).forEach((key) => {
      state.filters[key] = "All";
    });
    syncControls();
    updateUrl();
    render();
  });

  dom.kpis.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-kpi-view]");
    if (!trigger) return;
    state.viewMode = trigger.dataset.kpiView;
    if (state.viewMode === "partners") state.groupBy = "vendor";
    if (state.viewMode === "formFactors") state.groupBy = "formFactorFamily";
    syncControls();
    updateUrl();
    render();
  });

  dom.visualization.addEventListener("click", (event) => {
    const formFactorTrigger = event.target.closest("[data-form-factor]");
    if (formFactorTrigger) {
      selectFormFactor(formFactorTrigger.dataset.formFactor);
      return;
    }

    const companyTrigger = event.target.closest("[data-company]");
    if (companyTrigger) {
      selectPartner(companyTrigger.dataset.company);
      return;
    }

    const regionTrigger = event.target.closest("[data-region]");
    if (regionTrigger) {
      state.filters.region = state.filters.region === regionTrigger.dataset.region ? "All" : regionTrigger.dataset.region;
      state.groupBy = "region";
      syncControls();
      updateUrl();
      render();
      return;
    }

    const trigger = event.target.closest("[data-module-id]");
    if (!trigger) return;
    openDrawer(trigger.dataset.moduleId);
  });

  dom.visualization.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const formFactorTrigger = event.target.closest("[data-form-factor]");
    if (formFactorTrigger) {
      event.preventDefault();
      selectFormFactor(formFactorTrigger.dataset.formFactor);
      return;
    }

    const companyTrigger = event.target.closest("[data-company]");
    if (companyTrigger) {
      event.preventDefault();
      selectPartner(companyTrigger.dataset.company);
      return;
    }

    const regionTrigger = event.target.closest("[data-region]");
    if (!regionTrigger) return;
    event.preventDefault();
    state.filters.region = state.filters.region === regionTrigger.dataset.region ? "All" : regionTrigger.dataset.region;
    state.groupBy = "region";
    syncControls();
    updateUrl();
    render();
  });

  dom.drawerClose.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });

  dom.shareView.addEventListener("click", shareCurrentView);
  dom.exportCsv.addEventListener("click", exportCsv);
  dom.printView.addEventListener("click", () => window.print());
}

function buildFilterControls() {
  const filters = [
    ["region", "Region"],
    ["device", "Device"],
    ["vendor", "Partner"],
    ["formFactorFamily", "Form factor"],
    ["lifecycle", "Status"],
    ["partnerProgram", "Partner Program Status"],
  ];

  dom.filterStack.innerHTML = filters.map(([key, label]) => {
    const options = uniqueValues(key).map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("");
    return `
      <label class="field">
        <span>${label}</span>
        <select data-filter="${key}">
          <option value="All">All</option>
          ${options}
        </select>
      </label>
    `;
  }).join("");
}

function syncControls() {
  dom.searchInput.value = state.search;
  dom.groupBy.value = state.groupBy;
  dom.colorBy.value = state.colorBy;
  document.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewMode === state.viewMode);
  });
  Object.entries(state.filters).forEach(([key, value]) => {
    const select = dom.filterStack.querySelector(`[data-filter="${key}"]`);
    if (select) select.value = value;
  });
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("view")) state.viewMode = validValue(normalizeViewMode(params.get("view")), ["board", "map", "partners", "formFactors", "matrix", "directory"], state.viewMode);
  if (params.get("group")) state.groupBy = validValue(params.get("group"), Object.keys(dimensions), state.groupBy);
  if (params.get("color")) state.colorBy = validValue(params.get("color"), Object.keys(dimensions), state.colorBy);
  if (state.viewMode === "map") {
    state.groupBy = "region";
    state.colorBy = "region";
  }
  if (state.viewMode === "partners") state.groupBy = "vendor";
  if (state.viewMode === "formFactors") state.groupBy = "formFactorFamily";
  if (params.get("q")) state.search = params.get("q");
  Object.keys(state.filters).forEach((key) => {
    const value = params.get(key);
    if (value) state.filters[key] = value;
  });
}

function updateUrl() {
  const params = new URLSearchParams();
  if (state.viewMode !== "board") params.set("view", state.viewMode);
  if (state.groupBy !== "device") params.set("group", state.groupBy);
  if (state.colorBy !== "formFactorFamily") params.set("color", state.colorBy);
  if (state.search) params.set("q", state.search);
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value !== "All") params.set(key, value);
  });
  const nextUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

function render() {
  const modules = filteredModules();
  const grouping = dimensions[state.groupBy];
  dom.sourceLine.textContent = `${state.metadata.summary.modules} modules from ${state.metadata.summary.vendors} partners`;
  dom.viewEyebrow.textContent = modeLabel(state.viewMode);
  dom.viewTitle.textContent = viewTitle(grouping);
  renderKpis(modules);
  renderLegend(modules);

  if (modules.length === 0) {
    dom.visualization.innerHTML = `<div class="empty-state">No modules match the current filters.</div>`;
    return;
  }

  if (state.viewMode === "matrix") renderMatrix(modules);
  if (state.viewMode === "directory") renderDirectory(modules);
  if (state.viewMode === "partners") renderPartners(modules);
  if (state.viewMode === "formFactors") renderFormFactors(modules);
  if (state.viewMode === "map") renderMap();
  if (state.viewMode === "board") renderBoard(modules);
}

function renderKpis(modules) {
  const kpis = [
    ["Modules", modules.length, "#cc0000", ""],
    ["Partners", countUnique(modules, "vendor"), "#137f8c", "partners"],
    ["Devices", countUnique(modules, "device"), "#1b5fa7", ""],
    ["Form Factors", countUnique(modules, "formFactorFamily"), "#555555", "formFactors"],
  ];
  dom.kpis.innerHTML = kpis.map(([label, value, color, view]) => `
    <${view ? "button" : "article"} class="kpi ${view ? "is-clickable" : ""}" ${view ? `type="button" data-kpi-view="${view}"` : ""} style="--kpi-color:${color}">
      <span>${label}</span>
      <strong>${value}</strong>
    </${view ? "button" : "article"}>
  `).join("");
}

function renderLegend(modules) {
  const colorDimension = dimensions[state.colorBy];
  const values = sortValues([...new Set(modules.map(colorDimension.get))], state.colorBy);
  dom.legend.innerHTML = values.map((value) => `
    <span class="legend-item">
      <span class="legend-swatch" style="--legend-color:${colorForValue(value)}"></span>
      ${escapeHtml(value)}
    </span>
  `).join("");
}

function renderBoard(modules) {
  const grouped = groupModules(modules, state.groupBy);
  const lanes = sortValues([...grouped.keys()], state.groupBy).map((key) => {
    const laneModules = grouped.get(key).sort(moduleSorter);
    return `
      <section class="swimlane">
        <div class="lane-header">
          <h3 class="swimlane-title">${escapeHtml(key)}</h3>
          <span class="lane-count">${laneModules.length} ${laneModules.length === 1 ? "module" : "modules"}</span>
        </div>
        ${laneModules.map(moduleCard).join("")}
      </section>
    `;
  }).join("");

  dom.visualization.innerHTML = `
    <div class="board-frame">
      <div class="y-axis"></div>
      <div class="y-label">Modules</div>
      <div class="board-scroll">
        <div class="swimlanes">${lanes}</div>
      </div>
      <div class="x-axis"></div>
    </div>
  `;
}

function renderMap() {
  const modulesForMap = filteredModules(["region"]);
  const selectedRegion = state.filters.region;
  const grouped = groupModules(modulesForMap, "region");
  const maxCount = Math.max(1, ...[...grouped.values()].map((items) => items.length));
  const regions = sortValues(Object.keys(regionMap), "region").filter((region) => grouped.has(region));
  const mapRegions = regions.map((region) => {
    const config = regionMap[region];
    const modules = grouped.get(region).sort(moduleSorter);
    const color = colorForValue(region);
    const count = modules.length;
    const radius = 14 + Math.round((count / maxCount) * 22);
    const active = selectedRegion === region;
    const muted = selectedRegion !== "All" && !active;
    return `
      <g class="map-region ${active ? "is-active" : ""} ${muted ? "is-muted" : ""}" data-region="${escapeAttr(region)}" style="--region-color:${color}" tabindex="0" role="button" aria-label="${escapeAttr(`${region}: ${count} modules`)}">
        <circle class="map-pulse" cx="${config.x}" cy="${config.y}" r="${radius * 1.65}"></circle>
        <circle class="map-dot" cx="${config.x}" cy="${config.y}" r="${radius}"></circle>
        <rect class="map-label-bg" x="${config.labelX - 12}" y="${config.labelY - 30}" width="${regionLabelWidth(region, count)}" height="48" rx="6"></rect>
        <text class="map-label" x="${config.labelX}" y="${config.labelY - 10}">${escapeHtml(region)}</text>
        <text class="map-count" x="${config.labelX}" y="${config.labelY + 8}">${count} ${count === 1 ? "module" : "modules"}</text>
      </g>
    `;
  }).join("");

  const cards = regions.map((region) => {
    const modules = grouped.get(region).sort(moduleSorter);
    const vendors = countUnique(modules, "vendor");
    const devices = sortValues([...new Set(modules.map((module) => module.device))], "device").slice(0, 4).join(", ");
    const active = selectedRegion === region;
    return `
      <button class="region-card ${active ? "is-active" : ""}" type="button" data-region="${escapeAttr(region)}" style="--region-color:${colorForValue(region)}">
        <strong>${escapeHtml(region)}</strong>
        <span>${modules.length} ${modules.length === 1 ? "module" : "modules"} / ${vendors} ${vendors === 1 ? "partner" : "partners"}</span>
        <span>${escapeHtml(devices || "No matching devices")}</span>
      </button>
    `;
  }).join("");

  dom.visualization.innerHTML = `
    <div class="map-view">
      <svg class="world-map" viewBox="0 0 1000 520" role="img" aria-label="World map highlighting SOM regions">
        <path class="map-graticule" d="M80 90H920M80 180H920M80 270H920M80 360H920M80 450H920M180 55V470M340 55V470M500 55V470M660 55V470M820 55V470"></path>
        <path class="map-land" d="M105 130 170 92 260 106 322 146 292 207 344 250 302 306 224 292 166 250 110 238 72 184Z"></path>
        <path class="map-land" d="M303 302 355 342 376 422 344 488 296 436 274 354Z"></path>
        <path class="map-land" d="M446 148 500 112 578 134 548 190 488 204 436 184Z"></path>
        <path class="map-land" d="M510 218 585 234 622 304 594 398 534 458 484 386 468 294Z"></path>
        <path class="map-land" d="M560 142 680 98 825 118 912 182 878 252 794 280 724 332 642 294 604 224Z"></path>
        <path class="map-land" d="M800 338 884 362 920 422 870 456 790 426Z"></path>
        ${mapRegions}
      </svg>
      <aside class="map-panel" aria-label="Region summary">
        <h3>Regions</h3>
        ${cards}
      </aside>
    </div>
  `;
}

function renderPartners(modules) {
  const partnerGridModules = filteredModules(["vendor"]);
  const grouped = groupModules(partnerGridModules, "vendor");
  const vendors = sortValues([...grouped.keys()], "vendor");
  const selectedPartner = state.filters.vendor;
  const partnerModules = selectedPartner === "All" ? [] : partnerGridModules.filter((module) => module.vendor === selectedPartner).sort(moduleSorter);
  const cards = vendors.map((vendor) => {
    const active = selectedPartner === vendor;
    return `
      <button class="company-card partner-logo-card ${active ? "is-active" : ""}" type="button" data-company="${escapeAttr(vendor)}" style="--company-color:${colorForValue(vendor)}" aria-label="${escapeAttr(`${vendor} partner`)}">
        <span class="company-logo-wrap">
          <img class="company-logo" src="${escapeAttr(companyLogoSrc(vendor))}" alt="${escapeAttr(`${vendor} logo`)}">
        </span>
      </button>
    `;
  }).join("");

  dom.visualization.innerHTML = `
    <div class="partners-view">
      ${selectedPartner !== "All" ? partnerProfile(selectedPartner, partnerModules) : ""}
      <div class="company-grid partner-grid">
        ${cards}
      </div>
    </div>
  `;
}

function renderFormFactors(modules) {
  const factorGridModules = filteredModules(["formFactorFamily"]);
  const grouped = groupModules(factorGridModules, "formFactorFamily");
  const formFactors = sortValues([...grouped.keys()], "formFactorFamily");
  const selectedFactor = state.filters.formFactorFamily;
  const factorModules = selectedFactor === "All" ? [] : factorGridModules.filter((module) => module.formFactorFamily === selectedFactor).sort(moduleSorter);
  const cards = formFactors.map((formFactor) => {
    const active = selectedFactor === formFactor;
    return `
      <button class="factor-card factor-logo-card ${active ? "is-active" : ""}" type="button" data-form-factor="${escapeAttr(formFactor)}" style="--factor-color:${colorForValue(formFactor)}" aria-label="${escapeAttr(`${formFactor} form factor`)}">
        <span class="factor-logo-wrap">
          <img class="factor-logo" src="${escapeAttr(formFactorLogoSrc(formFactor))}" alt="${escapeAttr(`${formFactor} logo`)}">
        </span>
      </button>
    `;
  }).join("");

  dom.visualization.innerHTML = `
    <div class="form-factors-view">
      ${selectedFactor !== "All" ? formFactorProfile(selectedFactor, factorModules) : ""}
      <div class="factor-grid">
        ${cards}
      </div>
    </div>
  `;
}

function renderMatrix(modules) {
  const xKey = state.groupBy;
  const yKey = state.groupBy === "formFactorFamily" ? "device" : "formFactorFamily";
  const xValues = sortValues([...new Set(modules.map(dimensions[xKey].get))], xKey);
  const yValues = sortValues([...new Set(modules.map(dimensions[yKey].get))], yKey);
  const cols = `160px repeat(${xValues.length}, minmax(150px, 1fr))`;

  const cells = [];
  cells.push(`<div class="matrix-header row-header">${escapeHtml(dimensions[yKey].label)} / ${escapeHtml(dimensions[xKey].label)}</div>`);
  xValues.forEach((x) => cells.push(`<div class="matrix-header">${escapeHtml(x)}</div>`));

  yValues.forEach((y) => {
    cells.push(`<div class="matrix-header row-header">${escapeHtml(y)}</div>`);
    xValues.forEach((x) => {
      const matches = modules.filter((module) => dimensions[xKey].get(module) === x && dimensions[yKey].get(module) === y).sort(moduleSorter);
      const color = colorForValue(matches[0] ? dimensions[state.colorBy].get(matches[0]) : y);
      cells.push(`
        <div class="matrix-cell" style="--cell-color:${color}">
          <div class="cell-modules">
            ${matches.slice(0, 4).map((module) => `<button class="cell-module" type="button" data-module-id="${module.id}">${escapeHtml(module.name)}</button>`).join("")}
            ${matches.length > 4 ? `<span class="cell-more">+${matches.length - 4} more</span>` : ""}
          </div>
        </div>
      `);
    });
  });

  dom.visualization.innerHTML = `
    <div class="matrix-wrap">
      <div class="matrix" style="grid-template-columns:${cols}">
        ${cells.join("")}
      </div>
    </div>
  `;
}

function renderDirectory(modules) {
  const rows = modules.slice().sort((a, b) => {
    const groupCompare = dimensions[state.groupBy].get(a).localeCompare(dimensions[state.groupBy].get(b), undefined, { numeric: true });
    return groupCompare || moduleSorter(a, b);
  });

  dom.visualization.innerHTML = `
    <div class="directory">
      <div class="directory-row is-header">
        <span>Module</span>
        <span>Partner</span>
        <span>Device</span>
        <span>Region</span>
        <span>Form factor</span>
        <span>Status</span>
      </div>
      ${rows.map((module) => `
        <article class="directory-row" style="--row-color:${colorForModule(module)}">
          <button type="button" data-module-id="${module.id}">${escapeHtml(module.name)}</button>
          <span>${escapeHtml(module.vendor)}</span>
          <span>${escapeHtml(module.device)}</span>
          <span>${escapeHtml(module.region)}</span>
          <span>${escapeHtml(module.formFactorFamily)}</span>
          <span class="badge" style="--badge-color:${colorForValue(module.lifecycle)}">${escapeHtml(module.lifecycle)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function moduleCard(module) {
  return `
    <button class="module-card" type="button" data-module-id="${module.id}" style="--card-color:${colorForModule(module)};--card-border:${borderForModule(module)}">
      <span class="vendor">${escapeHtml(module.vendor)}</span>
      <span class="module-name">${escapeHtml(module.name)}</span>
      <span class="module-meta">${escapeHtml(module.device)} / ${escapeHtml(module.formFactorFamily)} / ${escapeHtml(module.lifecycle)}</span>
    </button>
  `;
}

function openDrawer(moduleId) {
  const module = state.modules.find((item) => item.id === moduleId);
  if (!module) return;
  const link = normalizeTiLink(module.tiLink);
  dom.drawerContent.innerHTML = `
    <div class="drawer-company">
      <img class="drawer-logo" src="${escapeAttr(companyLogoSrc(module.vendor))}" alt="${escapeAttr(`${module.vendor} logo`)}">
    </div>
    <h2 class="drawer-title">${escapeHtml(module.name)}</h2>
    <p class="drawer-subtitle">${escapeHtml(module.vendor)} / ${escapeHtml(module.device)}</p>
    <div class="drawer-badges">
      <span class="badge" style="--badge-color:${colorForValue(module.formFactorFamily)}">${escapeHtml(module.formFactorFamily)}</span>
      <span class="badge" style="--badge-color:${colorForValue(module.lifecycle)}">${escapeHtml(module.lifecycle)}</span>
      <span class="badge" style="--badge-color:${colorForValue(module.region)}">${escapeHtml(module.region)}</span>
    </div>
    <dl class="detail-list">
      ${detailItem("Partner", module.vendor)}
      ${detailItem("Device", module.device)}
      ${detailItem("Form factor", module.formFactorRaw)}
      ${detailItem("Form family", module.formFactorFamily)}
      ${detailItem("Region", module.region)}
      ${detailItem("Partner Program Status", module.partnerProgram)}
      ${detailItem("Wireless", module.wireless)}
      ${detailItem("Released", module.released)}
    </dl>
    ${link ? `<a class="drawer-link" href="${escapeAttr(link)}" target="_blank" rel="noreferrer">Open TI.com</a>` : ""}
  `;
  dom.drawer.classList.add("is-open");
  dom.drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  dom.drawer.classList.remove("is-open");
  dom.drawer.setAttribute("aria-hidden", "true");
}

function detailItem(label, value) {
  return `
    <div class="detail-item">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || "Not specified")}</dd>
    </div>
  `;
}

function filteredModules(ignoreFilters = []) {
  const terms = state.search.toLowerCase().split(/\s+/).filter(Boolean);
  return state.modules.filter((module) => {
    const matchesSearch = terms.every((term) => module.searchText.includes(term));
    const matchesFilters = Object.entries(state.filters).every(([key, value]) => ignoreFilters.includes(key) || value === "All" || module[key] === value);
    return matchesSearch && matchesFilters;
  });
}

function groupModules(modules, dimensionKey) {
  const grouped = new Map();
  const getter = dimensions[dimensionKey].get;
  modules.forEach((module) => {
    const key = getter(module) || "Unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(module);
  });
  return grouped;
}

function uniqueValues(key) {
  if (key === "partnerProgram") return orders.partnerProgram;
  return sortValues([...new Set(state.modules.map((module) => module[key] || "Unknown"))], key);
}

function sortValues(values, dimensionKey) {
  const order = orders[dimensionKey] || [];
  return values.slice().sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });
}

function moduleSorter(a, b) {
  const deviceCompare = compareByOrder(a.device, b.device, "device");
  return deviceCompare
    || a.vendor.localeCompare(b.vendor, undefined, { sensitivity: "base" })
    || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}

function compareByOrder(a, b, dimensionKey) {
  const order = orders[dimensionKey] || [];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai !== -1 || bi !== -1) {
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function countUnique(modules, key) {
  return new Set(modules.map((module) => module[key])).size;
}

function regionLabelWidth(region, count) {
  return Math.max(110, region.length * 10 + String(count).length * 8 + 78);
}

async function loadLogoManifest() {
  try {
    const response = await fetch(LOGO_MANIFEST_URL);
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

async function loadFormFactorManifest() {
  try {
    const response = await fetch(FORM_FACTOR_MANIFEST_URL);
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

async function loadPartners() {
  try {
    const response = await fetch(PARTNERS_URL);
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

function selectFormFactor(formFactor) {
  state.filters.formFactorFamily = state.filters.formFactorFamily === formFactor ? "All" : formFactor;
  state.groupBy = "formFactorFamily";
  syncControls();
  updateUrl();
  render();
}

function selectPartner(vendor) {
  state.filters.vendor = state.filters.vendor === vendor ? "All" : vendor;
  state.groupBy = "vendor";
  syncControls();
  updateUrl();
  render();
}

function formFactorProfile(formFactor, modules) {
  return `
    <section class="factor-profile" style="--factor-color:${colorForValue(formFactor)}">
      <div class="factor-profile-head">
        <img class="factor-profile-logo" src="${escapeAttr(formFactorLogoSrc(formFactor))}" alt="${escapeAttr(`${formFactor} logo`)}">
      </div>
      <div class="factor-soms">
        ${modules.map((module) => `
          <button class="factor-som" type="button" data-module-id="${escapeAttr(module.id)}">
            <strong>${escapeHtml(module.name)}</strong>
            <span>${escapeHtml(module.vendor)} / ${escapeHtml(module.device)} / ${escapeHtml(module.region)}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function partnerProfile(vendor, modules) {
  const page = partnerPageUrl(vendor);
  return `
    <section class="partner-profile" style="--company-color:${colorForValue(vendor)}">
      <div class="partner-profile-head">
        <img class="partner-profile-logo" src="${escapeAttr(companyLogoSrc(vendor))}" alt="${escapeAttr(`${vendor} logo`)}">
        <a class="partner-page-link" href="${escapeAttr(page)}" target="_blank" rel="noreferrer">Partner page</a>
      </div>
      <div class="partner-soms">
        ${modules.map((module) => `
          <button class="partner-som" type="button" data-module-id="${escapeAttr(module.id)}">
            <strong>${escapeHtml(module.name)}</strong>
            <span>${escapeHtml(module.device)} / ${escapeHtml(module.formFactorFamily)} / ${escapeHtml(module.region)}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function partnerPageUrl(vendor) {
  return state.partners[vendor]?.partnerPage || `https://www.ti.com/partner/${slugify(vendor)}`;
}

function companyLogoSrc(vendor) {
  return state.companyLogos[vendor] || `assets/logos/${slugify(vendor)}.svg`;
}

function formFactorLogoSrc(formFactor) {
  return state.formFactorLogos[formFactor] || `assets/form-factors/${slugify(formFactor)}.svg`;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function colorForModule(module) {
  return colorForValue(dimensions[state.colorBy].get(module));
}

function borderForModule(module) {
  if (["Registered", "Preferred", "Premium"].includes(module.partnerProgram)) return "#cc0000";
  if (module.lifecycle === "Concept") return "#990000";
  return "#333333";
}

function colorForValue(value) {
  if (palette[value]) return palette[value];
  let total = 0;
  for (let i = 0; i < value.length; i += 1) total += value.charCodeAt(i);
  return fallbackColors[total % fallbackColors.length];
}

function normalizeTiLink(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z0-9-]+$/i.test(value)) return `https://www.ti.com/tool/${value}`;
  return "";
}

function modeLabel(mode) {
  return { board: "Graph", map: "Map", partners: "Partners", formFactors: "Form Factors", matrix: "Matrix", directory: "Directory" }[mode] || "Graph";
}

function viewTitle(grouping) {
  if (state.viewMode === "map") return "Regional SOM map";
  if (state.viewMode === "partners") return "Partner grid";
  if (state.viewMode === "formFactors") return "Form factor grid";
  return `Modules by ${grouping.label.toLowerCase()}`;
}

function normalizeViewMode(mode) {
  return mode === "companies" ? "partners" : mode;
}

function shareCurrentView() {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      dom.shareView.textContent = "Copied";
      window.setTimeout(() => {
        dom.shareView.textContent = "Share";
      }, 1200);
    });
    return;
  }
  window.prompt("Share URL", url);
}

function exportCsv() {
  const rows = filteredModules();
  const headers = ["Name", "Vendor", "Device", "Form Factor", "Form Family", "Region", "Partner Program", "Wireless", "Released", "Status", "TI.com Link"];
  const csvRows = [
    headers,
    ...rows.map((module) => [
      module.name,
      module.vendor,
      module.device,
      module.formFactorRaw,
      module.formFactorFamily,
      module.region,
      module.partnerProgram,
      module.wireless,
      module.released,
      module.lifecycle,
      normalizeTiLink(module.tiLink),
    ]),
  ];
  const csv = csvRows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ti-som-explorer-view.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function validValue(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

init().catch((error) => {
  dom.visualization.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
});
