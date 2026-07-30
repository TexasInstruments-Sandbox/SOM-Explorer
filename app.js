const DATA_URL = "./data/soms.json";
const LOGO_MANIFEST_URL = "./assets/logos/manifest.json";
const PARTNER_BADGE_MANIFEST_URL = "./assets/partner-badges/manifest.json";
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
  device: ["AM62L", "AM62x", "AM62", "AM62P", "AM62A", "AM67A", "AM67", "AM68", "AM64", "AM243", "AM57", "TDA4VM", "AM69", "AM65", "AM437", "AM335"],
  region: ["North America", "EMEA", "China", "APAC", "Unknown"],
  formFactorFamily: ["Proprietary connector", "OSM", "SMARC", "Solder down", "SO-DIMM", "Board"],
  lifecycle: ["Concept", "Preview", "Production"],
  partnerProgram: ["Premium", "Preferred", "Registered", "Unknown"],
  wireless: ["Yes", "Optional", "No", "Unknown"],
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
  "North America": "#137f8c",
  EMEA: "#1b5fa7",
  China: "#cc0000",
  APAC: "#2f7d32",
  Yes: "#137f8c",
  Optional: "#9b6a00",
  No: "#555555",
  Unknown: "#808080",
};

const fallbackColors = ["#cc0000", "#137f8c", "#1b5fa7", "#2f7d32", "#9b6a00", "#555555", "#6f4aa0", "#006b60"];

const worldMap = {
  width: 1000,
  height: 520,
  scale: 1000 / (2 * Math.PI),
};

const regionMap = {
  "North America": { lon: -98, lat: 39, labelDx: -116, labelDy: -62 },
  EMEA: { lon: 18, lat: 40, labelDx: -78, labelDy: -70 },
  China: { lon: 104, lat: 35, labelDx: -46, labelDy: -74 },
  APAC: { lon: 92, lat: 13, labelDx: -58, labelDy: 86 },
};

const legacyRegionAliases = {
  US: "North America",
  EU: "EMEA",
  Switzerland: "EMEA",
  Israel: "EMEA",
  India: "APAC",
  Taiwan: "APAC",
};

const state = {
  modules: [],
  metadata: {},
  companyLogos: {},
  partnerBadges: {},
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
  homeLink: document.querySelector("#homeLink"),
  sourceLine: document.querySelector("#sourceLine"),
  searchInput: document.querySelector("#searchInput"),
  groupBy: document.querySelector("#groupBy"),
  colorBy: document.querySelector("#colorBy"),
  filterStack: document.querySelector("#filterStack"),
  resetFilters: document.querySelector("#resetFilters"),
  kpis: document.querySelector("#kpis"),
  viewTitle: document.querySelector("#viewTitle"),
  filterStatus: document.querySelector("#filterStatus"),
  legend: document.querySelector("#legend"),
  visualization: document.querySelector("#visualization"),
  drawer: document.querySelector("#detailDrawer"),
  drawerContent: document.querySelector("#drawerContent"),
  drawerClose: document.querySelector("#drawerClose"),
  shareView: document.querySelector("#shareView"),
  themeToggle: document.querySelector("#themeToggle"),
  exportCsv: document.querySelector("#exportCsv"),
  printView: document.querySelector("#printView"),
};

async function init() {
  syncThemeToggle();
  state.metadata = await loadJson(DATA_URL, "TI_SOM_DATA");
  state.modules = state.metadata.modules;
  [state.companyLogos, state.partnerBadges, state.formFactorLogos, state.partners] = await Promise.all([
    loadLogoManifest(),
    loadPartnerBadgeManifest(),
    loadFormFactorManifest(),
    loadPartners(),
  ]);
  hydrateFromUrl();
  bindEvents();
  buildFilterControls();
  syncControls();
  render();
}

function bindEvents() {
  document.addEventListener("error", handleImageError, true);
  dom.homeLink.addEventListener("click", goHome);
  dom.themeToggle.addEventListener("click", toggleTheme);

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
      applyViewDefaults({ resetBoard: true });
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
    resetFilters();
    syncControls();
    updateUrl();
    render();
  });

  dom.filterStatus.addEventListener("click", (event) => {
    if (!event.target.closest("[data-clear-filters]")) return;
    resetFilters();
    syncControls();
    updateUrl();
    render();
  });

  dom.legend.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-legend-value]");
    if (!trigger) return;
    toggleLegendFilter(trigger.dataset.legendDimension, trigger.dataset.legendValue);
  });

  dom.legend.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const trigger = event.target.closest("[data-legend-value]");
    if (!trigger) return;
    event.preventDefault();
    toggleLegendFilter(trigger.dataset.legendDimension, trigger.dataset.legendValue);
  });

  dom.kpis.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-kpi-view]");
    if (!trigger) return;
    state.viewMode = trigger.dataset.kpiView;
    applyViewDefaults();
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
    if (dom.drawer.classList.contains("is-open") && dom.drawer.dataset.openModuleId === trigger.dataset.moduleId) {
      closeDrawer();
      return;
    }
    openDrawer(trigger.dataset.moduleId);
    const openedId = trigger.dataset.moduleId;
    window.setTimeout(() => {
      const card = dom.visualization.querySelector(`[data-module-id="${openedId}"]`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }, 200);
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

function toggleTheme() {
  const nextTheme = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  try {
    localStorage.setItem("tiSomTheme", nextTheme);
  } catch {
    // Theme persistence is optional; the button still works for this session.
  }
  syncThemeToggle();
}

function syncThemeToggle() {
  const theme = currentTheme();
  dom.themeToggle.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  dom.themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  dom.themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
}

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function goHome() {
  state.viewMode = "board";
  resetFilters();
  applyViewDefaults({ resetBoard: true });
  closeDrawer();
  syncControls();
  updateUrl();
  render();
}

function resetFilters() {
  state.search = "";
  Object.keys(state.filters).forEach((key) => {
    state.filters[key] = "All";
  });
}

function toggleLegendFilter(dimension, value) {
  if (!Object.prototype.hasOwnProperty.call(state.filters, dimension)) return;
  state.filters[dimension] = state.filters[dimension] === value ? "All" : value;
  syncControls();
  updateUrl();
  render();
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
    let value = params.get(key);
    if (key === "region") value = legacyRegionAliases[value] || value;
    if (value) state.filters[key] = value;
  });
}

function applyViewDefaults({ resetBoard = false } = {}) {
  if (state.viewMode === "board" && resetBoard) {
    state.groupBy = "device";
    state.colorBy = "formFactorFamily";
  }
  if (state.viewMode === "map") {
    state.groupBy = "region";
    state.colorBy = "region";
  }
  if (state.viewMode === "partners") state.groupBy = "vendor";
  if (state.viewMode === "formFactors") state.groupBy = "formFactorFamily";
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
  const verified = state.metadata.lastVerified ? ` / TI.com verified ${state.metadata.lastVerified}` : "";
  dom.sourceLine.textContent = `${state.metadata.summary.modules} modules from ${state.metadata.summary.vendors} partners${verified}`;
  dom.viewTitle.textContent = viewTitle(grouping);
  renderFilterStatus(modules);
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

function renderFilterStatus(modules) {
  if (!hasActiveFilters()) {
    dom.filterStatus.hidden = true;
    dom.filterStatus.innerHTML = "";
    return;
  }

  const status = contentStatus(modules);
  dom.filterStatus.hidden = false;
  dom.filterStatus.innerHTML = `
    <span>Showing ${status.current} out of ${status.total} ${pluralize(status.noun, status.total)}</span>
    <button class="inline-clear" type="button" data-clear-filters>Clear filters</button>
  `;
}

function contentStatus(modules) {
  if (state.viewMode === "partners") {
    const current = countUnique(modules, "vendor");
    return {
      current,
      total: countUnique(state.modules, "vendor"),
      noun: "partner",
    };
  }

  if (state.viewMode === "formFactors") {
    const current = countUnique(modules, "formFactorFamily");
    return {
      current,
      total: countUnique(state.modules, "formFactorFamily"),
      noun: "form factor",
    };
  }

  return {
    current: modules.length,
    total: state.modules.length,
    noun: "module",
  };
}

function pluralize(noun, count) {
  return count === 1 ? noun : `${noun}s`;
}

function hasActiveFilters() {
  return Boolean(state.search) || Object.values(state.filters).some((value) => value !== "All");
}

function renderLegend(modules) {
  const colorDimension = dimensions[state.colorBy];
  const values = sortValues([...new Set(modules.map(colorDimension.get))], state.colorBy);
  dom.legend.innerHTML = values.map((value) => `
    <button class="legend-item ${state.filters[state.colorBy] === value ? "is-active" : ""}" type="button" data-legend-dimension="${escapeAttr(state.colorBy)}" data-legend-value="${escapeAttr(value)}" aria-pressed="${state.filters[state.colorBy] === value ? "true" : "false"}">
      <span class="legend-swatch" style="--legend-color:${colorForValue(value)}"></span>
      ${escapeHtml(value)}
    </button>
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
    const point = projectRegion(config);
    const label = {
      x: point.x + config.labelDx,
      y: point.y + config.labelDy,
    };
    const modules = grouped.get(region).sort(moduleSorter);
    const color = colorForValue(region);
    const count = modules.length;
    const radius = 14 + Math.round((count / maxCount) * 22);
    const active = selectedRegion === region;
    const muted = selectedRegion !== "All" && !active;
    return `
      <g class="map-region ${active ? "is-active" : ""} ${muted ? "is-muted" : ""}" data-region="${escapeAttr(region)}" style="--region-color:${color}" tabindex="0" role="button" aria-label="${escapeAttr(`${region}: ${count} modules`)}">
        <circle class="map-pulse" cx="${point.x}" cy="${point.y}" r="${radius * 1.65}"></circle>
        <circle class="map-dot" cx="${point.x}" cy="${point.y}" r="${radius}"></circle>
        <rect class="map-label-bg" x="${label.x - 12}" y="${label.y - 30}" width="${regionLabelWidth(region, count)}" height="48" rx="6"></rect>
        <text class="map-label" x="${label.x}" y="${label.y - 10}">${escapeHtml(region)}</text>
        <text class="map-count" x="${label.x}" y="${label.y + 8}">${count} ${count === 1 ? "module" : "modules"}</text>
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
  const selectedModules = selectedRegion === "All" ? [] : (grouped.get(selectedRegion) || []).slice().sort(moduleSorter);
  const selectedPartnerGroups = groupModules(selectedModules, "vendor");
  const selectedPartners = [...selectedPartnerGroups.keys()].sort((a, b) => partnerSorter(a, b, selectedPartnerGroups));
  const selectedPartnerCards = selectedPartners.map((vendor) => mapPartnerCard(vendor, selectedPartnerGroups.get(vendor))).join("");
  const mapResults = selectedRegion === "All" ? "" : `
    <section class="map-results" aria-label="${escapeAttr(`${selectedRegion} SOMs`)}">
      <div class="map-results-head">
        <h3>${escapeHtml(selectedRegion)} SOMs</h3>
        <span>${selectedModules.length} ${selectedModules.length === 1 ? "module" : "modules"}</span>
      </div>
      <section class="map-result-section" aria-label="${escapeAttr(`${selectedRegion} partners`)}">
        <div class="map-section-head">
          <h4>Partners</h4>
          <span>${selectedPartners.length} ${selectedPartners.length === 1 ? "partner" : "partners"}</span>
        </div>
        <div class="map-partner-list">
          ${selectedPartnerCards || `<div class="empty-state">No partners match the current filters.</div>`}
        </div>
      </section>
      <section class="map-result-section" aria-label="${escapeAttr(`${selectedRegion} modules`)}">
        <div class="map-section-head">
          <h4>Modules</h4>
          <span>${selectedModules.length} ${selectedModules.length === 1 ? "module" : "modules"}</span>
        </div>
      <div class="map-result-cards">
        ${selectedModules.length ? selectedModules.map(moduleCard).join("") : `<div class="empty-state">No modules match the current filters.</div>`}
      </div>
      </section>
    </section>
  `;

  dom.visualization.innerHTML = `
    <div class="map-view">
      <div class="map-stage">
        <svg class="world-map" viewBox="0 0 1000 520" role="img" aria-label="World map highlighting SOM regions">
          <image class="map-base" href="./assets/maps/world-map.svg" x="0" y="0" width="1000" height="520" preserveAspectRatio="xMidYMid meet"></image>
          ${mapRegions}
        </svg>
        ${mapResults}
      </div>
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
  const vendors = [...grouped.keys()].sort((a, b) => partnerSorter(a, b, grouped));
  const selectedPartner = state.filters.vendor;
  const partnerModules = selectedPartner === "All" ? [] : partnerGridModules.filter((module) => module.vendor === selectedPartner).sort(moduleSorter);
  const cards = vendors.map((vendor) => {
    const active = selectedPartner === vendor;
    const program = partnerProgramForVendor(grouped, vendor);
    return `
      <button class="company-card partner-logo-card ${active ? "is-active" : ""}" type="button" data-company="${escapeAttr(vendor)}" style="--company-color:${colorForValue(vendor)}" aria-label="${escapeAttr(`${vendor} ${program} partner`)}">
        <span class="company-logo-wrap">${companyLogoMarkup(vendor, "company-logo")}</span>
        <span class="partner-company-name">${escapeHtml(vendor)}</span>
        ${partnerBadgeMarkup(program, "partner-card-tier")}
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
        <span>Lifecycle</span>
        <span>Partner program</span>
      </div>
      ${rows.map((module) => `
        <article class="directory-row" style="--row-color:${colorForModule(module)}">
          <button type="button" data-module-id="${module.id}">${escapeHtml(module.name)}</button>
          <span>${escapeHtml(module.vendor)}</span>
          <span>${escapeHtml(module.device)}</span>
          <span>${escapeHtml(module.region)}</span>
          <span>${escapeHtml(module.formFactorFamily)}</span>
          <span class="badge" style="--badge-color:${colorForValue(module.lifecycle)}">${escapeHtml(module.lifecycle)}</span>
          <span class="badge" style="--badge-color:${colorForValue(module.partnerProgram)}">${escapeHtml(module.partnerProgram)}</span>
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
      <span class="module-program">${escapeHtml(module.partnerProgram)} partner</span>
    </button>
  `;
}

function mapPartnerCard(vendor, modules) {
  const sortedModules = modules.slice().sort(moduleSorter);
  const devices = sortValues([...new Set(sortedModules.map((module) => module.device))], "device").slice(0, 4).join(", ");
  const program = partnerProgramForVendor(new Map([[vendor, sortedModules]]), vendor);
  return `
    <button class="map-partner-card" type="button" data-company="${escapeAttr(vendor)}" style="--company-color:${colorForValue(vendor)}">
      <span class="map-partner-logo-wrap">${companyLogoMarkup(vendor, "map-partner-logo")}</span>
      <span class="map-partner-body">
        <strong>${escapeHtml(vendor)}</strong>
        <span>${sortedModules.length} ${sortedModules.length === 1 ? "module" : "modules"}</span>
        ${partnerBadgeMarkup(program, "map-partner-tier")}
        <span>${escapeHtml(devices || "No matching devices")}</span>
      </span>
    </button>
  `;
}

function openDrawer(moduleId) {
  const module = state.modules.find((item) => item.id === moduleId);
  if (!module) return;
  const link = normalizeTiLink(module.tiLink || module.tiToolId);
  dom.drawerContent.innerHTML = `
    <div class="drawer-company">
      ${companyLogoMarkup(module.vendor, "drawer-logo")}
      ${partnerBadgeMarkup(module.partnerProgram, "drawer-tier-badge")}
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
      ${detailItem("DDR", module.ddr)}
      ${detailItem("Flash", module.flash)}
      ${detailItem("Released", module.released)}
      ${detailItem("TI tool ID", module.tiToolId)}
      ${detailItem("TI.com verified", module.lastVerified)}
      ${detailItem("Specs verified", module.specVerified)}
    </dl>
    <div class="drawer-actions">
      ${module.specSource ? `<a class="drawer-link" href="${escapeAttr(module.specSource)}" target="_blank" rel="noreferrer">View spec source</a>` : ""}
      ${link ? `<a class="drawer-link secondary" href="${escapeAttr(link)}" target="_blank" rel="noreferrer">Visit TI.com</a>` : ""}
    </div>
  `;
  dom.drawer.dataset.openModuleId = moduleId;
  dom.drawer.classList.add("is-open");
  dom.drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  dom.drawer.classList.remove("is-open");
  dom.drawer.setAttribute("aria-hidden", "true");
  delete dom.drawer.dataset.openModuleId;
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
  const programCompare = compareByOrder(a.partnerProgram, b.partnerProgram, "partnerProgram");
  return programCompare
    || a.vendor.localeCompare(b.vendor, undefined, { sensitivity: "base" })
    || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    || compareByOrder(a.device, b.device, "device");
}

function partnerSorter(a, b, grouped) {
  const programCompare = compareByOrder(partnerProgramForVendor(grouped, a), partnerProgramForVendor(grouped, b), "partnerProgram");
  return programCompare || a.localeCompare(b, undefined, { sensitivity: "base" });
}

function partnerProgramForVendor(grouped, vendor) {
  const statuses = [...new Set((grouped.get(vendor) || []).map((module) => module.partnerProgram || "Unknown"))];
  return sortValues(statuses, "partnerProgram")[0] || "Unknown";
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

function projectRegion(region) {
  const x = worldMap.width / 2 + region.lon * Math.PI / 180 * worldMap.scale;
  const y = worldMap.height / 2 - region.lat * Math.PI / 180 * worldMap.scale;
  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
  };
}

async function loadLogoManifest() {
  return loadJson(LOGO_MANIFEST_URL, "TI_SOM_LOGOS", {});
}

async function loadPartnerBadgeManifest() {
  return loadJson(PARTNER_BADGE_MANIFEST_URL, "TI_PARTNER_PROGRAM_BADGES", {});
}

async function loadFormFactorManifest() {
  return loadJson(FORM_FACTOR_MANIFEST_URL, "TI_SOM_FORM_FACTOR_LOGOS", {});
}

async function loadPartners() {
  return loadJson(PARTNERS_URL, "TI_SOM_PARTNERS", {});
}

async function loadJson(url, globalName, fallback = null) {
  if (window[globalName]) return structuredCloneSafe(window[globalName]);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (fallback !== null) return fallback;
      throw new Error(`Unable to load ${url}`);
    }
    return await response.json();
  } catch (error) {
    if (fallback !== null) return fallback;
    throw error;
  }
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
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
  state.groupBy = state.viewMode === "map" ? "region" : "vendor";
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
  const program = partnerProgramForVendor(new Map([[vendor, modules]]), vendor);
  return `
    <section class="partner-profile" style="--company-color:${colorForValue(vendor)}">
      <div class="partner-profile-head">
        ${companyLogoMarkup(vendor, "partner-profile-logo")}
        ${partnerBadgeMarkup(program, "partner-profile-tier")}
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

function companyLogoMarkup(vendor, className) {
  return `
    <img class="${escapeAttr(className)}" data-company-logo src="${escapeAttr(companyLogoSrc(vendor))}" alt="${escapeAttr(`${vendor} logo`)}">
    <span class="company-logo-fallback" hidden>${escapeHtml(vendor)}</span>
  `;
}

function handleImageError(event) {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.matches("[data-company-logo]")) return;
  image.hidden = true;
  const fallback = image.nextElementSibling;
  if (fallback?.classList.contains("company-logo-fallback")) fallback.hidden = false;
}

function partnerBadgeMarkup(status, className = "") {
  const src = state.partnerBadges[status];
  return `
    <span class="partner-program-mark ${escapeAttr(className)}">
      ${src ? `<img class="partner-tier-badge" src="${escapeAttr(src)}" alt="">` : ""}
      <span class="partner-program-label">${escapeHtml(status)} partner</span>
    </span>
  `;
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

function viewTitle(grouping) {
  if (state.viewMode === "map") return "Regional SOM map";
  if (state.viewMode === "partners") return "Partner Directory";
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
  const headers = ["Name", "Vendor", "Device", "Form Factor", "Form Family", "Region", "Partner Program", "Wireless", "DDR", "Flash", "Released", "Status", "TI Tool ID", "TI.com Verified", "TI.com Link", "Specs Verified", "Spec Source"];
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
      module.ddr,
      module.flash,
      module.released,
      module.lifecycle,
      module.tiToolId,
      module.lastVerified,
      normalizeTiLink(module.tiLink || module.tiToolId),
      module.specVerified,
      module.specSource,
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
