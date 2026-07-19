const THEME_KEY = "mivue-theme";
const FAVORITES_KEY = "mivue-favorites";
const VIEW_TITLES = { library: "Bibliotecă", settings: "Setări" };
const ROW_H = 56;
const SEP_H = 28;
const VIRTUAL_THRESHOLD = 80;
const VIRTUAL_BUFFER = 12;

const state = {
  files: [], category: "all", query: "", telemetry: [], selectedPath: null,
  sort: "date-desc", camera: "all", duration: "all", dateFrom: "", dateTo: "", timeFrom: "", timeTo: "", availability: "all",
  dateMode: "single", mapEnabled: false,
  map: null, mapRoute: null, mapProgress: null, mapMarker: null, mapHasFit: false, mapFollow: true,
  downloadJobs: new Map(), view: "library", renderToken: 0, renderTimer: 0,
  lastTelemetryIndex: -1, telemetryRaf: 0,
  favorites: loadFavorites(), selection: new Set(), selectMode: false,
  cameraCaps: { mutateAllowed: false, setProperties: [], setPropertyValues: {} },
  renderPlan: [], renderOffsets: null, stickyDateKey: null, visibleFiles: [], virtualScrollBound: false,
};
let thumbObserver = null;
const datePicker = {
  open: false,
  mode: "single",
  draftFrom: "",
  draftTo: "",
  pickingEnd: false,
  month: new Date(),
};
const MONTHS_RO = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
const $ = (selector) => document.querySelector(selector);

const elements = {
  dot: $("#connectionDot"), connection: $("#connectionText"),
  total: $("#totalCount"), normal: $("#normalCount"), parking: $("#parkingCount"),
  event: $("#eventCount"), photo: $("#photoCount"), ip: $("#cameraIp"),
  list: $("#fileList"), status: $("#statusMessage"), search: $("#searchInput"), refresh: $("#refreshButton"),
  sort: $("#sortSelect"), cameraFilter: $("#cameraSelect"), durationFilter: $("#durationSelect"),
  availabilityFilter: $("#availabilitySelect"), clearFilters: $("#clearFilters"), resultCount: $("#resultCount"),
  datePickerTrigger: $("#datePickerTrigger"), datePickerPopup: $("#datePickerPopup"), datePickerLabel: $("#datePickerLabel"),
  dpGrid: $("#dpGrid"), dpMonthLabel: $("#dpMonthLabel"), dpPrev: $("#dpPrev"), dpNext: $("#dpNext"),
  dpTimeFrom: $("#dpTimeFrom"), dpTimeTo: $("#dpTimeTo"), dpClear: $("#dpClear"), dpApply: $("#dpApply"),
  empty: $("#emptyViewer"), active: $("#activeViewer"), video: $("#videoPlayer"), viewerName: $("#viewerName"), badge: $("#viewerBadge"),
  notice: $("#viewerNotice"), canvas: $("#routeCanvas"), gpsState: $("#gpsState"), speed: $("#speedValue"), time: $("#telemetryTime"), altitude: $("#telemetryAltitude"),
  progress: $("#prepareProgress"), progressBar: $("#progressBar"), progressLabel: $("#progressLabel"), progressPercent: $("#progressPercent"), progressDetail: $("#progressDetail"),
  prepareCancel: $("#prepareCancel"),
  map: $("#realMap"), mapToggle: $("#mapToggle"), mapPrivacy: $("#mapPrivacy"),
  mapControls: $("#mapControls"), mapRecenter: $("#mapRecenter"), mapFitRoute: $("#mapFitRoute"),
  viewTitle: $("#viewTitle"), filtersToggle: $("#filtersToggle"), filtersPanel: $("#filtersPanel"),
  themeToggle: $("#themeToggle"), topbarSearch: $("#topbarSearchWrap"),
  settingsConnection: $("#settingsConnection"), settingsIp: $("#settingsIp"),
  settingsTotal: $("#settingsTotal"), settingsNormal: $("#settingsNormal"),
  settingsParking: $("#settingsParking"), settingsEvent: $("#settingsEvent"), settingsPhoto: $("#settingsPhoto"),
  downloadsButton: $("#downloadsButton"), downloadsPanel: $("#downloadsPanel"),
  downloadsBadge: $("#downloadsBadge"), downloadsList: $("#downloadsList"), downloadsEmpty: $("#downloadsEmpty"),
  toastContainer: $("#toastContainer"), statusText: $("#statusText"), statusRetry: $("#statusRetry"),
  selectModeToggle: $("#selectModeToggle"), bulkBar: $("#bulkBar"), bulkCount: $("#bulkCount"),
  bulkSelectAll: $("#bulkSelectAll"), bulkDownload: $("#bulkDownload"),
  bulkDeleteCamera: $("#bulkDeleteCamera"),
  bulkDeleteLocal: $("#bulkDeleteLocal"), bulkClear: $("#bulkClear"), bulkClose: $("#bulkClose"),
  storageFileCount: $("#storageFileCount"), storageTotalBytes: $("#storageTotalBytes"),
  refreshStorageBtn: $("#refreshStorageBtn"),
  sdTotalBytes: $("#sdTotalBytes"),
  sdNormalBytes: $("#sdNormalBytes"), sdParkingBytes: $("#sdParkingBytes"),
  sdEventBytes: $("#sdEventBytes"), sdPhotoBytes: $("#sdPhotoBytes"),
  sdNormalBar: $("#sdNormalBar"), sdParkingBar: $("#sdParkingBar"),
  sdEventBar: $("#sdEventBar"), sdPhotoBar: $("#sdPhotoBar"),
  listStickyDate: $("#listStickyDate"),
  cameraMutateStatus: $("#cameraMutateStatus"),
  cameraUiMode: $("#cameraUiMode"), cameraBroadcast: $("#cameraBroadcast"), cameraCamid: $("#cameraCamid"),
  cameraSetControls: $("#cameraSetControls"), cameraSetEmpty: $("#cameraSetEmpty"),
};

function loadFavorites() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
}

function rowHeight() {
  return ROW_H;
}

function sepHeight() {
  return SEP_H;
}

function itemHeight(item) {
  if (item.kind === "sep") {
    if (item.date === state.stickyDateKey) return 0;
    return sepHeight();
  }
  return rowHeight();
}

function buildPlanOffsets(plan) {
  const offsets = new Array(plan.length + 1);
  offsets[0] = 0;
  for (let i = 0; i < plan.length; i += 1) offsets[i + 1] = offsets[i] + itemHeight(plan[i]);
  return offsets;
}

function indexAtOffset(offsets, y) {
  let low = 0;
  let high = offsets.length - 2;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (offsets[mid + 1] <= y) low = mid + 1;
    else if (offsets[mid] > y) high = mid - 1;
    else return mid;
  }
  return Math.max(0, Math.min(offsets.length - 2, low));
}

function formatStickyDate(key) {
  if (!key || key === "unknown") return "Dată necunoscută";
  return new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${key}T12:00:00`));
}

function resolveStickyDateKey() {
  const plan = state.renderPlan;
  if (!plan.length) return null;
  let dateKey = null;
  if (state.virtualScrollBound && state.renderOffsets) {
    const idx = indexAtOffset(state.renderOffsets, elements.list.scrollTop + 4);
    for (let i = idx; i >= 0; i -= 1) {
      if (plan[i].kind === "sep") { dateKey = plan[i].date; break; }
      if (plan[i].kind === "file") { dateKey = fileDay(plan[i].file); break; }
    }
  } else {
    const top = elements.list.scrollTop + 8;
    const rows = elements.list.querySelectorAll(".date-separator, .file-row");
    for (const node of rows) {
      if (node.offsetTop + node.offsetHeight < top) continue;
      if (node.classList.contains("date-separator")) {
        dateKey = node.dataset.date || null;
        break;
      }
      const path = node.dataset.path;
      const file = state.files.find((item) => item.path === path);
      if (file) { dateKey = fileDay(file); break; }
    }
  }
  if (!dateKey) {
    const firstSep = plan.find((item) => item.kind === "sep");
    dateKey = firstSep?.date ?? null;
  }
  return dateKey;
}

function syncCoveredSeparators() {
  elements.list.querySelectorAll(".date-separator").forEach((el) => {
    el.classList.toggle("date-separator--covered", el.dataset.date === state.stickyDateKey);
  });
}

function updateStickyDateFromScroll() {
  const sticky = elements.listStickyDate;
  if (!sticky) return;
  if (!state.renderPlan.length) {
    state.stickyDateKey = null;
    sticky.classList.add("hidden");
    sticky.textContent = "";
    return;
  }
  const dateKey = resolveStickyDateKey();
  if (!dateKey) {
    state.stickyDateKey = null;
    sticky.classList.add("hidden");
    return;
  }
  const changed = state.stickyDateKey !== dateKey;
  sticky.textContent = formatStickyDate(dateKey);
  sticky.classList.remove("hidden");
  if (!changed) {
    syncCoveredSeparators();
    return;
  }
  const scrollTop = elements.list.scrollTop;
  const oldOffsets = state.renderOffsets;
  let anchorIdx = 0;
  let delta = 0;
  if (oldOffsets) {
    anchorIdx = indexAtOffset(oldOffsets, scrollTop);
    delta = scrollTop - oldOffsets[anchorIdx];
  }
  state.stickyDateKey = dateKey;
  state.renderOffsets = buildPlanOffsets(state.renderPlan);
  if (state.virtualScrollBound) {
    const nextTop = (state.renderOffsets[anchorIdx] ?? 0) + delta;
    elements.list.scrollTop = Math.max(0, nextTop);
    paintVirtualWindow(state.renderToken, true);
  } else {
    syncCoveredSeparators();
  }
}

function scheduleIdle(fn) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(() => fn(), { timeout: 180 });
  else setTimeout(fn, 32);
}

function showToast(message, variant = "ok") {
  if (!elements.toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast ${variant}`;
  toast.textContent = message;
  elements.toastContainer.append(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ——— Theme ——— */
function readThemePref() {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function resolveTheme(pref) {
  if (pref === "light" || pref === "dark") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(pref) {
  const resolved = resolveTheme(pref);
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-pref", pref);
  localStorage.setItem(THEME_KEY, pref);
  document.querySelectorAll('input[name="themePref"]').forEach((input) => {
    input.checked = input.value === pref;
  });
  if (!state.mapEnabled && state.telemetry.length) drawRoute(currentSampleIndex());
}

function cycleTheme() {
  const order = ["light", "dark", "system"];
  const current = readThemePref();
  const next = order[(order.indexOf(current) + 1) % order.length];
  applyTheme(next);
}

applyTheme(readThemePref());
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (readThemePref() === "system") applyTheme("system");
});
elements.themeToggle.addEventListener("click", cycleTheme);
document.querySelectorAll('input[name="themePref"]').forEach((input) => {
  input.addEventListener("change", () => { if (input.checked) applyTheme(input.value); });
});

/* ——— Views ——— */
function setView(view) {
  state.view = view;
  document.querySelectorAll(".view").forEach((section) => {
    const active = section.dataset.view === view;
    section.classList.toggle("active", active);
    section.toggleAttribute("hidden", !active);
  });
  document.querySelectorAll(".nav-btn[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  elements.viewTitle.textContent = VIEW_TITLES[view] ?? view;
  elements.topbarSearch.classList.toggle("hidden-search", view !== "library");
  elements.search.tabIndex = view === "library" ? 0 : -1;
  if (view === "library" && state.mapEnabled) setTimeout(() => state.map?.invalidateSize(), 0);
  if (view === "settings") {
    void refreshStorageStats();
    void refreshCameraAdmin();
  }
}

document.querySelectorAll(".nav-btn[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

/* ——— Collapsible filters ——— */
elements.filtersToggle.addEventListener("click", () => {
  const open = elements.filtersPanel.hasAttribute("hidden");
  elements.filtersPanel.toggleAttribute("hidden", !open);
  elements.filtersPanel.classList.toggle("collapsed", !open);
  elements.filtersToggle.setAttribute("aria-expanded", open ? "true" : "false");
});

elements.downloadsButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const open = elements.downloadsPanel.classList.contains("hidden");
  elements.downloadsPanel.classList.toggle("hidden", !open);
  elements.downloadsButton.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) renderDownloadsPanel();
});
document.addEventListener("click", (event) => {
  if (!elements.downloadsPanel.classList.contains("hidden") && !event.target.closest(".downloads-menu")) {
    elements.downloadsPanel.classList.add("hidden");
    elements.downloadsButton.setAttribute("aria-expanded", "false");
  }
  if (datePicker.open && !event.target.closest(".date-picker-field")) closeDatePicker();
});

/* ——— Existing library wiring ——— */
document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
  setCategory(button.dataset.category);
}));
document.querySelectorAll(".stat-chip[data-category]").forEach((chip) => {
  chip.addEventListener("click", () => setCategory(chip.dataset.category));
});
elements.search.addEventListener("input", () => { state.query = elements.search.value.toLowerCase(); scheduleRenderFiles(true); });
elements.sort.addEventListener("change", () => { state.sort = elements.sort.value; scheduleRenderFiles(false); });
elements.cameraFilter.addEventListener("change", () => { state.camera = elements.cameraFilter.value; scheduleRenderFiles(false); });
elements.durationFilter.addEventListener("change", () => { state.duration = elements.durationFilter.value; scheduleRenderFiles(false); });
elements.availabilityFilter.addEventListener("change", () => { state.availability = elements.availabilityFilter.value; scheduleRenderFiles(false); });
elements.clearFilters.addEventListener("click", clearFilters);
elements.statusRetry?.addEventListener("click", () => { void loadDashboard(true); });
elements.selectModeToggle?.addEventListener("click", toggleSelectMode);
elements.bulkSelectAll?.addEventListener("click", selectAllFiltered);
elements.bulkDownload?.addEventListener("click", () => { void bulkDownloadSelected(); });
elements.bulkDeleteCamera?.addEventListener("click", () => { void bulkDeleteCameraSelected(); });
elements.bulkDeleteLocal?.addEventListener("click", () => { void bulkDeleteLocalSelected(); });
elements.bulkClear?.addEventListener("click", clearSelection);
elements.bulkClose?.addEventListener("click", exitSelectMode);
elements.refreshStorageBtn?.addEventListener("click", () => { void refreshStorageStats(); });
wireDatePicker();
syncDatePickerLabel();
syncBulkBar();
elements.mapToggle.addEventListener("click", toggleMap);
elements.mapRecenter.addEventListener("click", () => recenterMapOnPin(true));
elements.mapFitRoute.addEventListener("click", fitMapToRoute);
elements.refresh.addEventListener("click", () => { void loadDashboard(true); });
elements.prepareCancel.addEventListener("click", () => {
  if (state.selectedPath) void cancelDownload(state.selectedPath);
});
elements.video.addEventListener("timeupdate", updateTelemetryMarker);
window.addEventListener("resize", () => { if (state.mapEnabled) state.map?.invalidateSize(); else drawRoute(currentSampleIndex()); });
elements.list.addEventListener("scroll", () => {
  updateStickyDateFromScroll();
  if (!state.virtualScrollBound || state.renderPlan.length < VIRTUAL_THRESHOLD) return;
  scheduleIdle(() => paintVirtualWindow(state.renderToken, true));
});

function setCategory(category) {
  state.category = category || "all";
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.category === state.category);
  });
  document.querySelectorAll(".stat-chip[data-category]").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.category === state.category);
  });
  scheduleRenderFiles(false);
}

function countByCategory(category) {
  return state.files.filter((file) => file.category === category).length;
}

function updateLibraryStats(host) {
  const total = state.files.length;
  const normal = countByCategory("normal");
  const parking = countByCategory("parking");
  const event = countByCategory("event");
  const photo = countByCategory("photo");
  elements.total.textContent = String(total);
  elements.normal.textContent = String(normal);
  elements.parking.textContent = String(parking);
  elements.event.textContent = String(event);
  elements.photo.textContent = String(photo);
  if (host) elements.ip.textContent = host;
  syncSettingsPanel(elements.dot.classList.contains("online"), elements.connection.textContent);
}

function syncSettingsPanel(online, message) {
  elements.settingsConnection.textContent = message;
  elements.settingsIp.textContent = elements.ip.textContent;
  elements.settingsTotal.textContent = elements.total.textContent;
  elements.settingsNormal.textContent = elements.normal.textContent;
  elements.settingsParking.textContent = elements.parking.textContent;
  elements.settingsEvent.textContent = elements.event.textContent;
  elements.settingsPhoto.textContent = elements.photo.textContent;
  if (!online) elements.settingsConnection.style.color = "var(--danger)";
  else elements.settingsConnection.style.color = "";
  refreshCameraSdStats();
}

async function loadDashboard(fresh = false) {
  showSkeleton();
  setStatus(fresh ? "Se reîmprospătează lista…" : "Se citesc camera și înregistrările…");
  try {
    // Serverul AIT vechi răspunde intermitent cu 404 la cereri CGI concurente.
    const info = await api("/api/info");
    const listing = await api(fresh ? "/api/files?refresh=1" : "/api/files");
    state.files = listing.files;
    updateLibraryStats(info.endpoint.host);
    elements.dot.classList.add("online"); elements.connection.textContent = "Camera conectată";
    syncSettingsPanel(true, "Camera conectată");
    setStatus("");
    renderFiles();
    void refreshCameraAdmin();
  } catch (error) {
    elements.dot.classList.remove("online"); elements.connection.textContent = "Camera indisponibilă";
    syncSettingsPanel(false, "Camera indisponibilă");
    setStatus(error.message, true);
    void refreshCameraAdmin();
  }
}

function showSkeleton() {
  resetThumbObserver();
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 8; i += 1) {
    const row = document.createElement("div");
    row.className = "skeleton-row";
    row.innerHTML = '<div class="skeleton-block skeleton-thumb"></div><div><div class="skeleton-block" style="width:70%;margin-bottom:8px"></div><div class="skeleton-block" style="width:40%"></div></div><div class="skeleton-block" style="width:64px"></div>';
    fragment.append(row);
  }
  elements.list.replaceChildren(fragment);
}

function scheduleRenderFiles(fromTyping = false) {
  clearTimeout(state.renderTimer);
  const delay = fromTyping ? 100 : 40;
  state.renderTimer = setTimeout(() => {
    if (fromTyping) renderFiles();
    else scheduleIdle(() => renderFiles());
  }, delay);
}

function resetThumbObserver() {
  thumbObserver?.disconnect();
  thumbObserver = null;
}

function ensureThumbObserver() {
  if (thumbObserver) return thumbObserver;
  thumbObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const img = entry.target;
      if (!(img instanceof HTMLImageElement)) continue;
      const src = img.dataset.src;
      if (!src) continue;
      img.src = src;
      delete img.dataset.src;
      thumbObserver.unobserve(img);
    }
  }, { root: elements.list, rootMargin: "160px 0px", threshold: 0.01 });
  return thumbObserver;
}

function filteredFiles() {
  return state.files.filter((file) => {
    if (state.category === "favorites") {
      if (!state.favorites.has(file.path)) return false;
    } else if (state.category !== "all" && file.category !== state.category) {
      return false;
    }
    return (state.camera === "all" || file.camera === state.camera)
      && durationMatches(file.durationSeconds)
      && dateMatches(file)
      && availabilityMatches(file)
      && (`${file.name} ${file.recordedAt}`.toLowerCase().includes(state.query));
  });
}

function renderFiles() {
  clearTimeout(state.renderTimer);
  const visible = filteredFiles();
  const ordered = orderWithinDateGroups(visible);
  const plan = [];
  let previousDate = null;
  for (const file of ordered) {
    const date = fileDay(file);
    if (date !== previousDate) {
      plan.push({ kind: "sep", date });
      previousDate = date;
    }
    plan.push({ kind: "file", file });
  }
  state.visibleFiles = visible;
  state.renderPlan = plan;
  const firstSep = plan.find((item) => item.kind === "sep");
  state.stickyDateKey = firstSep?.date ?? null;
  if (elements.listStickyDate) {
    if (state.stickyDateKey) {
      elements.listStickyDate.textContent = formatStickyDate(state.stickyDateKey);
      elements.listStickyDate.classList.remove("hidden");
    } else {
      elements.listStickyDate.textContent = "";
      elements.listStickyDate.classList.add("hidden");
    }
  }
  state.renderOffsets = buildPlanOffsets(plan);
  elements.resultCount.textContent = `${visible.length} din ${state.files.length} fișiere`;
  elements.status.classList.toggle("hidden", visible.length > 0 || state.files.length === 0);
  if (visible.length === 0 && state.files.length > 0) setStatus("Nu există înregistrări pentru filtrul ales.");
  else if (visible.length > 0) setStatus("");

  const token = ++state.renderToken;
  resetThumbObserver();
  if (plan.length >= VIRTUAL_THRESHOLD) {
    state.virtualScrollBound = true;
    paintVirtualWindow(token, true);
    return;
  }
  state.virtualScrollBound = false;
  elements.list.replaceChildren();
  let index = 0;
  const chunkSize = 40;
  const pump = () => {
    if (token !== state.renderToken) return;
    if (index >= plan.length) {
      syncCoveredSeparators();
      return;
    }
    const fragment = document.createDocumentFragment();
    const end = Math.min(index + chunkSize, plan.length);
    const observer = ensureThumbObserver();
    for (; index < end; index += 1) {
      const item = plan[index];
      const node = item.kind === "sep" ? dateSeparator(item.date) : fileRow(item.file);
      if (node instanceof HTMLElement) {
        node.querySelectorAll("img.file-thumbnail[data-src]").forEach((img) => observer.observe(img));
      }
      fragment.append(node);
    }
    elements.list.append(fragment);
    if (index < plan.length) requestAnimationFrame(pump);
    else syncCoveredSeparators();
  };
  requestAnimationFrame(pump);
}

function paintVirtualWindow(token, skipStickyUpdate = false) {
  if (token !== state.renderToken) return;
  const plan = state.renderPlan;
  const offsets = state.renderOffsets || buildPlanOffsets(plan);
  state.renderOffsets = offsets;
  const scrollTop = elements.list.scrollTop;
  const viewH = elements.list.clientHeight || 480;
  const start = Math.max(0, indexAtOffset(offsets, Math.max(0, scrollTop)) - VIRTUAL_BUFFER);
  const end = Math.min(plan.length, indexAtOffset(offsets, scrollTop + viewH) + 1 + VIRTUAL_BUFFER);
  const topPad = offsets[start];
  const bottomPad = Math.max(0, offsets[plan.length] - offsets[end]);
  resetThumbObserver();
  const fragment = document.createDocumentFragment();
  const top = document.createElement("div");
  top.className = "virtual-spacer";
  top.style.height = `${topPad}px`;
  fragment.append(top);
  const observer = ensureThumbObserver();
  for (let i = start; i < end; i += 1) {
    const item = plan[i];
    if (item.kind === "sep" && item.date === state.stickyDateKey) continue;
    const node = item.kind === "sep" ? dateSeparator(item.date) : fileRow(item.file);
    if (node instanceof HTMLElement) {
      node.querySelectorAll("img.file-thumbnail[data-src]").forEach((img) => observer.observe(img));
    }
    fragment.append(node);
  }
  const bottom = document.createElement("div");
  bottom.className = "virtual-spacer";
  bottom.style.height = `${bottomPad}px`;
  fragment.append(bottom);
  elements.list.replaceChildren(fragment);
  if (!skipStickyUpdate) updateStickyDateFromScroll();
}

function fileRow(file) {
  const row = document.createElement("article");
  row.className = `file-row${state.selectedPath === file.path ? " selected" : ""}`;
  row.tabIndex = 0;
  row.dataset.path = file.path;

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "file-check";
  check.checked = state.selection.has(file.path);
  check.title = "Selectează";
  check.addEventListener("click", (event) => event.stopPropagation());
  check.addEventListener("change", (event) => {
    event.stopPropagation();
    toggleSelection(file.path, check.checked);
  });

  const icon = document.createElement("div"); icon.className = "file-icon";
  const placeholder = document.createElement("span");
  placeholder.className = "file-icon-placeholder";
  placeholder.setAttribute("aria-hidden", "true");
  placeholder.innerHTML = file.category === "photo"
    ? '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3.5" width="14" height="11" rx="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="6.5" cy="7.5" r="1.4" fill="currentColor"/><path d="M3.5 13.2 7.2 9.8l2.4 2.1 2.2-2.6 2.7 4" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5.5 3.8v8.4L13 8 5.5 3.8Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  icon.append(placeholder);
  if (!String(file.path).startsWith("/local/")) {
    const thumbnail = document.createElement("img"); thumbnail.className = "file-thumbnail"; thumbnail.loading = "lazy";
    thumbnail.alt = ""; thumbnail.dataset.src = `/api/thumbnail?path=${encodeURIComponent(file.path)}`;
    thumbnail.addEventListener("load", () => placeholder.classList.add("hidden"));
    thumbnail.addEventListener("error", () => thumbnail.remove()); icon.append(thumbnail);
  }

  const main = document.createElement("div"); main.className = "file-main";
  const titleRow = document.createElement("div"); titleRow.className = "file-title-row";
  const title = document.createElement("strong"); title.textContent = file.name;
  const category = document.createElement("i"); category.className = "category-pill"; category.textContent = file.category;
  titleRow.append(title, category);
  const date = document.createElement("span"); date.className = "file-date"; date.textContent = formatDate(file.recordedAt);
  main.append(titleRow, date);

  const stats = document.createElement("div");
  stats.className = "file-stats";
  const duration = formatDuration(file.durationSeconds);
  const size = formatBytes(file.sizeBytes);
  stats.innerHTML =
    `<span class="file-stat" title="Durată ${duration}"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6 3.6V6l1.7 1.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${duration}</span>` +
    `<span class="file-stat" title="Mărime ${size}"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="2.5" width="9" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 5h9" stroke="currentColor" stroke-width="1.2"/></svg>${size}</span>`;

  const meta = document.createElement("div"); meta.className = "file-meta";
  const actions = document.createElement("div"); actions.className = "download-actions"; actions.dataset.path = file.path;
  const download = document.createElement("button"); download.className = "download-button"; download.type = "button"; download.dataset.path = file.path;
  const cancel = document.createElement("button"); cancel.className = "download-cancel hidden"; cancel.type = "button"; cancel.dataset.path = file.path; cancel.textContent = "✕"; cancel.title = "Anulează"; cancel.setAttribute("aria-label", "Anulează descărcarea");
  updateDownloadActions(actions, download, cancel, file, state.downloadJobs.get(file.path));
  download.addEventListener("click", (event) => { event.stopPropagation(); void queueDownload(file); });
  cancel.addEventListener("click", (event) => { event.stopPropagation(); void cancelDownload(file.path); });

  const fav = document.createElement("button");
  fav.type = "button";
  fav.className = `fav-btn${state.favorites.has(file.path) ? " active" : ""}`;
  fav.title = "Favorite";
  fav.setAttribute("aria-label", "Marchează favorite");
  fav.textContent = state.favorites.has(file.path) ? "★" : "☆";
  fav.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavorite(file.path);
    fav.classList.toggle("active", state.favorites.has(file.path));
    fav.textContent = state.favorites.has(file.path) ? "★" : "☆";
  });

  actions.append(download, cancel);
  if (file.locallyAvailable && file.localName) {
    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete-local-btn";
    del.textContent = "Șterge";
    del.title = "Șterge copia locală";
    del.addEventListener("click", (event) => {
      event.stopPropagation();
      void deleteLocalForFile(file);
    });
    actions.append(del);
  }
  meta.append(actions, fav);
  row.append(check, icon, main, stats, meta);
  row.addEventListener("click", () => {
    if (state.selectMode) {
      toggleSelection(file.path, !state.selection.has(file.path));
      return;
    }
    selectFile(file, row);
  });
  row.addEventListener("keydown", (event) => {
    if (event.target === row && (event.key === "Enter" || event.key === " ")) selectFile(file, row);
  });
  return row;
}

function selectFile(file, row) {
  document.querySelectorAll(".file-row").forEach((item) => item.classList.remove("selected")); row.classList.add("selected");
  state.selectedPath = file.path; state.telemetry = []; state.mapHasFit = false; state.mapFollow = true;
  state.lastTelemetryIndex = -1;
  state.mapRoute?.remove(); state.mapProgress?.remove(); state.mapMarker?.remove();
  state.mapRoute = null; state.mapProgress = null; state.mapMarker = null;
  elements.empty.classList.add("hidden"); elements.active.classList.remove("hidden");
  elements.viewerName.textContent = file.name; elements.badge.textContent = file.category;
  elements.speed.textContent = "0";
  elements.notice.classList.add("hidden"); elements.video.removeAttribute("src"); elements.video.load();
  const activeJob = state.downloadJobs.get(file.path);
  if (activeJob && activeJob.status !== "error") {
    showProgress(activeJob.progress ?? { percent: 0, message: "În coada de descărcare…" });
    elements.gpsState.textContent = "Descărcare în curs"; drawEmptyRoute("Se descarcă");
  } else {
    elements.progress.classList.add("hidden");
  }
  if (file.locallyAvailable && file.localName) {
    void loadPrepared(file, {
      mediaUrl: `/media/${encodeURIComponent(file.localName)}`,
      ...(file.localTelemetryName ? { telemetryUrl: `/api/telemetry?name=${encodeURIComponent(file.localTelemetryName)}` } : {}),
    });
  } else if (!activeJob) {
    elements.gpsState.textContent = "Nedescărcat"; drawEmptyRoute("Fișier disponibil pe cameră");
    elements.notice.textContent = "Apasă „Descarcă” pe card pentru redare locală."; elements.notice.classList.remove("hidden");
  }
}

async function queueDownload(file) {
  if (String(file.path).startsWith("/local/")) return;
  const existing = state.downloadJobs.get(file.path);
  if (file.locallyAvailable || (existing && existing.status !== "error")) return;
  if (existing?.status === "error") state.downloadJobs.delete(file.path);
  const jobState = {
    status: "queued",
    name: file.name,
    path: file.path,
    progress: { percent: 0, message: "Se adaugă în coadă…" },
  };
  state.downloadJobs.set(file.path, jobState); updateDownloadControls(file); renderDownloadsPanel();
  if (state.selectedPath === file.path) {
    elements.notice.classList.add("hidden"); elements.gpsState.textContent = "În coada de descărcare"; showProgress(jobState.progress);
  }
  try {
    const started = await api("/api/prepare", { method: "POST", body: JSON.stringify({ remotePath: file.path }) });
    jobState.jobId = started.jobId;
    if (jobState.cancelRequested) {
      await cancelDownload(file.path);
      return;
    }
    await trackDownload(file, jobState);
  } catch (error) {
    jobState.status = "error"; jobState.error = error.message; updateDownloadControls(file); renderDownloadsPanel();
    if (state.selectedPath === file.path) {
      elements.progress.classList.add("hidden"); elements.notice.textContent = error.message; elements.notice.classList.remove("hidden");
    }
  }
}

async function cancelDownload(filePath) {
  const jobState = state.downloadJobs.get(filePath);
  if (!jobState || (jobState.status !== "queued" && jobState.status !== "running" && jobState.status !== "cancelling")) return;
  jobState.cancelRequested = true;
  jobState.status = "cancelling";
  jobState.progress = { ...(jobState.progress ?? {}), message: "Se anulează…", percent: jobState.progress?.percent ?? 0 };
  const file = state.files.find((item) => item.path === filePath) ?? { path: filePath, locallyAvailable: false };
  updateDownloadControls(file);
  renderDownloadsPanel();
  if (!jobState.jobId) return;
  try {
    await api(`/api/jobs/${encodeURIComponent(jobState.jobId)}`, { method: "DELETE" });
  } catch (error) {
    jobState.status = "error";
    jobState.error = error.message;
    updateDownloadControls(file);
    renderDownloadsPanel();
  }
}

async function trackDownload(file, jobState) {
  for (;;) {
    const job = await api(`/api/jobs/${encodeURIComponent(jobState.jobId)}`);
    jobState.status = job.status; jobState.progress = job.progress; updateDownloadControls(file); renderDownloadsPanel();
    if (state.selectedPath === file.path && job.progress) showProgress(job.progress);
    if (job.status === "complete") {
      file.locallyAvailable = true; file.localName = job.result.playableName;
      if (job.result.nmeaName) file.localTelemetryName = job.result.nmeaName;
      state.downloadJobs.delete(file.path); renderFiles(); renderDownloadsPanel();
      showToast(`Descărcat: ${file.name}`, "ok");
      if (state.selectedPath === file.path) { elements.progress.classList.add("hidden"); await loadPrepared(file, job.result); }
      return;
    }
    if (job.status === "error") {
      const cancelled = /anulat/i.test(job.error ?? "");
      state.downloadJobs.delete(file.path);
      updateDownloadControls(file);
      renderDownloadsPanel();
      if (state.selectedPath === file.path) {
        elements.progress.classList.add("hidden");
        if (cancelled) {
          elements.notice.textContent = "Descărcare anulată.";
          elements.notice.classList.remove("hidden");
          elements.gpsState.textContent = "Anulat";
          drawEmptyRoute("Descărcare anulată");
        } else {
          elements.notice.textContent = job.error; elements.notice.classList.remove("hidden");
        }
      }
      if (!cancelled) {
        showToast(job.error || `Eroare: ${file.name}`, "err");
        throw new Error(job.error);
      }
      showToast(`Anulat: ${file.name}`, "err");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
}

async function loadPrepared(file, prepared) {
  const selectedPath = file.path;
  elements.notice.classList.add("hidden"); elements.gpsState.textContent = "Se încarcă datele locale…";
  elements.video.src = prepared.mediaUrl; elements.video.load();
  if (prepared.warning) { elements.notice.textContent = prepared.warning; elements.notice.classList.remove("hidden"); }
  try {
    if (prepared.telemetryUrl) {
      const telemetry = await api(prepared.telemetryUrl);
      if (state.selectedPath !== selectedPath) return;
      state.telemetry = telemetry.samples; elements.gpsState.textContent = `${state.telemetry.length} puncte · sincronizat`;
      drawRoute(0); updateTelemetryMarker();
    } else { elements.gpsState.textContent = "Fără date GPS"; drawEmptyRoute("Sidecar NMEA indisponibil"); }
  } catch (error) {
    if (state.selectedPath !== selectedPath) return;
    elements.gpsState.textContent = "Date GPS indisponibile"; drawEmptyRoute("Fără traseu");
  }
}

function updateDownloadControls(file) {
  document.querySelectorAll(".download-actions").forEach((actions) => {
    if (actions.dataset.path !== file.path) return;
    const download = actions.querySelector(".download-button");
    const cancel = actions.querySelector(".download-cancel");
    if (download && cancel) updateDownloadActions(actions, download, cancel, file, state.downloadJobs.get(file.path));
  });
  if (state.selectedPath === file.path) {
    const job = state.downloadJobs.get(file.path);
    const active = job && (job.status === "queued" || job.status === "running" || job.status === "cancelling");
    elements.prepareCancel.disabled = !active || job.status === "cancelling";
    elements.prepareCancel.textContent = job?.status === "cancelling" ? "…" : "Anulează";
  }
}

function updateDownloadActions(actions, button, cancel, file, job) {
  const busy = Boolean(job && (job.status === "queued" || job.status === "running" || job.status === "cancelling"));
  button.classList.toggle("downloaded", file.locallyAvailable);
  button.classList.toggle("busy", busy && !file.locallyAvailable);
  cancel.classList.toggle("hidden", !busy);
  cancel.disabled = job?.status === "cancelling";
  cancel.textContent = job?.status === "cancelling" ? "…" : "✕";
  if (file.locallyAvailable) {
    button.disabled = true;
    button.textContent = "Descărcat";
  } else if (job?.status === "cancelling") {
    button.disabled = true;
    button.textContent = "…";
  } else if (job?.status === "queued") {
    button.disabled = true;
    button.textContent = job.progress?.message?.includes("poziția") ? job.progress.message.replace("În coadă · ", "") : "În coadă";
  } else if (job?.status === "running") {
    button.disabled = true;
    button.textContent = `${Math.round(job.progress?.percent ?? 0)}%`;
  } else if (job?.status === "error") {
    button.disabled = false;
    button.textContent = "Reîncearcă";
  } else {
    button.disabled = false;
    button.textContent = "Descarcă";
  }
}

function renderDownloadsPanel() {
  const jobs = [...state.downloadJobs.values()].filter((job) => job.status === "queued" || job.status === "running" || job.status === "cancelling");
  elements.downloadsBadge.textContent = String(jobs.length);
  elements.downloadsBadge.classList.toggle("hidden", jobs.length === 0);
  elements.downloadsButton.classList.toggle("has-active", jobs.length > 0);
  elements.downloadsEmpty.classList.toggle("hidden", jobs.length > 0);
  elements.downloadsList.replaceChildren(...jobs.map((job) => {
    const item = document.createElement("div");
    item.className = "download-item";
    const top = document.createElement("div");
    top.className = "download-item-top";
    const name = document.createElement("div");
    name.className = "download-item-name";
    name.textContent = job.name || job.path;
    name.title = job.name || job.path;
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "download-item-cancel";
    cancel.textContent = job.status === "cancelling" ? "…" : "Anulează";
    cancel.disabled = job.status === "cancelling";
    cancel.addEventListener("click", (event) => { event.stopPropagation(); void cancelDownload(job.path); });
    top.append(name, cancel);
    const bar = document.createElement("progress");
    bar.max = 100;
    bar.value = Math.max(0, Math.min(100, Math.round(job.progress?.percent ?? 0)));
    const meta = document.createElement("div");
    meta.className = "download-item-meta";
    const left = document.createElement("span");
    left.textContent = formatProgressDetail(job.progress);
    const right = document.createElement("span");
    right.textContent = formatEta(job.progress);
    meta.append(left, right);
    item.append(top, bar, meta);
    return item;
  }));
}

function formatProgressDetail(progress) {
  if (!progress) return "În așteptare";
  const percent = `${Math.round(progress.percent ?? 0)}%`;
  if (progress.totalBytes) {
    const speed = progress.bytesPerSecond ? ` · ${formatBytes(progress.bytesPerSecond)}/s` : "";
    return `${percent} · ${formatBytes(progress.bytesReceived ?? 0)} / ${formatBytes(progress.totalBytes)}${speed}`;
  }
  return `${percent} · ${progress.message || "Se pregătește…"}`;
}

function formatEta(progress) {
  if (!progress || progress.etaSeconds == null || !Number.isFinite(progress.etaSeconds)) return "ETA —";
  const seconds = Math.max(0, Math.round(progress.etaSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `ETA ${minutes}m ${String(remainder).padStart(2, "0")}s` : `ETA ${remainder}s`;
}

function updateTelemetryMarker() {
  if (state.telemetry.length === 0) return;
  if (state.telemetryRaf) return;
  state.telemetryRaf = requestAnimationFrame(() => {
    state.telemetryRaf = 0;
    if (state.telemetry.length === 0) return;
    const index = currentSampleIndex();
    if (index === state.lastTelemetryIndex) return;
    state.lastTelemetryIndex = index;
    const sample = state.telemetry[index];
    if (!sample) return;
    elements.speed.textContent = Math.round(sample.speedKmh).toString();
    elements.time.textContent = new Date(sample.recordedAt).toLocaleTimeString("ro-RO", { timeZone: "UTC" }) + " UTC";
    elements.altitude.textContent = sample.altitudeMeters == null ? "Altitudine —" : `Altitudine ${sample.altitudeMeters.toFixed(1)} m`;
    drawRoute(index);
  });
}

function currentSampleIndex() {
  if (state.telemetry.length < 2 || !Number.isFinite(elements.video.duration) || elements.video.duration <= 0) return 0;
  return Math.min(state.telemetry.length - 1, Math.round((elements.video.currentTime / elements.video.duration) * (state.telemetry.length - 1)));
}

function drawRoute(activeIndex) {
  const points = state.telemetry; if (points.length === 0) return;
  if (state.mapEnabled) { drawMapRoute(activeIndex); return; }
  const { ctx, width, height } = canvasContext(); const pad = 28;
  const xs = points.map((point) => point.longitude); const ys = points.map((point) => point.latitude);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const project = (point) => ({
    x: pad + ((point.longitude - minX) / (maxX - minX || 1)) * (width - 2 * pad),
    y: height - pad - ((point.latitude - minY) / (maxY - minY || 1)) * (height - 2 * pad),
  });
  drawGrid(ctx, width, height);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(148, 163, 184, .55)"; ctx.beginPath();
  points.forEach((point, index) => { const p = project(point); index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  ctx.strokeStyle = "#14b8a6"; ctx.beginPath();
  points.slice(0, activeIndex + 1).forEach((point, index) => { const p = project(point); index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
  ctx.stroke();

  const start = project(points[0]);
  const end = project(points[points.length - 1]);
  ctx.fillStyle = "rgba(148, 163, 184, .9)";
  ctx.beginPath(); ctx.arc(start.x, start.y, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(end.x, end.y, 4, 0, Math.PI * 2); ctx.fill();

  const marker = project(points[activeIndex] ?? points[0]);
  ctx.beginPath(); ctx.arc(marker.x, marker.y, 12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(20, 184, 166, .18)"; ctx.fill();
  ctx.beginPath(); ctx.arc(marker.x, marker.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#f8fafc"; ctx.fill();
  ctx.strokeStyle = "#0d9488"; ctx.lineWidth = 3; ctx.stroke();
}

function clearFilters() {
  state.sort = "date-desc"; state.camera = "all"; state.duration = "all";
  state.dateFrom = ""; state.dateTo = ""; state.timeFrom = ""; state.timeTo = "";
  state.dateMode = "single"; state.availability = "all"; state.query = "";
  elements.sort.value = state.sort; elements.cameraFilter.value = state.camera; elements.durationFilter.value = state.duration;
  elements.availabilityFilter.value = state.availability; elements.search.value = "";
  elements.dpTimeFrom.value = ""; elements.dpTimeTo.value = "";
  datePicker.mode = "single"; datePicker.draftFrom = ""; datePicker.draftTo = ""; datePicker.pickingEnd = false;
  closeDatePicker();
  syncDatePickerLabel();
  scheduleRenderFiles(false);
}

function isoDay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIsoDay(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDayRo(value) {
  const date = parseIsoDay(value);
  if (!date) return value;
  return `${date.getDate()} ${MONTHS_RO[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

function syncDatePickerLabel() {
  const hasDate = Boolean(state.dateFrom || state.dateTo);
  const hasTime = Boolean(state.timeFrom || state.timeTo);
  let label = "Orice dată";
  if (hasDate) {
    if (state.dateFrom && state.dateTo && state.dateFrom !== state.dateTo) {
      label = `${formatDayRo(state.dateFrom)} – ${formatDayRo(state.dateTo)}`;
    } else {
      label = formatDayRo(state.dateFrom || state.dateTo);
    }
  }
  if (hasTime) {
    const from = state.timeFrom || "00:00";
    const to = state.timeTo || "23:59";
    label = hasDate ? `${label} · ${from}–${to}` : `${from}–${to}`;
  }
  elements.datePickerLabel.textContent = label;
  elements.datePickerTrigger.classList.toggle("active", hasDate || hasTime);
}

function setDateMode(mode) {
  datePicker.mode = mode === "range" ? "range" : "single";
  datePicker.pickingEnd = false;
  if (datePicker.mode === "single" && datePicker.draftFrom) datePicker.draftTo = datePicker.draftFrom;
  document.querySelectorAll(".dp-mode").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === datePicker.mode);
  });
  renderDatePickerCalendar();
}

function openDatePicker() {
  datePicker.open = true;
  datePicker.mode = state.dateFrom && state.dateTo && state.dateFrom !== state.dateTo ? "range" : (state.dateMode || "single");
  datePicker.draftFrom = state.dateFrom || "";
  datePicker.draftTo = state.dateTo || state.dateFrom || "";
  datePicker.pickingEnd = false;
  elements.dpTimeFrom.value = state.timeFrom || "";
  elements.dpTimeTo.value = state.timeTo || "";
  const anchor = parseIsoDay(datePicker.draftFrom || datePicker.draftTo) || new Date();
  datePicker.month = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  elements.datePickerPopup.classList.remove("hidden");
  elements.datePickerTrigger.setAttribute("aria-expanded", "true");
  setDateMode(datePicker.mode);
}

function closeDatePicker() {
  datePicker.open = false;
  elements.datePickerPopup.classList.add("hidden");
  elements.datePickerTrigger.setAttribute("aria-expanded", "false");
}

function applyDatePicker() {
  if (datePicker.mode === "single") {
    state.dateFrom = datePicker.draftFrom || "";
    state.dateTo = datePicker.draftFrom || "";
  } else {
    let from = datePicker.draftFrom || "";
    let to = datePicker.draftTo || datePicker.draftFrom || "";
    if (from && to && from > to) [from, to] = [to, from];
    state.dateFrom = from;
    state.dateTo = to;
  }
  state.timeFrom = elements.dpTimeFrom.value || "";
  state.timeTo = elements.dpTimeTo.value || "";
  state.dateMode = datePicker.mode;
  closeDatePicker();
  syncDatePickerLabel();
  scheduleRenderFiles(false);
}

function clearDatePickerDraft() {
  datePicker.draftFrom = "";
  datePicker.draftTo = "";
  datePicker.pickingEnd = false;
  elements.dpTimeFrom.value = "";
  elements.dpTimeTo.value = "";
  renderDatePickerCalendar();
}

function shiftDatePickerMonth(delta) {
  datePicker.month = new Date(datePicker.month.getFullYear(), datePicker.month.getMonth() + delta, 1);
  renderDatePickerCalendar();
}

function pickCalendarDay(dayIso) {
  if (datePicker.mode === "single") {
    datePicker.draftFrom = dayIso;
    datePicker.draftTo = dayIso;
    datePicker.pickingEnd = false;
  } else if (!datePicker.draftFrom || (datePicker.draftFrom && datePicker.draftTo && !datePicker.pickingEnd)) {
    datePicker.draftFrom = dayIso;
    datePicker.draftTo = "";
    datePicker.pickingEnd = true;
  } else {
    datePicker.draftTo = dayIso;
    if (datePicker.draftFrom > datePicker.draftTo) {
      const tmp = datePicker.draftFrom;
      datePicker.draftFrom = datePicker.draftTo;
      datePicker.draftTo = tmp;
    }
    datePicker.pickingEnd = false;
  }
  renderDatePickerCalendar();
}

function renderDatePickerCalendar() {
  const year = datePicker.month.getFullYear();
  const month = datePicker.month.getMonth();
  elements.dpMonthLabel.textContent = `${MONTHS_RO[month]} ${year}`;
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = isoDay(new Date());
  let from = datePicker.draftFrom;
  let to = datePicker.draftTo || (datePicker.mode === "single" ? datePicker.draftFrom : "");
  if (from && to && from > to) [from, to] = [to, from];

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push('<button type="button" class="dp-day" disabled></button>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = isoDay(new Date(year, month, day));
    const classes = ["dp-day"];
    if (iso === todayIso) classes.push("today");
    if (from && to && iso > from && iso < to) classes.push("in-range");
    if (from && iso === from) classes.push(datePicker.mode === "range" ? "range-start" : "selected");
    if (to && iso === to) classes.push(datePicker.mode === "range" ? "range-end" : "selected");
    if (from && to && from === to && iso === from) classes.push("selected");
    cells.push(`<button type="button" class="${classes.join(" ")}" data-day="${iso}">${day}</button>`);
  }
  elements.dpGrid.innerHTML = cells.join("");
  elements.dpGrid.querySelectorAll(".dp-day[data-day]").forEach((button) => {
    button.addEventListener("click", () => pickCalendarDay(button.dataset.day));
  });
}

function wireDatePicker() {
  elements.datePickerTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (datePicker.open) closeDatePicker();
    else openDatePicker();
  });
  elements.datePickerPopup.addEventListener("click", (event) => event.stopPropagation());
  document.querySelectorAll(".dp-mode").forEach((button) => {
    button.addEventListener("click", () => setDateMode(button.dataset.mode));
  });
  document.querySelectorAll(".dp-preset").forEach((button) => {
    button.addEventListener("click", () => applyDatePreset(button.dataset.preset));
  });
  elements.dpPrev.addEventListener("click", () => shiftDatePickerMonth(-1));
  elements.dpNext.addEventListener("click", () => shiftDatePickerMonth(1));
  elements.dpClear.addEventListener("click", () => {
    clearDatePickerDraft();
    state.dateFrom = ""; state.dateTo = ""; state.timeFrom = ""; state.timeTo = "";
    state.dateMode = datePicker.mode;
    syncDatePickerLabel();
    scheduleRenderFiles(false);
  });
  elements.dpApply.addEventListener("click", applyDatePicker);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && datePicker.open) closeDatePicker();
  });
}

function applyDatePreset(key) {
  const now = new Date();
  const today = isoDay(now);
  if (key === "today") {
    setDateMode("single");
    datePicker.draftFrom = today;
    datePicker.draftTo = today;
  } else if (key === "7d") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    setDateMode("range");
    datePicker.draftFrom = isoDay(from);
    datePicker.draftTo = today;
    datePicker.pickingEnd = false;
  } else if (key === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateMode("range");
    datePicker.draftFrom = isoDay(from);
    datePicker.draftTo = today;
    datePicker.pickingEnd = false;
  } else {
    clearDatePickerDraft();
  }
  const anchor = parseIsoDay(datePicker.draftFrom || datePicker.draftTo) || now;
  datePicker.month = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  document.querySelectorAll(".dp-preset").forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === key);
  });
  renderDatePickerCalendar();
}

function durationMatches(seconds) {
  if (state.duration === "all") return true;
  if (!Number.isFinite(seconds)) return false;
  if (state.duration === "short") return seconds < 60;
  if (state.duration === "medium") return seconds >= 60 && seconds <= 180;
  return seconds > 180;
}

function availabilityMatches(file) {
  if (state.availability === "downloaded") return Boolean(file.locallyAvailable);
  if (state.availability === "remote") return !file.locallyAvailable;
  return true;
}

function dateMatches(file) {
  const hasDateFilter = Boolean(state.dateFrom || state.dateTo);
  const hasTimeFilter = Boolean(state.timeFrom || state.timeTo);
  if (!hasDateFilter && !hasTimeFilter) return true;

  const day = fileDay(file);
  if (!day || day === "unknown") return false;
  if (state.dateFrom && day < state.dateFrom) return false;
  if (state.dateTo && day > state.dateTo) return false;

  if (!hasTimeFilter) return true;
  const minutes = fileTimeMinutes(file);
  if (minutes == null) return false;
  const from = state.timeFrom ? parseTimeMinutes(state.timeFrom) : 0;
  const to = state.timeTo ? parseTimeMinutes(state.timeTo) : (23 * 60 + 59);
  if (from <= to) return minutes >= from && minutes <= to;
  return minutes >= from || minutes <= to;
}

function fileDay(file) {
  const fromRecorded = dateKey(file.recordedAt);
  if (fromRecorded !== "unknown") return fromRecorded;
  return dateKeyFromName(file.name);
}

function dateKeyFromName(name) {
  const match = String(name).match(/(\d{6})-\d{6}/);
  if (!match?.[1]) return "unknown";
  const d = match[1];
  return `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`;
}

function fileTimeMinutes(file) {
  const recorded = String(file.recordedAt ?? "");
  const fromRecorded = recorded.match(/(?:^|[\sT])(\d{2}):(\d{2})(?::\d{2})?/);
  if (fromRecorded) return Number(fromRecorded[1]) * 60 + Number(fromRecorded[2]);
  const fromName = String(file.name ?? "").match(/\d{6}-(\d{6})/);
  if (!fromName?.[1]) return null;
  const t = fromName[1];
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(2, 4));
}

function parseTimeMinutes(value) {
  const match = String(value).match(/^(\d{2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function compareFiles(a, b) {
  const [field, direction] = state.sort.split("-"); const multiplier = direction === "asc" ? 1 : -1;
  let left; let right;
  if (field === "date") { left = timestamp(a.recordedAt); right = timestamp(b.recordedAt); }
  else if (field === "time") { left = timeOfDay(a.recordedAt); right = timeOfDay(b.recordedAt); }
  else if (field === "duration") { left = a.durationSeconds ?? -1; right = b.durationSeconds ?? -1; }
  else if (field === "size") { left = a.sizeBytes; right = b.sizeBytes; }
  else return multiplier * a.name.localeCompare(b.name, "ro");
  return multiplier * (left - right) || b.name.localeCompare(a.name, "ro");
}

function orderWithinDateGroups(files) {
  const groups = new Map();
  for (const file of files) {
    const key = fileDay(file);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(file);
  }
  const ascendingDates = state.sort === "date-asc";
  const keys = [...groups.keys()].sort((a, b) => {
    if (a === "unknown") return 1; if (b === "unknown") return -1;
    return (ascendingDates ? 1 : -1) * a.localeCompare(b);
  });
  return keys.flatMap((key) => groups.get(key).sort(compareFiles));
}

function dateKey(value) { return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "unknown"; }
function dateSeparator(key) {
  const separator = document.createElement("h3");
  separator.className = "date-separator";
  separator.dataset.date = key;
  if (key === state.stickyDateKey) separator.classList.add("date-separator--covered");
  if (key === "unknown") separator.textContent = "Dată necunoscută";
  else separator.textContent = formatStickyDate(key);
  return separator;
}

function timestamp(value) { const parsed = new Date(value.replace(" ", "T")).valueOf(); return Number.isNaN(parsed) ? 0 : parsed; }
function timeOfDay(value) { const match = value.match(/(\d{2}):(\d{2}):(\d{2})/); return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0; }

function showProgress(progress) {
  const percent = Math.max(0, Math.min(100, Math.round(progress.percent ?? 0)));
  elements.progress.classList.remove("hidden"); elements.progressBar.value = percent;
  elements.progressPercent.textContent = `${percent}%`; elements.progressLabel.textContent = progress.message || "Se pregătește…";
  const parts = [];
  if (progress.totalBytes) parts.push(`${formatBytes(progress.bytesReceived ?? 0)} / ${formatBytes(progress.totalBytes)}`);
  if (progress.bytesPerSecond) parts.push(`${formatBytes(progress.bytesPerSecond)}/s`);
  if (progress.etaSeconds != null && Number.isFinite(progress.etaSeconds)) parts.push(formatEta(progress).replace("ETA ", "rămân "));
  elements.progressDetail.textContent = parts.join(" · ");
  const job = state.selectedPath ? state.downloadJobs.get(state.selectedPath) : undefined;
  const active = Boolean(job && (job.status === "queued" || job.status === "running" || job.status === "cancelling"));
  elements.prepareCancel.disabled = !active || job?.status === "cancelling";
  elements.prepareCancel.textContent = job?.status === "cancelling" ? "…" : "Anulează";
}

function toggleMap() {
  state.mapEnabled = !state.mapEnabled;
  elements.canvas.classList.toggle("hidden", state.mapEnabled);
  elements.map.classList.toggle("hidden", !state.mapEnabled);
  elements.mapControls.classList.toggle("hidden", !state.mapEnabled);
  elements.mapToggle.textContent = state.mapEnabled ? "Hartă schematică" : "Activează harta online";
  elements.mapPrivacy.textContent = state.mapEnabled
    ? "Hartă © OpenStreetMap contributors. Coordonatele zonei sunt solicitate numai cât timp harta online este activă."
    : "Harta schematică este complet locală. Harta online trimite coordonatele zonei către serverele OpenStreetMap numai după activare.";
  if (state.mapEnabled) {
    state.mapFollow = true;
    ensureMap();
    drawMapRoute(currentSampleIndex());
    setTimeout(() => {
      state.map?.invalidateSize();
      if (state.mapHasFit) recenterMapOnPin(false);
    }, 0);
  } else drawRoute(currentSampleIndex());
}

function ensureMap() {
  if (state.map || !window.L) return;
  state.map = window.L.map(elements.map, {
    preferCanvas: true,
    zoomControl: true,
    attributionControl: true,
  });
  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
  }).addTo(state.map);
  state.map.on("dragstart zoomstart", () => { state.mapFollow = false; });
}

function drawMapRoute(activeIndex) {
  if (!state.map || state.telemetry.length === 0) return;
  const latLngs = state.telemetry.map((point) => [point.latitude, point.longitude]);
  const current = latLngs[activeIndex] ?? latLngs[0];

  if (!state.mapRoute) {
    state.mapRoute = window.L.polyline(latLngs, { color: "#5b7c8a", weight: 5, opacity: .85 }).addTo(state.map);
  } else {
    state.mapRoute.setLatLngs(latLngs);
  }

  if (!state.mapProgress) {
    state.mapProgress = window.L.polyline(latLngs.slice(0, activeIndex + 1), { color: "#0d9488", weight: 5 }).addTo(state.map);
  } else {
    state.mapProgress.setLatLngs(latLngs.slice(0, activeIndex + 1));
  }

  if (!state.mapMarker) {
    state.mapMarker = window.L.circleMarker(current, {
      radius: 8, color: "#0d9488", weight: 4, fillColor: "#f8fafc", fillOpacity: 1,
    }).addTo(state.map);
  } else {
    state.mapMarker.setLatLng(current);
  }

  if (!state.mapHasFit) {
    fitMapToRoute();
    state.mapHasFit = true;
    return;
  }

  if (state.mapFollow && !elements.video.paused && !elements.video.ended) {
    state.map.setView(current, state.map.getZoom(), { animate: false });
  }
}

function recenterMapOnPin(animate = true) {
  if (!state.map || state.telemetry.length === 0) return;
  state.mapFollow = true;
  const sample = state.telemetry[currentSampleIndex()] ?? state.telemetry[0];
  if (!sample) return;
  const target = window.L.latLng(sample.latitude, sample.longitude);
  if (animate) state.map.panTo(target, { animate: true, duration: 0.35 });
  else state.map.setView(target, Math.max(state.map.getZoom(), 15), { animate: false });
}

function fitMapToRoute() {
  if (!state.map || !state.mapRoute) return;
  const bounds = state.mapRoute.getBounds();
  if (!bounds.isValid()) return;
  state.map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17, animate: true });
}

function drawEmptyRoute(message) {
  const { ctx, width, height } = canvasContext();
  drawGrid(ctx, width, height);
  ctx.fillStyle = "rgba(148, 163, 184, .9)";
  ctx.font = "500 13px \"Source Sans 3\", sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(message, width / 2, height / 2);
}
function drawGrid(ctx, width, height) {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  ctx.fillStyle = dark ? "#0f1720" : "#e8eef3";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = dark ? "rgba(248,250,252,.06)" : "rgba(15,23,32,.06)";
  ctx.lineWidth = 1;
  for (let x = 20; x < width; x += 42) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 20; y < height; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
}
function canvasContext() { const scale = devicePixelRatio || 1; const rect = elements.canvas.getBoundingClientRect(); elements.canvas.width = Math.max(1, Math.round(rect.width * scale)); elements.canvas.height = Math.max(1, Math.round(rect.height * scale)); const ctx = elements.canvas.getContext("2d"); ctx.scale(scale, scale); return { ctx, width: rect.width, height: rect.height }; }

async function api(path, options) { const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options }); const value = await response.json(); if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`); return value; }
function setStatus(message, error = false) {
  if (elements.statusText) elements.statusText.textContent = message;
  else elements.status.textContent = message;
  elements.status.classList.toggle("hidden", message === "");
  elements.status.style.color = error ? "var(--danger)" : "";
  elements.statusRetry?.classList.toggle("hidden", !error);
}

function toggleFavorite(path) {
  if (state.favorites.has(path)) state.favorites.delete(path);
  else state.favorites.add(path);
  saveFavorites();
  if (state.category === "favorites") scheduleRenderFiles(false);
}

function toggleSelectMode() {
  if (state.selectMode) exitSelectMode();
  else enterSelectMode();
}

function enterSelectMode() {
  state.selectMode = true;
  document.body.classList.add("select-mode");
  elements.selectModeToggle?.setAttribute("aria-pressed", "true");
  syncBulkBar();
  scheduleRenderFiles(false);
}

function exitSelectMode() {
  state.selectMode = false;
  document.body.classList.remove("select-mode");
  elements.selectModeToggle?.setAttribute("aria-pressed", "false");
  clearSelection();
  scheduleRenderFiles(false);
}

function toggleSelection(path, selected) {
  if (selected) state.selection.add(path);
  else state.selection.delete(path);
  syncBulkBar();
  const row = elements.list.querySelector(`.file-row[data-path="${CSS.escape(path)}"]`);
  const check = row?.querySelector(".file-check");
  if (check) check.checked = selected;
}

function clearSelection() {
  state.selection.clear();
  syncBulkBar();
  elements.list.querySelectorAll(".file-check").forEach((check) => { check.checked = false; });
}

function syncBulkBar() {
  const count = state.selection.size;
  elements.bulkBar?.classList.toggle("hidden", !state.selectMode);
  if (!state.selectMode) return;

  if (elements.bulkCount) elements.bulkCount.textContent = String(count);

  const selected = count > 0
    ? state.files.filter((file) => state.selection.has(file.path))
    : [];
  const canDownload = selected.some((file) => !file.locallyAvailable && !String(file.path).startsWith("/local/"));
  const canDeleteLocal = selected.some((file) => Boolean(file.locallyAvailable && file.localName));
  const canDeleteCamera = state.cameraCaps.mutateAllowed
    && selected.some((file) => !String(file.path).startsWith("/local/"));

  elements.bulkDownload?.classList.toggle("hidden", !canDownload);
  elements.bulkDeleteCamera?.classList.toggle("hidden", !canDeleteCamera);
  elements.bulkDeleteLocal?.classList.toggle("hidden", !canDeleteLocal);
  elements.bulkClear?.classList.toggle("hidden", count === 0);
  elements.bulkBar?.classList.toggle("has-selection", count > 0);
}

function selectAllFiltered() {
  for (const file of state.visibleFiles) state.selection.add(file.path);
  syncBulkBar();
  scheduleRenderFiles(false);
}

async function bulkDownloadSelected() {
  const files = state.files.filter((file) => state.selection.has(file.path) && !file.locallyAvailable && !String(file.path).startsWith("/local/"));
  if (files.length === 0) {
    showToast("Nimic de descărcat din selecție", "err");
    return;
  }
  showToast(`Se adaugă ${files.length} descărcări…`, "ok");
  for (const file of files) void queueDownload(file);
}

function localNamesForFile(file) {
  const names = [];
  if (file.localName) names.push(file.localName);
  if (file.localTelemetryName) names.push(file.localTelemetryName);
  if (file.localName) {
    const stem = file.localName.replace(/-AAC(?=\.[^.]+$)/i, "").replace(/\.[^.]+$/u, "");
    const aac = `${stem}-AAC.MP4`;
    const raw = `${stem}.MP4`;
    if (!names.includes(aac)) names.push(aac);
    if (!names.includes(raw)) names.push(raw);
    const nmea = `${stem}.NMEA`;
    if (!names.includes(nmea)) names.push(nmea);
  }
  return [...new Set(names)];
}

async function deleteLocalForFile(file) {
  const names = localNamesForFile(file);
  if (names.length === 0) return;
  if (!window.confirm(`Ștergi copia locală pentru ${file.name}?`)) return;
  try {
    await api("/api/local", { method: "DELETE", body: JSON.stringify({ names }) });
    file.locallyAvailable = false;
    delete file.localName;
    delete file.localTelemetryName;
    showToast(`Șters local: ${file.name}`, "ok");
    if (state.selectedPath === file.path) {
      elements.video.removeAttribute("src");
      elements.video.load();
      elements.gpsState.textContent = "Nedescărcat";
      drawEmptyRoute("Fișier disponibil pe cameră");
    }
    renderFiles();
    void refreshStorageStats();
  } catch (error) {
    showToast(error.message, "err");
  }
}

async function bulkDeleteLocalSelected() {
  const files = state.files.filter((file) => state.selection.has(file.path) && file.locallyAvailable);
  if (files.length === 0) {
    showToast("Nicio copie locală în selecție", "err");
    return;
  }
  if (!window.confirm(`Ștergi ${files.length} copii locale?`)) return;
  const names = files.flatMap((file) => localNamesForFile(file));
  try {
    await api("/api/local", { method: "DELETE", body: JSON.stringify({ names: [...new Set(names)] }) });
    for (const file of files) {
      file.locallyAvailable = false;
      delete file.localName;
      delete file.localTelemetryName;
    }
    showToast(`Șterse ${files.length} copii locale`, "ok");
    clearSelection();
    renderFiles();
    void refreshStorageStats();
  } catch (error) {
    showToast(error.message, "err");
  }
}

async function bulkDeleteCameraSelected() {
  const files = state.files.filter((file) => state.selection.has(file.path) && !String(file.path).startsWith("/local/"));
  if (files.length === 0) {
    showToast("Niciun fișier de pe cameră în selecție", "err");
    return;
  }
  if (!state.cameraCaps.mutateAllowed) {
    showToast("Mutate dezactivat pe server (MIVUE_ALLOW_MUTATE=1)", "err");
    return;
  }
  if (!window.confirm(`Ștergi ${files.length} fișier(e) de pe cardul camerei? Acțiunea e ireversibilă.`)) return;
  if (files.length > 1) {
    const typed = window.prompt(`Tastează STERGE pentru a confirma ștergerea a ${files.length} fișiere:`);
    if (typed !== "STERGE") {
      showToast("Ștergerea a fost anulată", "err");
      return;
    }
  }
  try {
    const result = await api("/api/camera/delete", {
      method: "POST",
      body: JSON.stringify({ paths: files.map((file) => file.path) }),
    });
    const ok = (result.results || []).filter((item) => item.ok).length;
    const fail = (result.results || []).length - ok;
    showToast(fail === 0 ? `Șterse de pe cameră: ${ok}` : `Șterse ${ok}, eșuate ${fail}`, fail ? "err" : "ok");
    clearSelection();
    await loadDashboard(true);
  } catch (error) {
    showToast(error.message, "err");
  }
}

async function refreshCameraAdmin() {
  try {
    const caps = await api("/api/camera/capabilities");
    state.cameraCaps = {
      mutateAllowed: Boolean(caps.mutateAllowed),
      setProperties: Array.isArray(caps.setProperties) ? caps.setProperties : [],
      setPropertyValues: caps.setPropertyValues && typeof caps.setPropertyValues === "object"
        ? caps.setPropertyValues
        : {},
    };
  } catch {
    state.cameraCaps = { mutateAllowed: false, setProperties: [], setPropertyValues: {} };
  }

  let props = {};
  try {
    const info = await api("/api/info");
    props = info.properties || {};
  } catch {
    props = {};
  }

  if (elements.cameraMutateStatus) {
    elements.cameraMutateStatus.textContent = state.cameraCaps.mutateAllowed ? "Activat" : "Oprit";
  }
  if (elements.cameraUiMode) {
    elements.cameraUiMode.textContent = props["Camera.Menu.UIMode"] || "—";
  }
  if (elements.cameraBroadcast) {
    elements.cameraBroadcast.textContent = props.broadcast || "—";
  }
  if (elements.cameraCamid) {
    elements.cameraCamid.textContent = props["Camera.Preview.Source.1.Camid"] || "—";
  }

  const settable = state.cameraCaps.setProperties;
  const canSet = state.cameraCaps.mutateAllowed && settable.length > 0;
  elements.cameraSetEmpty?.classList.toggle("hidden", canSet);
  elements.cameraSetControls?.classList.toggle("hidden", !canSet);
  if (elements.cameraSetControls && canSet) {
    elements.cameraSetControls.replaceChildren();
    for (const property of settable) {
      const row = document.createElement("div");
      row.className = "camera-set-row";
      const label = document.createElement("label");
      label.textContent = property;
      const known = state.cameraCaps.setPropertyValues?.[property];
      let control;
      if (Array.isArray(known) && known.length > 0) {
        control = document.createElement("select");
        for (const optionValue of known) {
          const option = document.createElement("option");
          option.value = optionValue;
          option.textContent = optionValue;
          if (optionValue === (props[property] || known[0])) option.selected = true;
          control.append(option);
        }
      } else {
        control = document.createElement("input");
        control.type = "text";
        control.placeholder = "valoare";
        control.value = props[property] || "";
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "settings-btn";
      button.textContent = "Aplică";
      button.addEventListener("click", () => {
        void applyCameraSet(property, control.value);
      });
      row.append(label, control, button);
      elements.cameraSetControls.append(row);
    }
  }
  syncBulkBar();
}

async function applyCameraSet(property, value) {
  if (!value.trim()) {
    showToast("Completează valoarea", "err");
    return;
  }
  if (!window.confirm(`Setezi ${property}=${value} pe cameră?`)) return;
  try {
    await api("/api/camera/set", { method: "POST", body: JSON.stringify({ property, value }) });
    showToast(`Setat ${property}`, "ok");
    void refreshCameraAdmin();
  } catch (error) {
    showToast(error.message, "err");
  }
}

async function refreshStorageStats() {
  if (!elements.storageFileCount) return;
  try {
    const summary = await api("/api/storage");
    elements.storageFileCount.textContent = String(summary.fileCount);
    elements.storageTotalBytes.textContent = formatBytes(summary.totalBytes);
  } catch (error) {
    elements.storageFileCount.textContent = "—";
    elements.storageTotalBytes.textContent = "—";
  }
  refreshCameraSdStats();
}

function refreshCameraSdStats() {
  if (!elements.sdTotalBytes) return;
  const bytes = { normal: 0, parking: 0, event: 0, photo: 0 };
  let total = 0;
  for (const file of state.files) {
    if (String(file.path).startsWith("/local/")) continue;
    const size = Number(file.sizeBytes) || 0;
    total += size;
    if (file.category in bytes) bytes[file.category] += size;
  }
  elements.sdTotalBytes.textContent = total > 0 ? formatBytes(total) : "—";
  setSdCategory("normal", bytes.normal, total);
  setSdCategory("parking", bytes.parking, total);
  setSdCategory("event", bytes.event, total);
  setSdCategory("photo", bytes.photo, total);
}

function setSdCategory(category, value, total) {
  const label = elements[`sd${category[0].toUpperCase()}${category.slice(1)}Bytes`];
  const bar = elements[`sd${category[0].toUpperCase()}${category.slice(1)}Bar`];
  if (label) label.textContent = value > 0 ? formatBytes(value) : "0 B";
  if (bar) bar.style.width = `${total > 0 ? Math.max((value / total) * 100, value > 0 ? 2 : 0) : 0}%`;
}

function formatBytes(bytes) { const units = ["B", "KB", "MB", "GB"]; let value = bytes, index = 0; while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; } return `${value.toFixed(index ? 1 : 0)} ${units[index]}`; }
function formatDuration(seconds) { if (!Number.isFinite(seconds)) return "—"; const minutes = Math.floor(seconds / 60); return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`; }
function formatDate(value) { const date = new Date(value.replace(" ", "T")); return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" }); }

setView("library");
setCategory("all");
loadDashboard();
