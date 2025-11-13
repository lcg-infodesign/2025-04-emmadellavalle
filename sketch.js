// === Variabili globali ===
let table;
let volcanoes = [];
let worldImg;

const MAP_FILE = "mondoesteso6.png";
const CSV_FILE = "volcanoes-2025-10-27 - Es.3 - Original Data.csv";

let cnv;
let wrapper;
let tooltipDiv;

// === preload() ===
function preload() {
  table = loadTable(CSV_FILE, "csv", "header");
  worldImg = loadImage(
    MAP_FILE,
    () => console.log("Mappa caricata"),
    () => console.error("Errore caricamento mappa")
  );
}

// === setup() ===
function setup() {
  wrapper = document.getElementById("canvas-wrapper");
  createResponsiveCanvas();

  noStroke();
  textFont("Poppins");
  loadVolcanoData();

  tooltipDiv = document.getElementById("tooltip");

  cnv.elt.addEventListener("mousemove", onMouseMove);
  cnv.elt.addEventListener("mouseleave", () => hideTooltip());
  window.addEventListener("resize", () => {
    createResponsiveCanvas();
    redrawAll();
  });

  // click → apre slide
  cnv.elt.addEventListener("click", onCanvasClick);

  redrawAll();
}

// === createResponsiveCanvas() ===
function createResponsiveCanvas() {
  const wrapperW = Math.max(200, wrapper.clientWidth);
  const imgRatio = worldImg.width / worldImg.height;
  const desiredW = wrapperW;
  const desiredH = Math.round(desiredW / imgRatio);

  if (cnv) resizeCanvas(desiredW, desiredH);
  else {
    cnv = createCanvas(desiredW, desiredH);
    cnv.parent("canvas-wrapper");
  }
}

// === loadVolcanoData() ===
function loadVolcanoData() {
  volcanoes = [];
  for (let r = 0; r < table.getRowCount(); r++) {
    let name = table.getString(r, "Volcano Name") || table.getString(r, "Volcano_Name") || "Sconosciuto";
    let country = table.getString(r, "Country") || "";
    let location = table.getString(r, "Location") || "";
    let lat = parseFloat(table.getString(r, "Latitude"));
    let lon = parseFloat(table.getString(r, "Longitude"));
    let elev = parseFloat(table.getString(r, "Elevation (m)"));
    let type = table.getString(r, "Type") || "";
    let category = table.getString(r, "TypeCategory") || table.getString(r, "Type Category") || "";
    let status = table.getString(r, "Status") || "";
    let last = table.getString(r, "Last Known Eruption") || "";

    if (isNaN(lat) || isNaN(lon)) continue;

    let rSize = map(constrain(elev || 0, -6000, 7000), -6000, 7000, 3, 20);
    rSize = constrain(rSize, 3, 26);

    volcanoes.push({ name, country, location, lat, lon, elev, type, category, status, last, rSize });
  }
}

// === redrawAll() ===
function redrawAll() {
  clear();
  background(14, 15, 18);
  imageMode(CORNER);
  image(worldImg, 0, 0, width, height);
  for (let v of volcanoes) {
    const p = projectToPixel(v.lon, v.lat);
    drawVolcanoPoint(p.x, p.y, v);
  }
}

// === drawVolcanoPoint() ===
function drawVolcanoPoint(x, y, v) {
  const elev = (v.elev == null || isNaN(v.elev)) ? 0 : v.elev;
  const col = elevationColor(elev);
  drawingContext.shadowBlur = 10;
  drawingContext.shadowColor = "rgba(0,0,0,0.35)";
  stroke(0, 40);
  strokeWeight(0.6);
  fill(col);
  ellipse(x, y, v.rSize, v.rSize);
  drawingContext.shadowBlur = 0;
}

// === elevationColor() ===
function elevationColor(elev) {
  const t = constrain(map(elev, -6000, 7000, 0, 1), 0, 1);
  const c0 = color("#4A001A");
  const c1 = color("#CC3300");
  const c2 = color("#FFE066");

  if (t < 0.5) return lerpColor(c0, c1, map(t, 0, 0.5, 0, 1));
  else return lerpColor(c1, c2, map(t, 0.5, 1, 0, 1));
}

// === projectToPixel() ===
function projectToPixel(lonDeg, latDeg) {
  let L = ((parseFloat(lonDeg) + 180) % 360 + 360) % 360 - 180;
  const x = map(L, -180, 180, 0, width);
  const y = map(latDeg, 90, -90, 0, height);
  return { x, y };
}

// === TOOLTIP ===
function onMouseMove(evt) {
  const rect = cnv.elt.getBoundingClientRect();
  const mx = evt.clientX - rect.left;
  const my = evt.clientY - rect.top;

  let found = null;
  for (let v of volcanoes) {
    const p = projectToPixel(v.lon, v.lat);
    if (dist(mx, my, p.x, p.y) <= v.rSize / 2 + 4) {
      found = { v, p };
      break;
    }
  }
  if (!found) return hideTooltip();

  showTooltipFor(found.v, found.p, evt.clientX, evt.clientY);
}

function showTooltipFor(v, p, clientX, clientY) {
  if (!tooltipDiv) tooltipDiv = document.getElementById("tooltip");
  const title = tooltipDiv.querySelector(".tt-title");
  const body = tooltipDiv.querySelector(".tt-body");

  title.textContent = `${v.name} (${v.country || v.location || ""})`;
  const latStr = v.lat.toFixed(2);
  const lonStr = v.lon.toFixed(2);

  body.innerHTML = `
    <div><strong>Type:</strong> ${v.type || "N/A"}</div>
    <div><strong>Category:</strong> ${v.category || "N/A"}</div>
    <div><strong>Lat / Lon:</strong> ${latStr}°, ${lonStr}°</div>
    <div><strong>Elevation:</strong> ${v.elev != null ? v.elev + " m" : "N/A"}</div>
    <div><strong>Status:</strong> ${v.status || "N/A"}</div>
    <div><strong>Last Known Eruption:</strong> ${v.last || "N/A"}</div>
  `;

  const cardRect = document.querySelector("#map-card").getBoundingClientRect();
  const ttRect = tooltipDiv.getBoundingClientRect();
  let left = clientX + 12;
  let top = clientY + 8;

  if (left + ttRect.width > cardRect.right) left = clientX - ttRect.width - 18;
  if (top + ttRect.height > cardRect.bottom) top = clientY - ttRect.height - 18;
  if (top < cardRect.top + 6) top = cardRect.top + 6;

  tooltipDiv.style.left = `${left}px`;
  tooltipDiv.style.top = `${top}px`;
  tooltipDiv.style.display = "block";
  tooltipDiv.setAttribute("aria-hidden", "false");

  redrawAll();
  pushHighlight(p.x, p.y, v);
}

function pushHighlight(x, y, v) {
  drawingContext.save();
  drawingContext.shadowBlur = 22;
  drawingContext.shadowColor = "rgba(255,255,255,0.12)";
  noStroke();
  fill(255, 255, 255, 36);
  ellipse(x, y, v.rSize * 1.8, v.rSize * 1.8);
  drawingContext.restore();
}

function hideTooltip() {
  if (!tooltipDiv) tooltipDiv = document.getElementById("tooltip");
  tooltipDiv.style.display = "none";
  tooltipDiv.setAttribute("aria-hidden", "true");
  redrawAll();
}

// === SLIDE INFO ===
const slide = document.getElementById("volcano-slide");
const slideTitle = document.getElementById("slide-title");
const slideBody = document.getElementById("slide-body");
const closeBtn = slide.querySelector(".close-btn");
const overlay = document.getElementById("slide-overlay");
const accentBar = document.querySelector(".slide-accent");

closeBtn.addEventListener("click", hideSlide);
overlay.addEventListener("click", hideSlide);

function onCanvasClick(evt) {
  const rect = cnv.elt.getBoundingClientRect();
  const mx = evt.clientX - rect.left;
  const my = evt.clientY - rect.top;

  for (let v of volcanoes) {
    const p = projectToPixel(v.lon, v.lat);
    if (dist(mx, my, p.x, p.y) <= v.rSize / 2 + 4) {
      showSlideFor(v);
      return;
    }
  }
}

function showSlideFor(v) {
  slideTitle.textContent = `${v.name} (${v.country || v.location || ""})`;
  slideBody.innerHTML = `
    <p><strong>Type:</strong> ${v.type || "N/A"}</p>
    <p><strong>Category:</strong> ${v.category || "N/A"}</p>
    <p><strong>Elevation:</strong> ${v.elev != null ? v.elev + " m" : "N/A"}</p>
    <p><strong>Status:</strong> ${v.status || "N/A"}</p>
    <p><strong>Last Known Eruption:</strong> ${v.last || "N/A"}</p>
    <p><strong>Coordinates:</strong> ${v.lat.toFixed(2)}°, ${v.lon.toFixed(2)}°</p>
  `;

  const c = elevationColor(v.elev);
  const rgb = [red(c), green(c), blue(c)];
  const accent = `linear-gradient(to bottom, rgba(${rgb[0]},${rgb[1]},${rgb[2]},1), rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.6))`;

  accentBar.style.background = accent;
  accentBar.style.boxShadow = `0 0 16px rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.5)`;

  overlay.classList.add("active");
  slide.classList.add("active");
  slide.setAttribute("aria-hidden", "false");
}

function hideSlide() {
  overlay.classList.remove("active");
  slide.classList.remove("active");
  slide.setAttribute("aria-hidden", "true");
}
