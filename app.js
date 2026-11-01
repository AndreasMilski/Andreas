"use strict";

/* ============================================================
   Helfer – Zähler, Stoppuhr, Countdown
   Alle Daten bleiben lokal auf dem Gerät (localStorage).
   Zeiten werden über Zeitstempel berechnet, damit sie auch
   weiterlaufen, wenn die App im Hintergrund ist.
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};

function haptic() {
  // iOS Safari unterstützt navigator.vibrate nicht – auf anderen Geräten schon.
  if (navigator.vibrate) navigator.vibrate(10);
}

/* ---------- Ton (Web Audio, iOS braucht erst eine Berührung) ---------- */
let audioCtx = null;
function unlockAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}
function beep(freq = 880, duration = 0.18, when = 0) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/* ---------- Tabs ---------- */
const titles = { counter: "Zähler", stopwatch: "Stoppuhr", timer: "Timer" };
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  $("#title").textContent = titles[name];
  store.set("tab", name);
}
document.querySelectorAll(".tabbar button").forEach((b) =>
  b.addEventListener("click", () => showView(b.dataset.view))
);
showView(store.get("tab", "counter"));

/* ============================================================
   ZÄHLER
   ============================================================ */
let counters = store.get("counters", [{ id: Date.now(), name: "Zähler 1", value: 0 }]);
const saveCounters = () => store.set("counters", counters);

function renderCounters() {
  const list = $("#counter-list");
  list.innerHTML = "";
  counters.forEach((c) => {
    const el = document.createElement("div");
    el.className = "counter";
    el.innerHTML = `
      <div class="counter-head">
        <input class="counter-name" maxlength="30">
        <button class="icon-btn reset" title="Zurücksetzen">↺</button>
        <button class="icon-btn del" title="Löschen">✕</button>
      </div>
      <div class="counter-body">
        <button class="step minus">−</button>
        <div class="counter-value"></div>
        <button class="step plus">+</button>
      </div>`;
    const nameInput = el.querySelector(".counter-name");
    const valueEl = el.querySelector(".counter-value");
    nameInput.value = c.name;
    valueEl.textContent = c.value;

    const update = (delta) => {
      c.value += delta;
      valueEl.textContent = c.value;
      haptic();
      saveCounters();
    };
    el.querySelector(".plus").addEventListener("click", () => update(1));
    el.querySelector(".minus").addEventListener("click", () => update(-1));
    el.querySelector(".reset").addEventListener("click", () => {
      if (c.value !== 0 && confirm(`„${c.name}“ auf 0 zurücksetzen?`)) update(-c.value);
    });
    el.querySelector(".del").addEventListener("click", () => {
      if (confirm(`„${c.name}“ löschen?`)) {
        counters = counters.filter((x) => x.id !== c.id);
        saveCounters();
        renderCounters();
      }
    });
    nameInput.addEventListener("change", () => {
      c.name = nameInput.value.trim() || "Zähler";
      nameInput.value = c.name;
      saveCounters();
    });
    nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") nameInput.blur(); });
    list.appendChild(el);
  });
}
$("#add-counter").addEventListener("click", () => {
  counters.push({ id: Date.now(), name: `Zähler ${counters.length + 1}`, value: 0 });
  saveCounters();
  renderCounters();
});
renderCounters();

/* ============================================================
   STOPPUHR
   ============================================================ */
// Zustand: startedAt (ms, wenn läuft), elapsed (ms bis zur letzten Pause), laps (Gesamtzeiten)
let sw = store.get("stopwatch", { startedAt: null, elapsed: 0, laps: [] });
const saveSw = () => store.set("stopwatch", sw);
const swNow = () => sw.elapsed + (sw.startedAt ? Date.now() - sw.startedAt : 0);

function fmtStopwatch(ms) {
  const cs = Math.floor(ms / 10) % 100;
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  const pad = (n) => String(n).padStart(2, "0");
  return (h ? `${h}:${pad(m)}` : pad(m)) + `:${pad(s)},${pad(cs)}`;
}

function renderSwButtons() {
  const left = $("#sw-left"), right = $("#sw-right");
  if (sw.startedAt) {
    right.textContent = "Stopp"; right.className = "round stop";
    left.textContent = "Runde"; left.disabled = false;
  } else {
    right.textContent = "Start"; right.className = "round start";
    left.textContent = sw.elapsed ? "Reset" : "Runde";
    left.disabled = !sw.elapsed;
  }
}

function renderLaps() {
  const ol = $("#sw-laps");
  ol.innerHTML = "";
  // Rundenzeiten = Differenzen der Gesamtzeiten; aktuelle Runde oben
  const splits = sw.laps.map((t, i) => t - (i ? sw.laps[i - 1] : 0));
  const min = Math.min(...splits), max = Math.max(...splits);
  const items = [];
  if (sw.startedAt || sw.elapsed) {
    items.push({ n: sw.laps.length + 1, t: swNow() - (sw.laps.at(-1) || 0), current: true });
  }
  for (let i = splits.length - 1; i >= 0; i--) items.push({ n: i + 1, t: splits[i] });
  items.forEach((it) => {
    const li = document.createElement("li");
    if (!it.current && splits.length > 1) {
      if (it.t === min) li.className = "best";
      else if (it.t === max) li.className = "worst";
    }
    li.innerHTML = `<span>Runde ${it.n}</span><span>${fmtStopwatch(it.t)}</span>`;
    if (it.current) li.id = "sw-current-lap";
    ol.appendChild(li);
  });
}

$("#sw-right").addEventListener("click", () => {
  haptic();
  if (sw.startedAt) { sw.elapsed = swNow(); sw.startedAt = null; }
  else sw.startedAt = Date.now();
  saveSw(); renderSwButtons(); renderLaps();
});
$("#sw-left").addEventListener("click", () => {
  haptic();
  if (sw.startedAt) sw.laps.push(swNow());
  else sw = { startedAt: null, elapsed: 0, laps: [] };
  saveSw(); renderSwButtons(); renderLaps();
});

/* ============================================================
   COUNTDOWN
   ============================================================ */
// Zustand: endAt (ms, wenn läuft), remaining (ms, wenn pausiert), total (ms)
let tm = store.get("timer", { endAt: null, remaining: null, total: 0 });
const saveTm = () => store.set("timer", tm);
const tmActive = () => tm.endAt !== null || tm.remaining !== null;
const tmLeft = () => (tm.endAt ? Math.max(0, tm.endAt - Date.now()) : tm.remaining ?? 0);

function fmtTimer(ms) {
  const total = Math.ceil(ms / 1000);
  const s = total % 60, m = Math.floor(total / 60) % 60, h = Math.floor(total / 3600);
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function clampInput(el, max) {
  let v = parseInt(el.value, 10);
  if (isNaN(v) || v < 0) v = 0;
  if (v > max) v = max;
  el.value = v;
  return v;
}
function readPickers() {
  const h = clampInput($("#tm-h"), 23), m = clampInput($("#tm-m"), 59), s = clampInput($("#tm-s"), 59);
  return (h * 3600 + m * 60 + s) * 1000;
}
function setPickers(sec) {
  $("#tm-h").value = Math.floor(sec / 3600);
  $("#tm-m").value = Math.floor(sec / 60) % 60;
  $("#tm-s").value = sec % 60;
  store.set("timerLast", sec);
}
["#tm-h", "#tm-m", "#tm-s"].forEach((id) =>
  $(id).addEventListener("change", () => store.set("timerLast", readPickers() / 1000))
);
setPickers(store.get("timerLast", 300));
document.querySelectorAll(".presets button").forEach((b) =>
  b.addEventListener("click", () => { haptic(); setPickers(+b.dataset.sec); })
);

function renderTimer() {
  const active = tmActive();
  $("#tm-setup").hidden = active;
  $("#tm-run").hidden = !active;
  const left = $("#tm-left"), right = $("#tm-right");
  left.disabled = !active;
  if (tm.endAt) { right.textContent = "Pause"; right.className = "round pause"; }
  else if (tm.remaining !== null) { right.textContent = "Weiter"; right.className = "round start"; }
  else { right.textContent = "Start"; right.className = "round start"; }
  updateTimerDisplay();
}
function updateTimerDisplay() {
  if (!tmActive()) return;
  const ms = tmLeft();
  $("#tm-display").textContent = fmtTimer(ms);
  const frac = tm.total ? ms / tm.total : 0;
  $("#tm-ring").style.strokeDashoffset = String(339.292 * (1 - frac));
}

$("#tm-right").addEventListener("click", () => {
  haptic();
  unlockAudio();
  if (tm.endAt) {                       // Pause
    tm.remaining = tmLeft(); tm.endAt = null;
    releaseWake();
  } else if (tm.remaining !== null) {   // Weiter
    tm.endAt = Date.now() + tm.remaining; tm.remaining = null;
    requestWake();
  } else {                              // Start
    const ms = readPickers();
    if (!ms) return;
    tm = { endAt: Date.now() + ms, remaining: null, total: ms };
    requestWake();
  }
  saveTm(); renderTimer();
});
$("#tm-left").addEventListener("click", () => {
  haptic();
  tm = { endAt: null, remaining: null, total: 0 };
  saveTm(); releaseWake(); renderTimer();
});

/* ---------- Alarm ---------- */
let alarmInterval = null;
function fireAlarm() {
  tm = { endAt: null, remaining: null, total: 0 };
  saveTm(); releaseWake(); renderTimer();
  $("#alarm").hidden = false;
  const ring = () => { beep(880, 0.15, 0); beep(880, 0.15, 0.25); beep(1175, 0.3, 0.5); };
  ring();
  alarmInterval = setInterval(ring, 1500);
  if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]);
}
$("#alarm-stop").addEventListener("click", () => {
  clearInterval(alarmInterval);
  alarmInterval = null;
  $("#alarm").hidden = true;
});

/* ---------- Bildschirm wach halten (Wake Lock, iOS 16.4+) ---------- */
let wakeLock = null;
$("#tm-wake").checked = store.get("wake", true);
$("#tm-wake").addEventListener("change", (e) => {
  store.set("wake", e.target.checked);
  if (e.target.checked && tm.endAt) requestWake(); else releaseWake();
});
async function requestWake() {
  if (!$("#tm-wake").checked || !("wakeLock" in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch { /* nicht verfügbar */ }
}
function releaseWake() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && tm.endAt) requestWake();
});

/* ============================================================
   Haupt-Schleife
   ============================================================ */
function tick() {
  if (sw.startedAt) {
    $("#sw-display").textContent = fmtStopwatch(swNow());
    const cur = $("#sw-current-lap");
    if (cur) cur.lastElementChild.textContent = fmtStopwatch(swNow() - (sw.laps.at(-1) || 0));
  }
  if (tm.endAt) {
    if (tmLeft() <= 0) fireAlarm();
    else updateTimerDisplay();
  }
  requestAnimationFrame(tick);
}

$("#sw-display").textContent = fmtStopwatch(swNow());
renderSwButtons();
renderLaps();
renderTimer();
if (tm.endAt) requestWake();
requestAnimationFrame(tick);

/* ---------- Offline-Unterstützung ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
