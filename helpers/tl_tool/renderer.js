// renderer.js
function uidSuffix(i) { return `__S${i}`; }

function getEl(id, index) {
  return (index === 1)
    ? document.getElementById(id)
    : document.getElementById(id + uidSuffix(index));
}

function getShowRoot(i) {
  return (i === 1)
    ? document
    : document.querySelector(`[data-show-index="${i}"]`) || document;
}

function isDirPath(p) {
  try {
    const st = window.mediaTools.statSync(p);
    if (!st) return false;
    if (typeof st.isDirectory === "function") return !!st.isDirectory();
    return !!st.isDirectory;
  } catch {
    return false;
  }
}

const BLANK_STRINGS = new Set(["n/a", "na", "und", "undefined", "unknown", "?", "-", ""]);

function cleanStr(v) {
  if (v == null) return "";
  const s = String(v).trim();
  return BLANK_STRINGS.has(s.toLowerCase()) ? "" : s;
}

function cleanNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cloneEditorForShow(index) {
  const baseRow = document.querySelector(".container-fluid > .row");
  if (!baseRow) return null;

  const clone = baseRow.cloneNode(true);
  clone.classList.add("related-show");
  clone.dataset.showIndex = String(index);
  clone.querySelectorAll("[id]").forEach(el => { el.id = el.id + uidSuffix(index); });
  clone.querySelectorAll('input[name="master"], input[name="public"], input[name="chapters"], input[name="menu"]')
    .forEach(inp => { inp.name = inp.name + uidSuffix(index); });

  ["related-config", "related-editors", "related-hr", "save-all-row"]
    .forEach(id => clone.querySelector(`#${id}${uidSuffix(index)}`)?.remove());

  const relCb = clone.querySelector(`#hasRelated${uidSuffix(index)}`);
  if (relCb) {
    relCb.checked = true;
    relCb.disabled = true;
  }

  const shots = clone.querySelector(`#shots-result${uidSuffix(index)}`);
  if (shots) shots.innerHTML = "";
  const upl = clone.querySelector(`#upload-images-btn${uidSuffix(index)}`);
  if (upl) upl.disabled = true;

  const pre = clone.querySelector(`#specs-summary${uidSuffix(index)}`);
  const h = document.createElement("div");
  h.className = "fw-bold text-center mb-2 text-muted";
  h.textContent = `Show #${index}`;
  (pre?.parentElement || clone).insertBefore(h, pre || clone.firstChild);

  return clone;
}

function cleanFileName(str) {
  const translitMap = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya'
  };

  return str
    .toLowerCase()
    .split('')
    .map(c => translitMap[c] || c)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

window.showState = window.showState || {};
function getShowState(i) {
  if (!window.showState[i]) {
    window.showState[i] = {
      droppedFilePath: null,
      probeData: null,
      durationSec: 0,
      generatedScreenshots: [],
      uploadedScreenshots: {}
    };
  }
  return window.showState[i];
}

function buildFilename(json) {
  const band = cleanFileName(json.bands.join('_')) || 'unknown';

  const day = json.startDate.day || 'xx';
  const month = json.startDate.month || 'xx';
  const year = json.startDate.year || 'xxxx';

  const datePart = `${day}_${month}_${year}`;

  const categories = json.category.length > 0 ? json.category.join('_') : 'video';

  let locationExtra = '';

  if (!json.startDate.day || !json.startDate.month || !json.startDate.year) {
    const locParts = [
      json.location.city,
      json.location.state,
      json.location.country,
      json.location.venue,
      json.location.event
    ].filter(Boolean).map(cleanFileName);

    if (locParts.length > 0) {
      locationExtra = '_' + locParts.join('_');
    }
  }

  const sourcePart = json.source ? `_${cleanFileName(json.source)}` : '';

  return `${band}_${datePart}${locationExtra}${sourcePart}_${categories}`;
}

function createSetlistItemFor(i, data = {}) {
  const container = document.createElement('div');
  container.className = 'mb-2';

  const songLine = document.createElement('div');
  songLine.className = 'd-flex gap-1 mb-1';

  const songInput = document.createElement('input');
  songInput.type = 'text';
  songInput.value = data.song || '';
  songInput.className = 'form-control form-control-sm fw-bold';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-outline-danger btn-sm';
  removeBtn.style.fontSize = '8px';
  removeBtn.style.padding = '2px 6px';
  removeBtn.innerHTML = '&times;';
  removeBtn.onclick = () => container.remove();

  songLine.appendChild(songInput);
  songLine.appendChild(removeBtn);

  const smallFields = document.createElement('div');
  smallFields.className = 'd-flex gap-1';
  ['feat', 'note', 'comment', 'coverOf'].forEach(key => {
    if (key === 'note') {
      const select = document.createElement('select');
      select.className = 'form-select form-select-sm';
      ['', 'tape', 'incomplete', 'not recorded'].forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      });
      select.value = (data.note && ['tape','incomplete','not recorded'].includes(data.note)) ? data.note : '';
      smallFields.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = key;
      input.value = data[key] || '';
      input.className = 'form-control form-control-sm';
      smallFields.appendChild(input);
    }
  });

  container.appendChild(songLine);
  container.appendChild(smallFields);

  const host = getEl('setlist-container', i);
  if (host) host.appendChild(container);
}

function createExtraItemFor(i, data = {}) {
  const container = document.createElement('div');
  container.className = 'mb-2';

  const line = document.createElement('div');
  line.className = 'd-flex gap-1 mb-1';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = data.song || '';
  input.className = 'form-control form-control-sm fw-bold';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-outline-danger btn-sm';
  removeBtn.style.fontSize = '8px';
  removeBtn.style.padding = '2px 6px';
  removeBtn.innerHTML = '&times;';
  removeBtn.onclick = () => container.remove();

  line.appendChild(input);
  line.appendChild(removeBtn);

  const small = document.createElement('div');
  small.className = 'd-flex gap-1';
  ['feat', 'note', 'comment', 'coverOf'].forEach(key => {
    const f = document.createElement('input');
    f.type = 'text';
    f.placeholder = key;
    f.value = data[key] || '';
    f.className = 'form-control form-control-sm';
    small.appendChild(f);
  });

  container.appendChild(line);
  container.appendChild(small);

  const host = getEl('extras-container', i);
  if (host) host.appendChild(container);
}

function wireTapersSection(i = 1) {
  const fields = getEl("taper-fields", i);
  const addBtn = getEl("add-taper", i);
  if (!fields || !addBtn) return;

  fields.innerHTML = "";

  const addTaper = (val = "") => {
    const wrap = document.createElement("div");
    wrap.className = "col-6 mb-1";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "taper-input form-control form-control-sm";
    input.value = val;

    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "btn btn-outline-danger btn-sm ms-2";
    rm.style.padding = "1px 6px";
    rm.style.fontSize = "8px";
    rm.innerHTML = "&times;";
    rm.onclick = () => wrap.remove();

    const inner = document.createElement("div");
    inner.className = "d-flex align-items-center";
    inner.appendChild(input);
    inner.appendChild(rm);

    wrap.appendChild(inner);
    fields.appendChild(wrap);
  };

  addBtn.onclick = () => addTaper();

  const name = (i === 1) ? "master" : `master${uidSuffix(i)}`;
  const radios = document.querySelectorAll(`input[name="${name}"]`);
  const isMaster = Array.from(radios).some(r => r.checked && r.value === "yes");

  radios.forEach(r => r.addEventListener("change", () => wireTapersSection(i)));

  if (isMaster) addTaper("Vortex");
}

function calcMediaType(sizeInMb) {
  if (sizeInMb <= 1.44) return "Floppy";
  if (sizeInMb <= 700) return "CD";
  if (sizeInMb <= 4700) return "DVD-5";
  if (sizeInMb <= 9000) return "DVD-9";
  if (sizeInMb <= 25000) return "BD-25";
  if (sizeInMb <= 50000) return "BD-50";
  return "4K UHD";
}

const dropArea = document.getElementById("drop-area");
const saveBtn = document.getElementById("save-btn");
const shotsDiv = document.getElementById("shots-result");

function chooseSizeUnitFromBytes(totalSize) {
  const sizeKb = totalSize / 1024;
  const sizeMb = sizeKb / 1024;
  const sizeGb = sizeMb / 1024;

  let unit = "Kb";
  let sizeVal = sizeKb;

  if (sizeMb > 999) {
    unit = "Gb";
    sizeVal = sizeGb;
  } else if (sizeKb > 999) {
    unit = "Mb";
    sizeVal = sizeMb;
  }

  return { sizeVal: Number(sizeVal.toFixed(2)), unit, sizeMb };
}

async function processFilesForBlock(filesOrPaths, opts) {
  const files = [...filesOrPaths];
  if (!files.length) return;

  const i = opts.showIndex || 1;
  const st = getShowState(i);

  let totalSize = 0, totalDuration = 0, firstVideoFile = null;
  const paths = files.map(f => (typeof f === "string" ? f : f?.path)).filter(Boolean);
  if (!paths.length) return;

  const anyDir = paths.some(p => isDirPath(p));
  if (anyDir) {
    const shotsHost = getEl("shots-result", i);
    if (shotsHost) {
      shotsHost.innerHTML = `<div class="text-muted mt-2">Folder drops are no longer supported. Please drop VOB or other video files directly.</div>`;
    }
    return;
  }

  for (const p of paths) {
    let info;
    try { info = await window.mediaTools.probeFile(p); } catch { continue; }
    totalSize += info?.format?.size || 0;
    totalDuration += info?.format?.duration || 0;
    if (!firstVideoFile && info?.streams?.some(s => s.codec_type === "video")) firstVideoFile = p;
  }


  const { sizeVal, unit, sizeMb } = chooseSizeUnitFromBytes(totalSize);
  opts.sizeInput.value = sizeVal;
  opts.unitSelect.value = unit;
  opts.typeInput.value = calcMediaType(sizeMb);

  const blockDuration = Math.round(totalDuration);
  st.durationSec = blockDuration;
  if (opts.rowEl) opts.rowEl.dataset.durationSec = String(blockDuration);
  updateTotalLengthUI(i);
  st.droppedFilePath = firstVideoFile || null;

  if (st.droppedFilePath) {
    const ext = String(st.droppedFilePath).split(".").pop().toUpperCase();
    getEl("fileFormat", i).value = (ext === "VOB") ? "DVD" : ext;
  }

  if (firstVideoFile) {
    const imgs = await window.mediaTools.captureScreenshots(firstVideoFile, null, 4);
    st.generatedScreenshots = imgs;
    renderScreenshots(imgs, i);

    st.probeData = await window.mediaTools.probeFile(firstVideoFile);
    const pre = getEl("specs-summary", i);
    if (pre) {
      pre.textContent = formatSpecsForDisplay(st.probeData);
      pre.classList.remove("d-none");
    }
  } else {
    const shotsHost = getEl("shots-result", i);
    if (shotsHost) {
      shotsHost.innerHTML = `<div class="text-muted mt-2">No video streams found (audio-only or unsupported file types). No screenshots available.</div>`;
    }
  }

  if (i === 1) {
    initTapersSection();
  }
  getEl("save-btn", 1)?.classList.remove("d-none");
}

function computeTotalLengthSecFor(i = 1) {
  let total = 0;

  total += Number(getShowState(i).durationSec || 0);

  const extraRoot = getEl("extra-media", i);
  if (extraRoot) {
    extraRoot.querySelectorAll(".media-row-secondary").forEach(row => {
      const d = Number(row.dataset.durationSec || 0);
      total += isNaN(d) ? 0 : d;
    });
  }

  return Math.round(total);
}

function updateTotalLengthUI(i = 1) {
  const el = getEl("total-length", i);
  if (!el) return;
  el.value = computeTotalLengthSecFor(i);
}

function createSecondaryMediaBlock() {
  const host = document.getElementById("extra-media");

  const index = host.querySelectorAll(".media-block").length + 2;

  const row = document.createElement("div");
  row.className = "media-block media-row-secondary text-center mb-2";
  row.dataset.durationSec = "0";

  const label = document.createElement("div");
  label.className = "fw-bold mb-1";
  label.textContent = `Media #${index}`;

  const drop = document.createElement("div");
  drop.className = "border border-2 border-secondary rounded p-3 mb-2";
  drop.style.background = "#f8f9fa";
  drop.style.fontWeight = "bold";
  drop.style.fontSize = "12px";
  drop.textContent = "Drag & Drop additional media here";

  const grid = document.createElement("div");
  grid.className = "row g-2 justify-content-center";

  const colSize = document.createElement("div");
  colSize.className = "col-3";
  colSize.innerHTML = `
    <label class="form-label">Size</label>
    <input type="number" step="0.01" class="media-size form-control form-control-sm">
  `;

  const colUnit = document.createElement("div");
  colUnit.className = "col-2";
  colUnit.innerHTML = `
    <label class="form-label">Unit</label>
    <select class="media-unit form-select form-select-sm">
      <option>Gb</option>
      <option>Mb</option>
      <option>Kb</option>
    </select>
  `;

  const colType = document.createElement("div");
  colType.className = "col-3";
  colType.innerHTML = `
    <label class="form-label">Type</label>
    <input type="text" class="media-type form-control form-control-sm">
  `;

  grid.appendChild(colSize);
  grid.appendChild(colUnit);
  grid.appendChild(colType);

  row.appendChild(label);
  row.appendChild(drop);
  row.appendChild(grid);
  host.appendChild(row);

  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  drop.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = [...e.dataTransfer.files];
    if (!files.length) return;

    await processFilesForBlock(files, {
      isPrimary: false,
      rowEl: row,
      sizeInput: row.querySelector(".media-size"),
      unitSelect: row.querySelector(".media-unit"),
      typeInput: row.querySelector(".media-type"),
    });
  });
}

function wireTradeToggle(i = 1) {
  const cb = getEl("receivedTrade", i);
  const row = getEl("traderRow", i);
  const name = getEl("traderName", i);
  if (!cb || !row) return;

  const apply = () => {
    if (cb.checked) {
      row.classList.remove("d-none");
    } else {
      row.classList.add("d-none");
      if (name) name.value = "";
    }
  };

  cb.addEventListener("change", apply);
  apply();
}

function updateUploadButtonState(i = 1) {
  const btn = getEl("upload-images-btn", i);
  if (!btn) return;
  const st = getShowState(i);
  btn.disabled = !(st.generatedScreenshots && st.generatedScreenshots.length);
}

window.refreshScreenshotForShow = async function (i, oldPath, container) {
  const st = getShowState(i);

  if (!st || !st.droppedFilePath) {
    alert("No video file available to refresh screenshots from.");
    return;
  }

  try {
    const targetDir = window.mediaTools.getDirname(st.droppedFilePath);
    const oldFilename = oldPath.split(/[/\\]/).pop();
    const finalPath = window.mediaTools.pathJoin(targetDir, oldFilename);

    try { await window.mediaTools.deleteFile(oldPath); } catch { }
    try { await window.mediaTools.deleteFile(finalPath); } catch { }

    const outDir = await window.mediaTools.getTmpDir();
    const [newTempPath] = await window.mediaTools.captureScreenshots(st.droppedFilePath, outDir, 1);
    await window.mediaTools.copyFile(newTempPath, finalPath);

    const idx = st.generatedScreenshots.indexOf(oldPath);
    if (idx !== -1) st.generatedScreenshots[idx] = finalPath;

    const img = document.createElement("img");
    img.src = `file://${finalPath}?t=${Date.now()}`;
    img.style.width = "160px";
    img.style.border = "1px solid #ccc";

    const idLabel = document.createElement("div");
    idLabel.style.fontSize = "8px";
    idLabel.style.marginTop = "4px";

    const refreshBtn = document.createElement("button");
    refreshBtn.className = "btn btn-outline-secondary btn-sm mt-1";
    refreshBtn.textContent = "↻";
    refreshBtn.onclick = () => refreshScreenshotForShow(i, finalPath, container);

    delete st.uploadedScreenshots[oldPath];
    st.uploadedScreenshots[finalPath] = { id: null, idLabel, refreshBtn };

    container.innerHTML = "";
    container.appendChild(img);
    container.appendChild(refreshBtn);
    container.appendChild(idLabel);
  } catch (err) {
    alert("Failed to refresh: " + err.message);
  }
};

async function uploadScreenshots(i = 1) {
  const st = getShowState(i);
  if (!st.generatedScreenshots.length) return;

  try {
    await loginToDrive();

    for (const imgPath of st.generatedScreenshots) {
      const uploaded = st.uploadedScreenshots[imgPath];
      if (uploaded.id) continue;

      const res = await window.oauthDrive.uploadToDrive(imgPath);
      const driveId = res.id;

      await window.oauthDrive.setPermission(driveId, { role: "reader", type: "anyone" });

      uploaded.id = driveId;
      uploaded.idLabel.textContent = driveId;

      if (uploaded.refreshBtn) uploaded.refreshBtn.disabled = true;

      const targetDir = window.mediaTools.getDirname(getShowState(i).droppedFilePath);
      const destPath = window.mediaTools.pathJoin(targetDir, imgPath.split(/[/\\]/).pop());
      await window.mediaTools.copyFile(imgPath, destPath);
    }

    alert("All screenshots uploaded and saved locally.");
  } catch (err) {
    console.error(err);
    alert("Upload failed: " + err.message);
  }
}

async function loginToDrive() {
  const authUrl = await window.oauthDrive.getAuthUrl();

  return new Promise((resolve, reject) => {
    window.oauthDrive.onAuthCode(async (code) => {
      await window.oauthDrive.setAuthCode(code);
      resolve();
    });

    window.oauthDrive.openAuthWindow(authUrl);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const uploadImagesBtn = document.getElementById("upload-images-btn");
  uploadImagesBtn.addEventListener("click", () => uploadScreenshots(1));

  ["dragover", "drop"].forEach(evt => {
    document.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
  const dropArea = document.getElementById("drop-area");
  const saveBtn = document.getElementById("save-btn");
  const shotsDiv = document.getElementById("shots-result");
  const specsSummary = document.getElementById("specs-summary");
  const miscCheckbox = document.querySelector('input[name="category"][value="misc"]');
  const countryField = document.getElementById("loc-country");
  const venueField = document.getElementById("loc-venue");
  const setlistResponseDiv = document.getElementById("setlist-response");
  const hasRelated = document.getElementById("hasRelated");
  const relatedCfg = document.getElementById("related-config");
  const relatedEditorsHost = document.getElementById("related-editors");
  const relatedHr = document.getElementById("related-hr");
  const saveAllRow = document.getElementById("save-all-row");
  const saveAllBtn = document.getElementById("save-all-btn");

  wireTapersSection(1);
  const addSetBtn1 = document.getElementById("add-setlist-item");
  if (addSetBtn1) addSetBtn1.onclick = () => createSetlistItemFor(1);
  const addExtraBtn1 = document.getElementById("add-extra-item");
  if (addExtraBtn1) addExtraBtn1.onclick = () => createExtraItemFor(1);

  hasRelated.addEventListener("change", () => {
    const on = hasRelated.checked;
    relatedCfg.classList.toggle("d-none", !on);
    relatedEditorsHost.classList.toggle("d-none", !on);
    relatedHr.classList.toggle("d-none", !on);
    saveAllRow.classList.toggle("d-none", !on);

    if (!on) {
      relatedEditorsHost.innerHTML = "";
      document
        .querySelectorAll('.container-fluid > .related-show')
        .forEach(n => n.remove());
      if (window.showState) {
        Object.keys(window.showState).forEach(k => { if (k !== "1") delete window.showState[k]; });
      }
    } else {
      buildRelatedEditors();
    }
  });

  document.getElementById("relatedCount").addEventListener("input", () => {
    if (hasRelated.checked) buildRelatedEditors();
  });

  saveAllBtn.addEventListener("click", saveAllJsons);

  function toggleLocationFields() {
    if (miscCheckbox.checked) {
      setlistResponseDiv.classList.remove("d-none");
      countryField.removeAttribute("disabled");
      venueField.removeAttribute("disabled");
    } else {
      if (!window.setlistData) {
        setlistResponseDiv.classList.add("d-none");
      }
    }
  }

  wireTradeToggle(1);

  miscCheckbox.addEventListener("change", toggleLocationFields);
  toggleLocationFields();

  dropArea.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropArea.style.borderColor = "#ccc";

    const files = [...e.dataTransfer.files];
    if (!files.length) return;

    await processFilesForBlock(files, {
      isPrimary: true,
      sizeInput: document.getElementById("specs-size"),
      unitSelect: document.getElementById("specs-unit"),
      typeInput: document.getElementById("specs-type"),
      lengthInput: document.getElementById("specs-length"),
    });
  });

  document.getElementById("setlist-lookup-btn").addEventListener("click", () => runSetlistLookupGeneric(1));
  document.getElementById("add-media-btn").addEventListener("click", createSecondaryMediaBlock);
  saveBtn.addEventListener("click", () => saveJson(1));
});

function buildRelatedEditors() {
  const count = Math.max(1, parseInt(document.getElementById("relatedCount").value || "1", 10));

  const container = document.querySelector(".container-fluid");
  if (!container) return;

  let anchor = document.getElementById("save-all-row");
  if (!anchor) return;

  if (anchor.parentElement !== container) {
    container.appendChild(anchor);
  }

  container.querySelectorAll(":scope > .related-show").forEach(n => n.remove());

  const inColHost = document.getElementById("related-editors");
  if (inColHost) inColHost.classList.add("d-none");

  for (let i = 2; i <= count + 1; i++) {
    const block = cloneEditorForShow(i);
    if (!block) continue;

    container.insertBefore(block, anchor);
    bindShowEvents(i);
    prepareEmptyShow(i);
  }
}

function bindShowEvents(i) {
  const drop = getEl("drop-area", i);
  drop.addEventListener("dragover", e => { e.preventDefault(); e.stopPropagation(); });
  drop.addEventListener("drop", async (e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    if (!files.length) return;

    await processFilesForBlock(files, {
      showIndex: i,
      isPrimary: (i === 1),
      rowEl: null,
      sizeInput: getEl("specs-size", i),
      unitSelect: getEl("specs-unit", i),
      typeInput: getEl("specs-type", i),
    });

    const st = getShowState(i);
    const pre = getEl("specs-summary", i);
    if (pre && st.probeData) {
      pre.classList.remove("d-none");
      pre.textContent = formatSpecsForDisplay(st.probeData);
    }
  });

  wireTradeToggle(i);
  wireTapersSection(i);
  const addSetBtn = getEl("add-setlist-item", i);
  if (addSetBtn) addSetBtn.onclick = () => createSetlistItemFor(i);
  const addExtraBtn = getEl("add-extra-item", i);
  if (addExtraBtn) addExtraBtn.onclick = () => createExtraItemFor(i);

  const upl = getEl("upload-images-btn", i);
  if (upl) upl.addEventListener("click", () => uploadScreenshots(i));

  const btnLookup = getEl("setlist-lookup-btn", i);
  if (btnLookup) btnLookup.addEventListener("click", () => runSetlistLookupFor(i));

  const addMedia = getEl("add-media-btn", i);
  if (addMedia) addMedia.addEventListener("click", () => createSecondaryMediaBlockFor(i));

  const save = getEl("save-btn", i);
  if (save) save.addEventListener("click", () => saveJson(i));
}

function qsInShow(i, selector) {
  const root = (i === 1) ? document : document.querySelector(`[data-show-index="${i}"]`) || document;
  return root.querySelector(selector);
}

function runSetlistLookupFor(i) {
  return runSetlistLookupGeneric(i);
}

function createSecondaryMediaBlockFor(i) {
  return createSecondaryMediaBlockGeneric(i);
}

function initTapersSection() {
  const taperFields = document.getElementById("taper-fields");
  if (!taperFields) {
    console.error("Missing #taper-fields in the DOM!");
    return;
  }

  taperFields.innerHTML = '';

  function addTaperInput(defaultValue = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "col-6 mb-1";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "taper-input form-control form-control-sm";
    input.value = defaultValue;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-outline-danger btn-sm ms-2";
    removeBtn.style.padding = "1px 6px";
    removeBtn.style.fontSize = "8px";
    removeBtn.innerHTML = "&times;";

    removeBtn.onclick = () => {
      wrapper.remove();
    };

    const innerWrapper = document.createElement("div");
    innerWrapper.className = "d-flex align-items-center";

    innerWrapper.appendChild(input);
    innerWrapper.appendChild(removeBtn);

    wrapper.appendChild(innerWrapper);
    document.getElementById("taper-fields").appendChild(wrapper);
  }

  const masterRadios = document.querySelectorAll('input[name="master"]');
  let masterChecked = false;

  masterRadios.forEach(radio => {
    if (radio.checked && radio.value === "yes") {
      masterChecked = true;
    }

    radio.addEventListener("change", () => initTapersSection());
  });

  if (masterChecked) {
    addTaperInput("Vortex");
  }

  const addTaperBtn = document.getElementById("add-taper");
  addTaperBtn.onclick = () => addTaperInput();
}

async function runSetlistLookupGeneric(i) {
  const params = {
    band: getEl('bandName', i).value.trim(),
    city: getEl('city', i).value.trim(),
    year: getEl('year', i).value.trim(),
    apiKey: 'L3j_VGTwJdL-ulD72HnucwIc2tscZWy8rHXo'
  };

  const result = await window.setlistAPI.lookup(params);

  if (result.status !== 200) {
    alert("Setlist.fm error: " + result.status);
    return;
  }
  const data = JSON.parse(result.body);
  window.setlistData = data;

  const firstSetlist = data.setlist[0];
  const band = getEl('bandName', i).value.trim();
  const city = firstSetlist.venue.city.name;
  const year = firstSetlist.eventDate.split("-")[2];

  const searchUrl = `https://www.setlist.fm/search?query=${encodeURIComponent(band)}+${encodeURIComponent(city)}+${year}`;
  const response = await fetch(searchUrl);
  const html = await response.text();
  const match = html.match(/<h2><a .*?title="View this .*? setlist">.*? at (.*?)<\/a><\/h2>/i);
  window.scrapedEventName = match ? match[1].trim() : "";

  getEl("loc-date", i).value = firstSetlist.eventDate;
  getEl("loc-venue", i).value = firstSetlist.venue.name;

  let countryName = firstSetlist.venue.city.country.name || "";
  if (countryName === "United States") countryName = "USA";

  getEl("loc-country", i).value = countryName;
  getEl("loc-event", i).value = window.scrapedEventName || "";

  const allowedCountries = ["United States", "USA", "Canada", "Australia"];
  if (allowedCountries.includes(countryName)) {
    getEl("state", i).value = firstSetlist.venue.city.stateCode || "";
  } else {
    getEl("state", i).value = "";
  }

  getEl("setlist-response", i).classList.remove("d-none");
  populateSetlistFromAPIFor(i, data);
}

function populateSetlistFromAPIFor(i, setlistFmData) {
  const cont = getEl('setlist-container', i);
  cont.innerHTML = '';

  setlistFmData.setlist[0].sets.set.forEach(setObj => {
    setObj.song.forEach(songObj => {
      const entry = {
        song: songObj.name || "",
        feat: "",
        note: "",
        comment: "",
        coverOf: ""
      };
      if (songObj.info) {
        if (/^\s*with\s+/i.test(songObj.info)) entry.feat = normalizeFeatText(songObj.info);
        else entry.comment = songObj.info;
      }
      if (songObj.with) entry.feat = normalizeFeatText(songObj.with.name);
      if (songObj.cover) entry.coverOf = songObj.cover.name;
      if (songObj.tape === true) entry.note = "tape";
      createSetlistItemFor(i, entry);
    });
  });
}

function createSetlistItemFor(i, data = {}) {
  const container = document.createElement('div');
  container.className = 'mb-2';

  const songLine = document.createElement('div');
  songLine.className = 'd-flex gap-1 mb-1';

  const songInput = document.createElement('input');
  songInput.type = 'text';
  songInput.value = data.song || '';
  songInput.className = 'form-control form-control-sm fw-bold';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-outline-danger btn-sm';
  removeBtn.style.fontSize = '8px';
  removeBtn.style.padding = '2px 6px';
  removeBtn.innerHTML = '&times;';
  removeBtn.onclick = () => container.remove();

  songLine.appendChild(songInput);
  songLine.appendChild(removeBtn);

  const smallFields = document.createElement('div');
  smallFields.className = 'd-flex gap-1';
  ['feat', 'note', 'comment', 'coverOf'].forEach(key => {
    if (key === 'note') {
      const select = document.createElement('select');
      select.className = 'form-select form-select-sm';
      ['', 'tape', 'incomplete', 'not recorded'].forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      });
      select.value = (data.note && ['tape','incomplete','not recorded'].includes(data.note)) ? data.note : '';
      smallFields.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = key;
      input.value = data[key] || '';
      input.className = 'form-control form-control-sm';
      smallFields.appendChild(input);
    }
  });

  container.appendChild(songLine);
  container.appendChild(smallFields);

  getEl('setlist-container', i).appendChild(container);
}

function createSecondaryMediaBlockGeneric(i) {
  const host = getEl("extra-media", i);
  const index = host.querySelectorAll(".media-block").length + 2;

  const row = document.createElement("div");
  row.className = "media-block media-row-secondary text-center mb-2";
  row.dataset.durationSec = "0";

  const label = document.createElement("div");
  label.className = "fw-bold mb-1";
  label.textContent = `Media #${index}`;

  const drop = document.createElement("div");
  drop.className = "border border-2 border-secondary rounded p-3 mb-2";
  drop.style.background = "#f8f9fa";
  drop.style.fontWeight = "bold";
  drop.style.fontSize = "12px";
  drop.textContent = "Drag & Drop additional media here";

  const grid = document.createElement("div");
  grid.className = "row g-2 justify-content-center";

  const colSize = document.createElement("div");
  colSize.className = "col-3";
  colSize.innerHTML = `<label class="form-label">Size</label>
    <input type="number" step="0.01" class="media-size form-control form-control-sm">`;

  const colUnit = document.createElement("div");
  colUnit.className = "col-2";
  colUnit.innerHTML = `<label class="form-label">Unit</label>
    <select class="media-unit form-select form-select-sm">
      <option>Gb</option><option>Mb</option><option>Kb</option>
    </select>`;

  const colType = document.createElement("div");
  colType.className = "col-3";
  colType.innerHTML = `<label class="form-label">Type</label>
    <input type="text" class="media-type form-control form-control-sm">`;

  grid.appendChild(colSize);
  grid.appendChild(colUnit);
  grid.appendChild(colType);

  row.appendChild(label);
  row.appendChild(drop);
  row.appendChild(grid);
  host.appendChild(row);

  drop.addEventListener("dragover", (e) => { e.preventDefault(); e.stopPropagation(); });
  drop.addEventListener("drop", async (e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    if (!files.length) return;

    await processFilesForBlock(files, {
      isPrimary: false,
      rowEl: row,
      sizeInput: row.querySelector(".media-size"),
      unitSelect: row.querySelector(".media-unit"),
      typeInput: row.querySelector(".media-type"),
    });
  });
}

function prepareEmptyShow(i) {
  const pre = getEl("specs-summary", i);
  if (pre) { pre.textContent = ""; pre.classList.add("d-none"); }
  const len = getEl("total-length", i);
  if (len) len.value = 0;
}

if (!window.mediaTools) {
  alert("❌ preload.js did not inject mediaTools – check main.js path.");
}

function convertLang(code) {
  if (!code || typeof code !== "string") return "";
  const map = { eng: "en", fre: "fr", ger: "de", ita: "it", spa: "es", por: "pt", rus: "ru", jpn: "ja" };
  const out = map[code.toLowerCase()] || code;
  return out.toLowerCase() === "und" ? "" : out;
}

function normalizeFeatText(s) {
  if (!s) return "";
  return String(s).replace(/^\s*with\s+/i, "").trim();
}

function inferTvFormatFromStream(stream) {
  const h = stream.height;
  let fps = "";
  if (stream.avg_frame_rate && stream.avg_frame_rate !== "0/0") {
    const [a, b] = stream.avg_frame_rate.split('/');
    fps = (Number(a) / Number(b));
  }
  if (h === 576 || Math.abs(fps - 25) < 0.5) return "PAL";
  if (h === 480 || Math.abs(fps - 29.97) < 0.5 || Math.abs(fps - 30) < 0.5) return "NTSC";
  return "";
}

function detectLetterboxed(stream) {
  if (!stream.width || !stream.height) return false;

  const w = stream.width;
  const h = stream.height;
  const resRatio = w / h;
  const dar = stream.display_aspect_ratio || "";
  const isDvdFrame = (w === 720 && (h === 480 || h === 576));

  if (isDvdFrame && dar.includes("16:9")) {
    return true;
  }

  if (Math.abs(resRatio - 4 / 3) < 0.05 && (dar.includes("16:9") || Math.abs(eval(dar) - 16 / 9) < 0.05)) {
    return true;
  }

  return false;
}

function parseRate(fr) {
  if (!fr || fr === "0/0") return null;
  const [a, b] = fr.split("/").map(Number);
  if (!a || !b) return null;
  return a / b;
}

function pickNiceCodec(stream) {
  const name = (stream.codec_name || "").toUpperCase();
  let pretty = name;

  const map = {
    "MPEG2VIDEO": "MPEG2"
  };
  if (map[name]) pretty = map[name];

  return pretty || "UNKNOWN";
}

function computeFps(stream) {
  let fps = parseRate(stream.avg_frame_rate) ?? parseRate(stream.r_frame_rate);
  const h = stream.height;
  const isSD = h === 576 || h === 480;
  if (isSD && fps && fps > 49 && fps < 51) fps = 25;
  if (isSD && fps && fps > 59 && fps < 61) fps = 29.97;

  return fps ? fps.toFixed(2) : "";
}

function pickBitrateKbps(stream, ff) {
  const br = stream.bit_rate || ff?.format?.bit_rate;
  return br ? Math.round(Number(br) / 1000) : null;
}

function parseSpecs(ffprobeData) {
  const specs = {
    video: [],
    audio: []
  };

  for (const stream of ffprobeData.streams) {
    if (stream.codec_type === "video") {
      const standard = pickNiceCodec(stream);
      let alt = cleanStr((stream.codec_tag_string || stream.codec_name || "").toUpperCase());

      if (alt === "MPEG2VIDEO") alt = "MPEG2";
      if (alt === "DVVIDEO") alt = "DV";
      if (alt === "[0][0][0][0]") alt = "";
	  if (alt === "[27][0][0][0]") alt = "";

      const codec = (alt && alt !== standard) ? alt : "";

      specs.video.push({
        tvFormat: cleanStr(inferTvFormatFromStream(stream) || ""),
        ratio: cleanStr(stream.display_aspect_ratio || ""),
        resolution: cleanStr((stream.width && stream.height) ? `${stream.width}x${stream.height}` : ""),
        bitrateType: "",
        bitrateKbps: pickBitrateKbps(stream, ffprobeData),
        fps: cleanStr(computeFps(stream)),
        standard,
        codec,
        letterboxed: !!detectLetterboxed(stream)
      });
    }

    if (stream.codec_type === "audio") {
      const rawCodec = cleanStr((stream.codec_name || "").toUpperCase());
      const normalizedCodec = rawCodec.startsWith("PCM") ? "PCM" : rawCodec;

      let kbps = null;
      if (stream.bit_rate) kbps = cleanNum(Math.round(Number(stream.bit_rate) / 1000));
      else if (ffprobeData?.format?.bit_rate) kbps = cleanNum(Math.round(Number(ffprobeData.format.bit_rate) / 1000));

      specs.audio.push({
        language: cleanStr(stream.tags && convertLang(stream.tags.language)),
        codec: normalizedCodec,
        rateHz: cleanNum(stream.sample_rate),
        bitrateKbps: kbps,
        channels: cleanNum(stream.channels)
      });
    }
  }
  return specs;
}

function formatSpecsForDisplay(ffprobeData) {
  let videoLines = [];
  let audioLines = [];

  for (const stream of ffprobeData.streams) {
    if (stream.codec_type === "video") {
      const codec = pickNiceCodec(stream);
      const resolution = `${stream.width}x${stream.height}`;
      const fps = computeFps(stream);
      const bitrate = pickBitrateKbps(stream, ffprobeData);
      const br = (bitrate != null) ? `${bitrate}kbps` : "";
      videoLines.push(`Video: ${codec} ${resolution} ${fps}fps ${br}`);
    }

    if (stream.codec_type === "audio") {
      const rawCodec = (stream.codec_name || "").toUpperCase();
      const normalizedCodec = rawCodec.startsWith("PCM") ? "PCM" : rawCodec;

      const rate = stream.sample_rate ? stream.sample_rate + "Hz" : "";
      const channels =
        stream.channel_layout ||
        (stream.channels === 1 ? "mono" :
          stream.channels === 2 ? "stereo" : `${stream.channels}ch`);

      const brKbps = stream.bit_rate
        ? Math.round(stream.bit_rate / 1000)
        : (ffprobeData?.format?.bit_rate
          ? Math.round(Number(ffprobeData.format.bit_rate) / 1000)
          : null);

      const bitrate = brKbps != null ? `${brKbps}kbps` : "";

      audioLines.push(`Audio: ${normalizedCodec} ${rate} ${channels} ${bitrate}`);
    }
  }

  return [...videoLines, ...audioLines].join("\n");
}

function renderScreenshots(imgPaths, i = 1) {
  const host = getEl("shots-result", i);
  if (!host) return;

  host.innerHTML = "";
  const st = getShowState(i);
  st.generatedScreenshots = imgPaths;
  st.uploadedScreenshots = {};

  imgPaths.forEach(imgPath => {
    const wrap = document.createElement("div");
    const img = document.createElement("img");
    img.src = `file://${imgPath}?t=${Date.now()}`;
    img.style.width = "160px";
    img.style.border = "1px solid #ccc";

    const idLabel = document.createElement("div");
    idLabel.style.fontSize = "8px";
    idLabel.style.marginTop = "4px";

    const refreshBtn = document.createElement("button");
    refreshBtn.className = "btn btn-outline-secondary btn-sm mt-1";
    refreshBtn.textContent = "↻";
    refreshBtn.onclick = () => refreshScreenshotForShow(i, imgPath, wrap);

    st.uploadedScreenshots[imgPath] = { id: null, idLabel, refreshBtn };

    wrap.appendChild(img);
    wrap.appendChild(refreshBtn);
    wrap.appendChild(idLabel);
    host.appendChild(wrap);
  });

  updateUploadButtonState(i);
}

async function saveJson(index = 1) {
  const nowUnix = Math.floor(Date.now() / 1000);
  const rawSetlist = window.setlistData?.setlist?.[0];
  const root = getShowRoot(index);
  const chaptersName = (index === 1) ? "chapters" : `chapters${uidSuffix(index)}`;
  const menuName = (index === 1) ? "menu" : `menu${uidSuffix(index)}`;
  const chaptersVal = root.querySelector(`input[name="${chaptersName}"]:checked`)?.value === "yes";
  const menuVal = root.querySelector(`input[name="${menuName}"]:checked`)?.value === "yes";
  const recordingType = getEl("recordingType", index)?.value || "";
  const sourceMediaType = getEl("sourceMediaType", index)?.value?.trim() || "";
  const finalMediaType = getEl("finalMediaType", index)?.value?.trim() || "";
  const receivedInTrade = getEl("receivedTrade", index)?.checked || false;
  const traderName = (getEl("traderName", index)?.value || "").trim();

  let fileFormat = (getEl("fileFormat", index)?.value || "").trim();
  if (fileFormat.toLowerCase() === "vob") fileFormat = "DVD";

  let startDay, startMonth, startYear, startUnix;
  const manualDate = (getEl("loc-date", index)?.value || "").trim();
  if (manualDate) {
    const [d, m, y] = manualDate.split("-");
    startDay = d || "xx";
    startMonth = m || "xx";
    startYear = y || "xxxx";
    if (y && m && d) {
      const dateObj = Date.UTC(y, m - 1, d, 0, 0, 0);
      startUnix = Math.floor(dateObj / 1000);
    }
  } else if (rawSetlist?.eventDate) {
    const [day, month, year] = rawSetlist.eventDate.split("-");
    startDay = day;
    startMonth = month;
    startYear = year;
    const dateObj = Date.UTC(year, month - 1, day, 0, 0, 0);
    startUnix = Math.floor(dateObj / 1000);
  }

  const city = (getEl("city", index)?.value || "").trim();
  const country = (getEl("loc-country", index)?.value || "").trim();
  const venueName = (getEl("loc-venue", index)?.value || "").trim();
  const eventName = (getEl("loc-event", index)?.value || "").trim();
  let state = "";
  const allowedCountries = ["United States", "USA", "Canada", "Australia"];
  if (allowedCountries.includes(country)) {
    state = (getEl("state", index)?.value || "").trim();
  }

  const locationObj = { city, state, country, venue: venueName, event: eventName };

  const st = getShowState(index);
  const images = Object.entries(st.uploadedScreenshots || {}).map(([path, data]) => ({
    folder: "2025",
    filename: path.split(/[/\\]/).pop(),
    externalId: data.id
  }));

  const tapers = [];
  {
    const taperRoot = getEl("taper-fields", index) || document;
    taperRoot.querySelectorAll(".taper-input").forEach(input => {
      const val = input.value.trim();
      if (val) tapers.push(val);
    });
  }

  const { setlist, extras } = exportSetlistAndExtrasFor(index);

  function buildOriginalTitle(json) {
    const band = json.bands.join(", ");
    const dd = json.startDate?.day || "xx";
    const mm = json.startDate?.month || "xx";
    const yy = json.startDate?.year || "xxxx";
    const datePart = `${dd}.${mm}.${yy}`;

    const parts = [];
    if (json.location.city) parts.push(json.location.city);
    if (json.location.state) parts.push(json.location.state);
    if (json.location.country) parts.push(json.location.country);
    if (json.location.venue) parts.push(json.location.venue);
    if (json.location.event) parts.push(json.location.event);
    const locationPart = parts.length ? " - " + parts.join(" - ") : "";

    const sourcePart = json.source ? ` (${json.source})` : "";

    const categoryTags = [];
    if (json.category.includes("audio")) categoryTags.push("[AUDIO]");
    if (json.category.includes("misc")) categoryTags.push("[MISC]");
    const categoryPart = categoryTags.length ? " " + categoryTags.join(" ") : "";

    return `${band} - ${datePart}${locationPart}${sourcePart}${categoryPart}`;
  }

  const media = [];
  media.push({
    type: (getEl("specs-type", index)?.value || "").trim(),
    size: parseFloat(getEl("specs-size", index)?.value || "0") || 0,
    unit: (getEl("specs-unit", index)?.value || "").trim()
  });

  const extraMediaRoot = getEl("extra-media", index);
  if (extraMediaRoot) {
    extraMediaRoot.querySelectorAll(".media-row-secondary").forEach(row => {
      const sizeInput = row.querySelector(".media-size");
      const unitSelect = row.querySelector(".media-unit");
      const typeInput = row.querySelector(".media-type");
      media.push({
        type: (typeInput?.value || "").trim(),
        size: parseFloat(sizeInput?.value || "0") || 0,
        unit: (unitSelect?.value || "").trim()
      });
    });
  }

  const lengthVal = parseInt(getEl("total-length", index)?.value || "0", 10) || 0;

  const finalJson = {
    originalTitle: "",
    created: nowUnix,
    lastUpdated: nowUnix,
    bands: [(getEl('bandName', index)?.value || "").trim()],
    startDate: { day: startDay, month: startMonth, year: startYear },
    endDate: { day: startDay, month: startMonth, year: startYear },
    startDateUnix: startUnix,
    endDateUnix: startUnix,
    location: locationObj,
    tvChannel: (getEl('tvChannel', index)?.value || "").trim(),
    showName: (getEl('showName', index)?.value || "").trim(),
    source: (getEl('source', index)?.value || "").trim(),
    category: [...new Set([...root.querySelectorAll('input[name="category"]:checked')].map(cb => cb.value))],
    master: root.querySelector(`input[name="${(index === 1 ? 'master' : `master${uidSuffix(index)}`)}"]:checked`)?.value === "yes",
    public: root.querySelector(`input[name="${(index === 1 ? 'public' : `public${uidSuffix(index)}`)}"]:checked`)?.value === "yes",
    ownIdentifier: (getEl('ownIdentifier', index)?.value || "").trim(),
    tradeLabel: (() => {
      const val = (getEl('tradeLabel', index)?.value || "").trim();
      return val === "Regular" ? "" : val;
    })(),
    authoredBy: (getEl('authoredBy', index)?.value || "").trim(),
    transferredBy: (getEl('transferredBy', index)?.value || "").trim(),
    notes: (getEl('notes', index)?.value || "").trim(),
    tapers,
    receivedInTrade,
    trader: receivedInTrade ? traderName : "",
    specs: {
      media,
      chapters: chaptersVal,
      menu: menuVal,
      length: lengthVal,
      video: st.probeData ? parseSpecs(st.probeData).video : [],
      audio: st.probeData ? parseSpecs(st.probeData).audio : [],
      sourceDetail: {
        recordingType,
        sourceMediaType,
        finalMediaType,
        fileFormat
      }
    },
    images,
    setlist,
    extras,
    relatedShows: [],
    childOf: ""
  };

  finalJson.originalTitle = buildOriginalTitle(finalJson);

  const filename = buildFilename(finalJson);
  const targetDir = st.droppedFilePath
    ? window.mediaTools.getDirname(st.droppedFilePath)
    : (window.baseDir || "");

  if (!targetDir) {
    alert("Could not determine target folder to save JSON. Please drop at least one media file first.");
    return;
  }

  const outPath = window.mediaTools.pathJoin(targetDir, filename + '.json');
  const jsonStr = JSON.stringify(finalJson, null, 2);
  await window.mediaTools.writeFile(outPath, jsonStr);

  await window.appAPI.updateTapersIndex(tapers, filename);
  if (receivedInTrade && traderName) {
    await window.appAPI.updateTradersIndex([traderName], filename);
  }

  alert(`✅ Saved to: ${outPath}`);
  return { filename, outPath, json: finalJson };
}

async function saveAllJsons() {
  const hasRelatedEl = document.getElementById("hasRelated");
  const count = hasRelatedEl.checked
    ? (parseInt(document.getElementById("relatedCount").value || "1", 10) + 1)
    : 1;

  const results = [];
  for (let i = 1; i <= count; i++) {
    const r = await saveJson(i);
    results.push(r);
  }

  const names = results.map(r => r.filename);
  const nameSet = new Set(names);

  for (let i = 0; i < results.length; i++) {
    const me = results[i];
    const others = names.filter(n => n !== me.filename);
    me.json.relatedShows = others;

    const jsonStr = JSON.stringify(me.json, null, 2);
    await window.mediaTools.writeFile(me.outPath, jsonStr);
  }

  alert("✅ Saved all JSONs with relatedShows populated.");
}

window.refreshScreenshot = (oldPath, container) => {
  const holder = container.closest(".related-show");
  const i = holder ? Number(holder.dataset.showIndex) : 1;
  return refreshScreenshotForShow(i, oldPath, container);
};

function reindex(containerId) {
  const items = document.querySelectorAll(`#${containerId} .order-label`);
  items.forEach((el, idx) => {
    el.textContent = idx + 1;
  });
}

function createSetlistItem(data = {}) {
  const container = document.createElement('div');
  container.className = 'mb-2';

  const songLine = document.createElement('div');
  songLine.className = 'd-flex gap-1 mb-1';

  const songInput = document.createElement('input');
  songInput.type = 'text';
  songInput.value = data.song || '';
  songInput.className = 'form-control form-control-sm fw-bold';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-outline-danger btn-sm';
  removeBtn.style.fontSize = '8px';
  removeBtn.style.padding = '2px 6px';
  removeBtn.innerHTML = '&times;';
  removeBtn.onclick = () => container.remove();

  songLine.appendChild(songInput);
  songLine.appendChild(removeBtn);

  const smallFields = document.createElement('div');
  smallFields.className = 'd-flex gap-1';

  ['feat', 'note', 'comment', 'coverOf'].forEach(key => {
    if (key === 'note') {
      const select = document.createElement('select');
      select.className = 'form-select form-select-sm';
      ['', 'tape', 'incomplete', 'not recorded'].forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      });
      select.value = (data.note && ['tape','incomplete','not recorded'].includes(data.note)) ? data.note : '';
      smallFields.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = key;
      input.value = data[key] || '';
      input.className = 'form-control form-control-sm';
      smallFields.appendChild(input);
    }
  });

  container.appendChild(songLine);
  container.appendChild(smallFields);

  document.getElementById('setlist-container').appendChild(container);
}

function createExtraItem(data = {}) {
  const container = document.createElement('div');
  container.className = 'mb-2';

  const songLine = document.createElement('div');
  songLine.className = 'd-flex gap-1 mb-1';

  const songInput = document.createElement('input');
  songInput.type = 'text';
  songInput.value = data.song || '';
  songInput.className = 'form-control form-control-sm fw-bold';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-outline-danger btn-sm';
  removeBtn.style.fontSize = '8px';
  removeBtn.style.padding = '2px 6px';
  removeBtn.innerHTML = '&times;';
  removeBtn.onclick = () => container.remove();

  songLine.appendChild(songInput);
  songLine.appendChild(removeBtn);

  const smallFields = document.createElement('div');
  smallFields.className = 'd-flex gap-1';

  ['feat', 'note', 'comment', 'coverOf'].forEach(key => {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = key;
    input.value = data[key] || '';
    input.className = 'form-control form-control-sm';
    smallFields.appendChild(input);
  });

  container.appendChild(songLine);
  container.appendChild(smallFields);

  document.getElementById('extras-container').appendChild(container);
}

document.getElementById('add-setlist-item').onclick = () => createSetlistItem();
document.getElementById('add-extra-item').onclick = () => createExtraItem();

function populateSetlistFromAPI(setlistFmData) {
  document.getElementById('setlist-container').innerHTML = '';

  setlistFmData.setlist[0].sets.set.forEach(setObj => {
    setObj.song.forEach(songObj => {
      const entry = {
        song: songObj.name || "",
        feat: "",
        note: "",
        comment: "",
        coverOf: ""
      };

      if (songObj.info) {
        if (/^\s*with\s+/i.test(songObj.info)) {
          entry.feat = normalizeFeatText(songObj.info);
        } else {
          entry.comment = songObj.info;
        }
      }

      if (songObj.with) {
        entry.feat = normalizeFeatText(songObj.with.name);
      }

      if (songObj.cover) {
        entry.coverOf = songObj.cover.name;
      }

      if (songObj.tape === true) {
        entry.note = "tape";
      }

      createSetlistItem(entry);
    });
  });
}

function exportSetlistAndExtras() {
  const setlist = [];
  document.querySelectorAll('#setlist-container > div').forEach((el, idx) => {
    const songInput = el.querySelector('.d-flex input.form-control.fw-bold') || el.querySelector('.d-flex input');
    const small = el.querySelector('.d-flex.gap-1');
    const featInput = small?.querySelector('input[placeholder="feat"]');
    const noteSelect = small?.querySelector('select');
    const noteInputFallback = small?.querySelector('input[placeholder="note"]');
    const commentInput = small?.querySelector('input[placeholder="comment"]');
    const coverInput = small?.querySelector('input[placeholder="coverOf"]');

    setlist.push({
      order: idx + 1,
      song: (songInput?.value || '').trim(),
      feat: (featInput?.value || '').trim(),
      note: ((noteSelect?.value ?? '') || (noteInputFallback?.value ?? '')).trim(),
      comment: (commentInput?.value || '').trim(),
      coverOf: (coverInput?.value || '').trim()
    });
  });

  const extras = [];
  document.querySelectorAll('#extras-container > div').forEach((el, idx) => {
    const inputs = el.querySelectorAll('input');
    extras.push({
      order: idx + 1,
      song: inputs[0].value.trim(),
      feat: inputs[1].value.trim(),
      note: inputs[2].value.trim(),
      comment: inputs[3].value.trim(),
      coverOf: inputs[4].value.trim()
    });
  });

  return { setlist, extras };
}

function exportSetlistAndExtrasFor(index = 1) {
  const setlistCont = getEl('setlist-container', index);
  const extrasCont = getEl('extras-container', index);

  const setlist = [];
  if (setlistCont) {
    setlistCont.querySelectorAll(':scope > div').forEach((el, idx) => {
      const songInput = el.querySelector('.d-flex input.form-control.fw-bold') || el.querySelector('.d-flex input');
      const small = el.querySelector('.d-flex.gap-1');
      const featInput = small?.querySelector('input[placeholder="feat"]');
      const noteSelect = small?.querySelector('select');
      const noteInputFallback = small?.querySelector('input[placeholder="note"]');
      const commentInput = small?.querySelector('input[placeholder="comment"]');
      const coverInput = small?.querySelector('input[placeholder="coverOf"]');

      setlist.push({
        order: idx + 1,
        song: (songInput?.value || '').trim(),
        feat: (featInput?.value || '').trim(),
        note: ((noteSelect?.value ?? '') || (noteInputFallback?.value ?? '')).trim(),
        comment: (commentInput?.value || '').trim(),
        coverOf: (coverInput?.value || '').trim()
      });
    });
  }

  const extras = [];
  if (extrasCont) {
    extrasCont.querySelectorAll(':scope > div').forEach((el, idx) => {
      const inputs = el.querySelectorAll('input');
      extras.push({
        order: idx + 1,
        song: (inputs[0]?.value || '').trim(),
        feat: (inputs[1]?.value || '').trim(),
        note: (inputs[2]?.value || '').trim(),
        comment: (inputs[3]?.value || '').trim(),
        coverOf: (inputs[4]?.value || '').trim()
      });
    });
  }

  return { setlist, extras };
}