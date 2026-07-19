const state = {
  files: [], category: "all", query: "", telemetry: [], selectedPath: null,
  sort: "date-desc", camera: "all", duration: "all", dateFrom: "", mapEnabled: false,
  map: null, mapRoute: null, mapProgress: null, mapMarker: null, mapHasFit: false,
  downloadJobs: new Map(),
};
const $ = (selector) => document.querySelector(selector);

const elements = {
  dot: $("#connectionDot"), connection: $("#connectionText"), total: $("#totalCount"), parking: $("#parkingCount"), ip: $("#cameraIp"),
  list: $("#fileList"), status: $("#statusMessage"), search: $("#searchInput"), refresh: $("#refreshButton"),
  sort: $("#sortSelect"), cameraFilter: $("#cameraSelect"), durationFilter: $("#durationSelect"), dateFrom: $("#dateFrom"), clearFilters: $("#clearFilters"), resultCount: $("#resultCount"),
  empty: $("#emptyViewer"), active: $("#activeViewer"), video: $("#videoPlayer"), viewerName: $("#viewerName"), badge: $("#viewerBadge"),
  notice: $("#viewerNotice"), canvas: $("#routeCanvas"), gpsState: $("#gpsState"), speed: $("#speedValue"), time: $("#telemetryTime"), altitude: $("#telemetryAltitude"),
  progress: $("#prepareProgress"), progressBar: $("#progressBar"), progressLabel: $("#progressLabel"), progressPercent: $("#progressPercent"), progressDetail: $("#progressDetail"),
  map: $("#realMap"), mapToggle: $("#mapToggle"), mapPrivacy: $("#mapPrivacy"),
};

document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  button.classList.add("active"); state.category = button.dataset.category; renderFiles();
}));
elements.search.addEventListener("input", () => { state.query = elements.search.value.toLowerCase(); renderFiles(); });
elements.sort.addEventListener("change", () => { state.sort = elements.sort.value; renderFiles(); });
elements.cameraFilter.addEventListener("change", () => { state.camera = elements.cameraFilter.value; renderFiles(); });
elements.durationFilter.addEventListener("change", () => { state.duration = elements.durationFilter.value; renderFiles(); });
elements.dateFrom.addEventListener("change", () => { state.dateFrom = elements.dateFrom.value; renderFiles(); });
elements.clearFilters.addEventListener("click", clearFilters);
elements.mapToggle.addEventListener("click", toggleMap);
elements.refresh.addEventListener("click", loadDashboard);
elements.video.addEventListener("timeupdate", updateTelemetryMarker);
window.addEventListener("resize", () => { if (state.mapEnabled) state.map?.invalidateSize(); else drawRoute(currentSampleIndex()); });

async function loadDashboard() {
  setStatus("Se citesc camera și înregistrările…");
  try {
    // Serverul AIT vechi răspunde intermitent cu 404 la cereri CGI concurente.
    const info = await api("/api/info");
    const listing = await api("/api/files");
    state.files = listing.files;
    elements.total.textContent = String(listing.amount);
    elements.parking.textContent = String(state.files.filter((file) => file.category === "parking").length);
    elements.ip.textContent = info.endpoint.host;
    elements.dot.classList.add("online"); elements.connection.textContent = "Camera conectată";
    setStatus(""); renderFiles();
  } catch (error) {
    elements.dot.classList.remove("online"); elements.connection.textContent = "Camera indisponibilă";
    setStatus(error.message, true);
  }
}

function renderFiles() {
  const visible = state.files.filter((file) =>
    (state.category === "all" || file.category === state.category) &&
    (state.camera === "all" || file.camera === state.camera) &&
    durationMatches(file.durationSeconds) &&
    (!state.dateFrom || file.recordedAt.slice(0, 10) >= state.dateFrom) &&
    (`${file.name} ${file.recordedAt}`.toLowerCase().includes(state.query))
  );
  const ordered = orderWithinDateGroups(visible);
  const nodes = []; let previousDate = null;
  for (const file of ordered) {
    const date = dateKey(file.recordedAt);
    if (date !== previousDate) { nodes.push(dateSeparator(date)); previousDate = date; }
    nodes.push(fileRow(file));
  }
  elements.list.replaceChildren(...nodes);
  elements.resultCount.textContent = `${visible.length} din ${state.files.length} fișiere`;
  elements.status.classList.toggle("hidden", visible.length > 0);
  if (visible.length === 0) setStatus("Nu există înregistrări pentru filtrul ales.");
}

function fileRow(file) {
  const row = document.createElement("article");
  row.className = `file-row${state.selectedPath === file.path ? " selected" : ""}`;
  row.tabIndex = 0;
  const icon = document.createElement("div"); icon.className = "file-icon";
  const placeholder = document.createElement("span"); placeholder.textContent = file.category === "photo" ? "▧" : "▶"; icon.append(placeholder);
  const thumbnail = document.createElement("img"); thumbnail.className = "file-thumbnail"; thumbnail.loading = "lazy";
  thumbnail.alt = ""; thumbnail.src = `/api/thumbnail?path=${encodeURIComponent(file.path)}`;
  thumbnail.addEventListener("load", () => placeholder.classList.add("hidden"));
  thumbnail.addEventListener("error", () => thumbnail.remove()); icon.append(thumbnail);
  const main = document.createElement("div"); main.className = "file-main";
  const title = document.createElement("strong"); title.textContent = file.name;
  const date = document.createElement("span"); date.textContent = formatDate(file.recordedAt);
  const category = document.createElement("i"); category.className = "category-pill"; category.textContent = file.category;
  main.append(title, date, category);
  const meta = document.createElement("div"); meta.className = "file-meta";
  const details = document.createElement("span"); details.innerHTML = `${formatDuration(file.durationSeconds)}<br>${formatBytes(file.sizeBytes)}`;
  const download = document.createElement("button"); download.className = "download-button"; download.type = "button"; download.dataset.path = file.path;
  updateDownloadButton(download, file, state.downloadJobs.get(file.path));
  download.addEventListener("click", (event) => { event.stopPropagation(); void queueDownload(file); });
  meta.append(details, download);
  row.append(icon, main, meta);
  row.addEventListener("click", () => selectFile(file, row));
  row.addEventListener("keydown", (event) => { if (event.target === row && (event.key === "Enter" || event.key === " ")) selectFile(file, row); });
  return row;
}

function selectFile(file, row) {
  document.querySelectorAll(".file-row").forEach((item) => item.classList.remove("selected")); row.classList.add("selected");
  state.selectedPath = file.path; state.telemetry = []; state.mapHasFit = false;
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
  const existing = state.downloadJobs.get(file.path);
  if (file.locallyAvailable || (existing && existing.status !== "error")) return;
  if (existing?.status === "error") state.downloadJobs.delete(file.path);
  const jobState = { status: "queued", progress: { percent: 0, message: "Se adaugă în coadă…" } };
  state.downloadJobs.set(file.path, jobState); updateDownloadControls(file);
  if (state.selectedPath === file.path) {
    elements.notice.classList.add("hidden"); elements.gpsState.textContent = "În coada de descărcare"; showProgress(jobState.progress);
  }
  try {
    const started = await api("/api/prepare", { method: "POST", body: JSON.stringify({ remotePath: file.path }) });
    jobState.jobId = started.jobId;
    await trackDownload(file, jobState);
  } catch (error) {
    jobState.status = "error"; jobState.error = error.message; updateDownloadControls(file);
    if (state.selectedPath === file.path) {
      elements.progress.classList.add("hidden"); elements.notice.textContent = error.message; elements.notice.classList.remove("hidden");
    }
  }
}

async function trackDownload(file, jobState) {
  for (;;) {
    const job = await api(`/api/jobs/${encodeURIComponent(jobState.jobId)}`);
    jobState.status = job.status; jobState.progress = job.progress; updateDownloadControls(file);
    if (state.selectedPath === file.path && job.progress) showProgress(job.progress);
    if (job.status === "complete") {
      file.locallyAvailable = true; file.localName = job.result.playableName;
      if (job.result.nmeaName) file.localTelemetryName = job.result.nmeaName;
      state.downloadJobs.delete(file.path); renderFiles();
      if (state.selectedPath === file.path) { elements.progress.classList.add("hidden"); await loadPrepared(file, job.result); }
      return;
    }
    if (job.status === "error") throw new Error(job.error);
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
  document.querySelectorAll(".download-button").forEach((button) => {
    if (button.dataset.path === file.path) updateDownloadButton(button, file, state.downloadJobs.get(file.path));
  });
}

function updateDownloadButton(button, file, job) {
  button.disabled = file.locallyAvailable || (job && job.status !== "error");
  button.classList.toggle("downloaded", file.locallyAvailable);
  if (file.locallyAvailable) button.textContent = "Descărcat";
  else if (job?.status === "queued") button.textContent = job.progress?.message?.includes("poziția") ? job.progress.message.replace("În coadă · ", "") : "În coadă";
  else if (job?.status === "running") button.textContent = `${Math.round(job.progress?.percent ?? 0)}%`;
  else if (job?.status === "error") { button.textContent = "Reîncearcă"; button.disabled = false; }
  else button.textContent = "Descarcă";
}

function updateTelemetryMarker() {
  if (state.telemetry.length === 0) return;
  const index = currentSampleIndex(); const sample = state.telemetry[index]; if (!sample) return;
  elements.speed.textContent = Math.round(sample.speedKmh).toString();
  elements.time.textContent = new Date(sample.recordedAt).toLocaleTimeString("ro-RO", { timeZone: "UTC" }) + " UTC";
  elements.altitude.textContent = sample.altitudeMeters == null ? "Altitudine —" : `Altitudine ${sample.altitudeMeters.toFixed(1)} m`;
  drawRoute(index);
}

function currentSampleIndex() {
  if (state.telemetry.length < 2 || !Number.isFinite(elements.video.duration) || elements.video.duration <= 0) return 0;
  return Math.min(state.telemetry.length - 1, Math.round((elements.video.currentTime / elements.video.duration) * (state.telemetry.length - 1)));
}

function drawRoute(activeIndex) {
  const points = state.telemetry; if (points.length === 0) return;
  if (state.mapEnabled) { drawMapRoute(activeIndex); return; }
  const { ctx, width, height } = canvasContext(); const pad = 34;
  const xs = points.map((point) => point.longitude); const ys = points.map((point) => point.latitude);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const project = (point) => ({ x: pad + ((point.longitude - minX) / (maxX - minX || 1)) * (width - 2 * pad), y: height - pad - ((point.latitude - minY) / (maxY - minY || 1)) * (height - 2 * pad) });
  drawGrid(ctx, width, height); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = "#4b7b73"; ctx.beginPath();
  points.forEach((point, index) => { const p = project(point); index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }); ctx.stroke();
  ctx.strokeStyle = "#f47b57"; ctx.beginPath(); points.slice(0, activeIndex + 1).forEach((point, index) => { const p = project(point); index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }); ctx.stroke();
  const marker = project(points[activeIndex] ?? points[0]); ctx.fillStyle = "#fffdf8"; ctx.beginPath(); ctx.arc(marker.x, marker.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#f47b57"; ctx.lineWidth = 4; ctx.stroke();
}

function clearFilters() {
  state.sort = "date-desc"; state.camera = "all"; state.duration = "all"; state.dateFrom = ""; state.query = "";
  elements.sort.value = state.sort; elements.cameraFilter.value = state.camera; elements.durationFilter.value = state.duration;
  elements.dateFrom.value = ""; elements.search.value = ""; renderFiles();
}

function durationMatches(seconds) {
  if (state.duration === "all") return true;
  if (!Number.isFinite(seconds)) return false;
  if (state.duration === "short") return seconds < 60;
  if (state.duration === "medium") return seconds >= 60 && seconds <= 180;
  return seconds > 180;
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
  for (const file of files) { const key = dateKey(file.recordedAt); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(file); }
  const ascendingDates = state.sort === "date-asc";
  const keys = [...groups.keys()].sort((a, b) => {
    if (a === "unknown") return 1; if (b === "unknown") return -1;
    return (ascendingDates ? 1 : -1) * a.localeCompare(b);
  });
  return keys.flatMap((key) => groups.get(key).sort(compareFiles));
}

function dateKey(value) { return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "unknown"; }
function dateSeparator(key) {
  const separator = document.createElement("h3"); separator.className = "date-separator";
  if (key === "unknown") separator.textContent = "Dată necunoscută";
  else separator.textContent = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${key}T12:00:00`));
  return separator;
}

function timestamp(value) { const parsed = new Date(value.replace(" ", "T")).valueOf(); return Number.isNaN(parsed) ? 0 : parsed; }
function timeOfDay(value) { const match = value.match(/(\d{2}):(\d{2}):(\d{2})/); return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0; }

function showProgress(progress) {
  const percent = Math.max(0, Math.min(100, Math.round(progress.percent ?? 0)));
  elements.progress.classList.remove("hidden"); elements.progressBar.value = percent;
  elements.progressPercent.textContent = `${percent}%`; elements.progressLabel.textContent = progress.message || "Se pregătește…";
  elements.progressDetail.textContent = progress.totalBytes ? `${formatBytes(progress.bytesReceived ?? 0)} / ${formatBytes(progress.totalBytes)}` : "";
}

function toggleMap() {
  state.mapEnabled = !state.mapEnabled;
  elements.canvas.classList.toggle("hidden", state.mapEnabled); elements.map.classList.toggle("hidden", !state.mapEnabled);
  elements.mapToggle.textContent = state.mapEnabled ? "Hartă schematică" : "Activează harta online";
  elements.mapPrivacy.textContent = state.mapEnabled ? "Hartă © OpenStreetMap contributors. Coordonatele zonei sunt solicitate numai cât timp harta online este activă." : "Harta schematică este complet locală. Harta online trimite coordonatele zonei către serverele OpenStreetMap numai după activare.";
  if (state.mapEnabled) { ensureMap(); drawMapRoute(currentSampleIndex()); setTimeout(() => state.map?.invalidateSize(), 0); }
  else drawRoute(currentSampleIndex());
}

function ensureMap() {
  if (state.map || !window.L) return;
  state.map = window.L.map(elements.map, { preferCanvas: true });
  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
  }).addTo(state.map);
}

function drawMapRoute(activeIndex) {
  if (!state.map || state.telemetry.length === 0) return;
  const latLngs = state.telemetry.map((point) => [point.latitude, point.longitude]);
  state.mapRoute?.remove(); state.mapProgress?.remove(); state.mapMarker?.remove();
  state.mapRoute = window.L.polyline(latLngs, { color: "#4b7b73", weight: 5, opacity: .85 }).addTo(state.map);
  state.mapProgress = window.L.polyline(latLngs.slice(0, activeIndex + 1), { color: "#f47b57", weight: 5 }).addTo(state.map);
  state.mapMarker = window.L.circleMarker(latLngs[activeIndex] ?? latLngs[0], { radius: 8, color: "#f47b57", weight: 4, fillColor: "#fffdf8", fillOpacity: 1 }).addTo(state.map);
  if (!state.mapHasFit) { state.map.fitBounds(state.mapRoute.getBounds(), { padding: [20, 20] }); state.mapHasFit = true; }
}

function drawEmptyRoute(message) { const { ctx, width, height } = canvasContext(); drawGrid(ctx, width, height); ctx.fillStyle = "#8ba19d"; ctx.font = "14px system-ui"; ctx.textAlign = "center"; ctx.fillText(message, width / 2, height / 2); }
function drawGrid(ctx, width, height) { ctx.fillStyle = "#102b2b"; ctx.fillRect(0, 0, width, height); ctx.strokeStyle = "rgba(255,255,255,.055)"; ctx.lineWidth = 1; for (let x = 20; x < width; x += 42) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); } for (let y = 20; y < height; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); } }
function canvasContext() { const scale = devicePixelRatio || 1; const rect = elements.canvas.getBoundingClientRect(); elements.canvas.width = Math.max(1, Math.round(rect.width * scale)); elements.canvas.height = Math.max(1, Math.round(rect.height * scale)); const ctx = elements.canvas.getContext("2d"); ctx.scale(scale, scale); return { ctx, width: rect.width, height: rect.height }; }

async function api(path, options) { const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options }); const value = await response.json(); if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`); return value; }
function setStatus(message, error = false) { elements.status.textContent = message; elements.status.classList.toggle("hidden", message === ""); elements.status.style.color = error ? "#a94332" : ""; }
function formatBytes(bytes) { const units = ["B", "KB", "MB", "GB"]; let value = bytes, index = 0; while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; } return `${value.toFixed(index ? 1 : 0)} ${units[index]}`; }
function formatDuration(seconds) { if (!Number.isFinite(seconds)) return "—"; const minutes = Math.floor(seconds / 60); return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`; }
function formatDate(value) { const date = new Date(value.replace(" ", "T")); return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" }); }
loadDashboard();
