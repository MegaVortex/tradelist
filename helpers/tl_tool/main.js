// main.js
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const { spawn } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const https = require("https");
const { google } = require('googleapis');
const EQUIPMENT_JSON_PATH = "C:\\Users\\ovech\\Documents\\new_trade_list\\tl_web\\helpers\\tl_tool\\lib\\equipment.json";

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  return fsp.mkdir(dir, { recursive: true }).catch(() => { });
}

function normalizeList(arr) {
  return Array.isArray(arr) ? arr.filter(Boolean).map(s => String(s).trim()).filter(Boolean) : [];
}

function mergeDedupeCaseInsensitive(existing, incoming) {
  const out = [...existing];
  for (const v0 of incoming) {
    const v = (v0 || "").trim();
    if (!v) continue;
    const exists = out.some(x => String(x).toLowerCase() === v.toLowerCase());
    if (!exists) out.push(v);
  }
  return out;
}

ipcMain.handle("updateEquipmentIndex", async (_evt, payload = {}) => {
  const {
    file = EQUIPMENT_JSON_PATH,
    audioItems = [],
    videoItems = [],
  } = payload;

  await ensureDirFor(file);

  let current = { audio: [], video: [] };
  try {
    const raw = await fsp.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    current.audio = normalizeList(parsed.audio);
    current.video = normalizeList(parsed.video);
  } catch (e) {
    console.warn("equipment.json read issue (will re-init if needed):", e?.message);
  }

  const next = {
    audio: mergeDedupeCaseInsensitive(current.audio, normalizeList(audioItems)),
    video: mergeDedupeCaseInsensitive(current.video, normalizeList(videoItems)),
  };

  const out = JSON.stringify(next, null, 2);
  await fsp.writeFile(file, out, "utf8");

  return next;
});

function ffmpegGrab(file, tSec, outDir) {
  return new Promise((resolve, reject) => {
    const out = path.join(outDir, `shot_${Math.floor(tSec * 1000)}.jpg`);
    const args = ['-ss', String(tSec), '-i', file, '-frames:v', '1', '-q:v', '2', out, '-y'];
    const p = spawn('ffmpeg', args);
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve(out) : reject(new Error('ffmpeg exited ' + code)));
  });
}

ipcMain.handle("app:select-images", async (event, { allowMultiple }) => {
  const win = BrowserWindow.getFocusedWindow();
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: [
      "openFile",
      allowMultiple ? "multiSelections" : undefined,
    ].filter(Boolean),
    filters: [
      { name: "Images", extensions: ["jpg", "jpeg", "png", "gif"] },
    ],
  });

  return filePaths || [];
});

ipcMain.handle('media:captureAt', async (_e, { file, timesSecArray, outDir }) => {
  const dir = outDir || await fsp.mkdtemp(path.join(os.tmpdir(), 'shots-'));
  const out = [];
  for (const t of timesSecArray) out.push(await ffmpegGrab(file, Math.max(0, Number(t) || 0), dir));
  return out;
});

ipcMain.handle('media:captureRange', async (_e, { file, startSec, endSec, count, outDir }) => {
  const dir = outDir || await fsp.mkdtemp(path.join(os.tmpdir(), 'shots-'));
  const s = Math.max(0, Number(startSec) || 0);
  const e = Math.max(s, Number(endSec) || s);
  const n = Math.max(1, Number(count) || 4);
  const steps = (n === 1) ? [(s + e) / 2] : Array.from({ length: n }, (_, k) => s + ((e - s) * (k / (n - 1))));
  const out = [];
  for (const t of steps) out.push(await ffmpegGrab(file, t, dir));
  return out;
});

ipcMain.handle("update-tapers-index", async (event, { tapers, filename }) => {
  const indexPath = "C:\\Users\\ovech\\Documents\\new_trade_list\\tl_web\\src\\tapers\\tapers_index.json";

  /** Load existing (support old object schema and new array schema) */
  let list = [];
  try {
    if (fs.existsSync(indexPath)) {
      const raw = fs.readFileSync(indexPath, "utf-8").trim();
      if (raw.length > 0) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed;
        } else if (parsed && typeof parsed === "object") {
          // old schema: { "TaperName": ["show_a", "show_b"], ... }
          list = Object.keys(parsed).map(name => ({
            name,
            website: "",
            shows: Array.isArray(parsed[name]) ? parsed[name] : []
          }));
        }
      }
    }
  } catch (err) {
    console.warn("⚠ Failed to read/parse tapers index:", err.message);
  }

  /** Merge: preserve website; only append missing show slugs */
  for (const name of tapers) {
    if (!name) continue;
    let entry = list.find(e => e && e.name === name);
    if (!entry) {
      entry = { name, website: "", shows: [] };
      list.push(entry);
    }
    if (!entry.shows.includes(filename)) {
      entry.shows.push(filename);
    }
  }

  fs.writeFileSync(indexPath, JSON.stringify(list, null, 2), "utf-8");
  console.log("✅ tapers_index.json updated successfully");
  return true;
});

const TRADERS_INDEX_PATH = "C:\\Users\\ovech\\Documents\\new_trade_list\\tl_web\\src\\traders\\traders_index.json";

ipcMain.handle("update-traders-index", async (event, { traders, filename }) => {
  try {
    fs.mkdirSync(path.dirname(TRADERS_INDEX_PATH), { recursive: true });

    /** Load existing (support old object schema and new array schema) */
    let list = [];
    if (fs.existsSync(TRADERS_INDEX_PATH)) {
      const raw = fs.readFileSync(TRADERS_INDEX_PATH, "utf-8").trim();
      if (raw.length > 0) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed;
        } else if (parsed && typeof parsed === "object") {
          list = Object.keys(parsed).map(name => ({
            name,
            website: "",
            shows: Array.isArray(parsed[name]) ? parsed[name] : []
          }));
        }
      }
    }

    /** Merge: preserve website; only append missing show slugs */
    for (const name of traders) {
      if (!name) continue;
      let entry = list.find(e => e && e.name === name);
      if (!entry) {
        entry = { name, website: "", shows: [] };
        list.push(entry);
      }
      if (!entry.shows.includes(filename)) {
        entry.shows.push(filename);
      }
    }

    fs.writeFileSync(TRADERS_INDEX_PATH, JSON.stringify(list, null, 2), "utf-8");
    console.log("✅ traders_index.json updated successfully");
    return true;
  } catch (err) {
    console.error("❌ Failed to update traders_index.json:", err);
    throw err;
  }
});

ipcMain.handle("save-json-file", async (event, content) => {
  const win = BrowserWindow.getFocusedWindow();
  const { filePath } = await dialog.showSaveDialog(win, {
    defaultPath: path.join(__dirname, "2025", "new_show.json"),
    filters: [{ name: "JSON Files", extensions: ["json"] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, content, "utf8");
    return { success: true, filePath };
  } else {
    return { success: false };
  }
});

const driveFolderId = "1H3C6E52DtJGWuNuu3TqRVH8PI8h4ttQI";
const ROOT_DIR = path.resolve(__dirname, "..", "..", "..");
const CREDENTIALS_PATH = path.join(ROOT_DIR, "credentials.json");
const TOKEN_PATH = path.join(ROOT_DIR, "token.json");
const CREDENTIALS = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

let oauth2Client;

function createOAuth2Client() {
  oauth2Client = new google.auth.OAuth2(
    CREDENTIALS.installed.client_id,
    CREDENTIALS.installed.client_secret,
    CREDENTIALS.installed.redirect_uris[0]
  );

  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    oauth2Client.setCredentials(tokens);
  }
}

app.whenReady().then(() => {
  createOAuth2Client();

  const preloadPath = path.join(__dirname, "preload.js");

  if (!fs.existsSync(preloadPath)) {
    console.error("❌ preload.js not found at:", preloadPath);
    app.quit();
    return;
  }

  console.log("✅ Using preload path:", preloadPath);

  const win = new BrowserWindow({
    width: 900,
    height: 750,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
  });

  win.loadFile("index.html");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("setlist-lookup", async (event, options) => {
  const { url, apiKey } = options;

  return new Promise((resolve, reject) => {
    const httpsOptions = {
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey,
        'User-Agent': 'Show Info Tool'
      }
    };

    https.get(url, httpsOptions, (res) => {
      let data = "";
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    }).on('error', err => {
      reject(err);
    });
  });
});

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");

  if (!fs.existsSync(preloadPath)) {
    console.error("❌ preload.js not found at:", preloadPath);
    app.quit();
    return;
  }

  console.log("✅ Using preload path:", preloadPath);

  const win = new BrowserWindow({
    width: 900,
    height: 750,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
  });

  win.loadFile("index.html");
}

ipcMain.handle("get-auth-url", () => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });
  return authUrl;
});

ipcMain.handle("set-auth-code", async (event, code) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  return tokens;
});

ipcMain.handle("upload-to-drive", async (event, filePath) => {
  if (!oauth2Client || !oauth2Client.credentials) {
    throw new Error("No valid OAuth2 token set. Please login first.");
  }

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const res = await drive.files.create({
    resource: {
      name: path.basename(filePath),
      parents: [driveFolderId]
    },
    media: { body: fs.createReadStream(filePath) },
    fields: "id",
  });

  return res.data;
});

ipcMain.handle("drive:setPermission", async (event, fileId, permission) => {
  if (!oauth2Client || !oauth2Client.credentials) {
    throw new Error("No valid OAuth2 token set. Please login first.");
  }

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: permission.role || "reader",
        type: permission.type || "anyone"
      }
    });

    return { success: true };
  } catch (err) {
    console.error("Failed to set permission:", err);
    throw new Error(err.message);
  }
});

ipcMain.handle("open-auth-window", async (event, authUrl) => {
  const { BrowserWindow } = require("electron");

  return new Promise((resolve, reject) => {
    const authWin = new BrowserWindow({
      width: 500,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    authWin.loadURL(authUrl);

    authWin.webContents.on("will-redirect", (e, url) => {
      if (url.startsWith("http://localhost")) {
        const matched = url.match(/code=([^&]+)/);
        if (matched) {
          const code = decodeURIComponent(matched[1]);
          authWin.close();
          event.sender.send("auth-code", code);
          resolve();
        }
      }
    });

    authWin.on("closed", () => {
      reject(new Error("Auth window closed by user."));
    });
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});