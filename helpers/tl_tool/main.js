const crypto = require("crypto");
const fs = require("fs");
const fsp = fs.promises;
const https = require("https");
const path = require("path");
const { pathToFileURL } = require("url");

const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { google } = require("googleapis");

const { captureScreenshot, probeFile } = require("./lib/media-tools");

const {
  PathAuthorizer,
  isTrustedRendererUrl,
  normalizeAbsolutePath,
  validateImagePath,
  validateJsonContent,
  validateJsonFilename,
  validateSetlistLookup,
  validateStringList,
} = require("./lib/security");

const PROJECT_DIR = path.resolve(__dirname, "..", "..");
const PRIVATE_CONFIG_DIR = path.dirname(PROJECT_DIR);
const RENDERER_PATH = path.join(__dirname, "index.html");
const PRELOAD_PATH = path.join(__dirname, "preload.js");
const EQUIPMENT_JSON_PATH = path.join(__dirname, "lib", "equipment.json");
const TAPERS_INDEX_PATH = path.join(
  PROJECT_DIR,
  "src",
  "tapers",
  "tapers_index.json",
);
const TRADERS_INDEX_PATH = path.join(
  PROJECT_DIR,
  "src",
  "traders",
  "traders_index.json",
);
const SETLIST_KEY_PATH = path.join(PRIVATE_CONFIG_DIR, "apiKey.json");
const CREDENTIALS_PATH = path.join(PRIVATE_CONFIG_DIR, "credentials.json");
const TOKEN_PATH = path.join(PRIVATE_CONFIG_DIR, "token.json");
const DRIVE_FOLDER_ID = "1H3C6E52DtJGWuNuu3TqRVH8PI8h4ttQI";
const MIRROR_DIRECTORIES = Object.freeze({
  regular: path.join(PROJECT_DIR, "src", "data"),
  compilation: path.join(PROJECT_DIR, "src", "data-comp"),
  va: path.join(PROJECT_DIR, "src", "data-va"),
});

const pathAuthorizer = new PathAuthorizer();
let appTempDirectory;
let mainWindow;
let oauth2Client;
let smokeMediaPath;

function normalizeList(values) {
  return Array.isArray(values)
    ? values.map((value) => String(value).trim()).filter(Boolean)
    : [];
}

function mergeDedupeCaseInsensitive(existing, incoming) {
  const output = [...existing];
  for (const value of incoming) {
    if (
      !output.some(
        (existingValue) =>
          String(existingValue).toLowerCase() === value.toLowerCase(),
      )
    ) {
      output.push(value);
    }
  }
  return output;
}

function validateShowSlug(value) {
  validateJsonFilename(`${value}.json`);
  return value;
}

function assertTrustedSender(event) {
  const trusted =
    mainWindow &&
    !mainWindow.isDestroyed() &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame &&
    isTrustedRendererUrl(event.senderFrame?.url, RENDERER_PATH);

  if (!trusted) {
    throw new Error("Unauthorized IPC sender");
  }
}

function registerHandler(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    assertTrustedSender(event);
    return handler(event, ...args);
  });
}

async function resolveExistingPath(targetPath) {
  const normalized = normalizeAbsolutePath(targetPath);
  return fsp.realpath(normalized);
}

async function requireReadablePath(targetPath) {
  const resolved = await resolveExistingPath(targetPath);
  if (!pathAuthorizer.canRead(resolved)) {
    throw new Error("Path is outside the authorized workspace");
  }
  return resolved;
}

async function requireWritableDestination(targetPath) {
  const normalized = normalizeAbsolutePath(targetPath);
  const parentDirectory = await fsp.realpath(path.dirname(normalized));
  const destination = path.join(parentDirectory, path.basename(normalized));

  if (!pathAuthorizer.canWrite(destination)) {
    throw new Error("Path is outside the authorized workspace");
  }

  try {
    const stats = await fsp.lstat(destination);
    if (stats.isSymbolicLink()) {
      throw new Error("Symbolic-link destinations are not allowed");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return destination;
}

async function writeJsonFile(destination, content) {
  validateJsonContent(content);
  validateJsonFilename(path.basename(destination));
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  try {
    const stats = await fsp.lstat(destination);
    if (stats.isSymbolicLink()) {
      throw new Error("Symbolic-link destinations are not allowed");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fsp.writeFile(destination, `${content.trimEnd()}\n`, "utf8");
}

async function updatePeopleIndex(indexPath, names, filename, fieldName) {
  validateStringList(names, fieldName);
  validateShowSlug(filename);
  await fsp.mkdir(path.dirname(indexPath), { recursive: true });

  let list = [];
  try {
    const raw = await fsp.readFile(indexPath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && typeof parsed === "object") {
      list = Object.keys(parsed).map((name) => ({
        name,
        website: "",
        shows: Array.isArray(parsed[name]) ? parsed[name] : [],
      }));
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not read ${fieldName} index:`, error.message);
    }
  }

  for (const name of names) {
    let entry = list.find((candidate) => candidate?.name === name);
    if (!entry) {
      entry = { name, website: "", shows: [] };
      list.push(entry);
    }
    if (!Array.isArray(entry.shows)) entry.shows = [];
    if (!entry.shows.includes(filename)) entry.shows.push(filename);
  }

  await fsp.writeFile(indexPath, `${JSON.stringify(list, null, 2)}\n`, "utf8");
  return true;
}

function readSetlistApiKey() {
  const parsed = JSON.parse(fs.readFileSync(SETLIST_KEY_PATH, "utf8"));
  const key = String(parsed.key || "").trim();
  if (!key) throw new Error("Setlist API key is unavailable");
  return key;
}

function httpsGetText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers, timeout: 20000 },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
          if (body.length > 5 * 1024 * 1024) {
            request.destroy(new Error("Remote response is too large"));
          }
        });
        response.on("end", () =>
          resolve({ status: response.statusCode, body }),
        );
      },
    );
    request.on("timeout", () => request.destroy(new Error("Request timed out")));
    request.on("error", reject);
  });
}

async function lookupSetlist(options) {
  const lookup = validateSetlistLookup(options);
  const apiKey = readSetlistApiKey();
  const apiUrl = new URL("https://api.setlist.fm/rest/1.0/search/setlists");
  apiUrl.searchParams.set("artistName", lookup.band);

  if (lookup.date) {
    apiUrl.searchParams.set("date", lookup.date);
    if (lookup.city) apiUrl.searchParams.set("cityName", lookup.city);
  } else {
    if (lookup.city) apiUrl.searchParams.set("cityName", lookup.city);
    if (lookup.year) apiUrl.searchParams.set("year", lookup.year);
  }

  const result = await httpsGetText(apiUrl, {
    Accept: "application/json",
    "x-api-key": apiKey,
    "User-Agent": "Show Info Tool",
  });

  let eventName = "";
  if (result.status === 200) {
    try {
      const parsed = JSON.parse(result.body);
      const first = parsed?.setlist?.[0];
      if (first?.eventDate) {
        const searchUrl = new URL("https://www.setlist.fm/search");
        searchUrl.searchParams.set(
          "query",
          `${lookup.band} ${first.venue?.city?.name || lookup.city} ${
            first.eventDate.split("-")[2] || lookup.year
          }`,
        );
        const searchResult = await httpsGetText(searchUrl, {
          "User-Agent": "Show Info Tool",
        });
        const match = searchResult.body.match(
          /<h2><a .*?title="View this .*? setlist">.*? at (.*?)<\/a><\/h2>/i,
        );
        eventName = match ? match[1].trim() : "";
      }
    } catch (error) {
      console.warn("Could not derive the setlist event name:", error.message);
    }
  }

  return { ...result, eventName };
}

function createOAuth2Client() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const installed = credentials.installed;
  if (!installed?.client_id || !installed?.client_secret || !installed?.redirect_uris?.[0]) {
    throw new Error("Invalid Google OAuth credentials");
  }

  oauth2Client = new google.auth.OAuth2(
    installed.client_id,
    installed.client_secret,
    installed.redirect_uris[0],
  );

  if (fs.existsSync(TOKEN_PATH)) {
    oauth2Client.setCredentials(
      JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8")),
    );
  }
}

function requireOAuthClient() {
  if (!oauth2Client) throw new Error("Google Drive authentication is unavailable");
  return oauth2Client;
}

function isGoogleAuthUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "google.com" ||
        url.hostname.endsWith(".google.com") ||
        url.hostname.endsWith(".googleusercontent.com"))
    );
  } catch {
    return false;
  }
}

async function authenticateDrive() {
  const client = requireOAuthClient();
  if (client.credentials?.refresh_token || client.credentials?.access_token) {
    return { authenticated: true, cached: true };
  }

  const state = crypto.randomBytes(24).toString("base64url");
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    state,
  });
  if (!isGoogleAuthUrl(authUrl)) throw new Error("Invalid OAuth URL");

  return new Promise((resolve, reject) => {
    let settled = false;
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        safeDialogs: true,
      },
    });

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      if (!authWindow.isDestroyed()) authWindow.close();
      if (error) reject(error);
      else resolve(result);
    };

    const inspectNavigation = async (event, targetUrl) => {
      let parsed;
      try {
        parsed = new URL(targetUrl);
      } catch {
        event.preventDefault();
        return;
      }

      const isLoopback =
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname);
      if (isLoopback) {
        event.preventDefault();
        if (parsed.searchParams.get("state") !== state) {
          finish(new Error("OAuth state validation failed"));
          return;
        }
        const code = parsed.searchParams.get("code");
        if (!code) {
          finish(new Error("OAuth authorization code is missing"));
          return;
        }
        try {
          const { tokens } = await client.getToken(code);
          client.setCredentials(tokens);
          await fsp.writeFile(TOKEN_PATH, JSON.stringify(tokens), {
            encoding: "utf8",
            mode: 0o600,
          });
          finish(null, { authenticated: true, cached: false });
        } catch (error) {
          finish(error);
        }
        return;
      }

      if (!isGoogleAuthUrl(targetUrl)) event.preventDefault();
    };

    authWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    authWindow.webContents.on("will-redirect", inspectNavigation);
    authWindow.webContents.on("will-navigate", inspectNavigation);
    authWindow.on("closed", () => {
      if (!settled) finish(new Error("Authentication window was closed"));
    });
    authWindow.loadURL(authUrl).catch(finish);
  });
}

function registerIpcHandlers() {
  registerHandler("media:authorize-dropped-path", async (_event, targetPath) => {
    const resolved = await resolveExistingPath(targetPath);
    const stats = await fsp.stat(resolved);
    return pathAuthorizer.authorizeWorkspacePath(resolved, stats.isDirectory());
  });

  registerHandler("media:is-directory", async (_event, targetPath) => {
    const resolved = await requireReadablePath(targetPath);
    return (await fsp.stat(resolved)).isDirectory();
  });

  registerHandler("media:probe", async (_event, targetPath) => {
    const resolved = await requireReadablePath(targetPath);
    return probeFile(resolved);
  });

  registerHandler(
    "media:capture-screenshots",
    async (_event, { filePath, timestamps, outDir }) => {
      const source = await requireReadablePath(filePath);
      if (
        !Array.isArray(timestamps) ||
        timestamps.length === 0 ||
        timestamps.length > 20 ||
        !timestamps.every(
          (timestamp) =>
            Number.isFinite(timestamp) && timestamp >= 0 && timestamp <= 172800,
        )
      ) {
        throw new Error("Invalid screenshot timestamps");
      }

      const requestedDirectory = outDir || path.dirname(source);
      const outputDirectory = await resolveExistingPath(requestedDirectory);
      if (!pathAuthorizer.canWrite(path.join(outputDirectory, "screenshot.jpg"))) {
        throw new Error("Screenshot output is outside the authorized workspace");
      }

      const outputPaths = [];
      for (const timestamp of timestamps) {
        const outputPath = path.join(
          outputDirectory,
          `shot-${Date.now()}-${crypto.randomUUID()}.jpg`,
        );
        await captureScreenshot(source, timestamp, outputPath);
        outputPaths.push(outputPath);
      }
      return outputPaths;
    },
  );

  registerHandler("files:copy-image", async (_event, payload) => {
    const source = validateImagePath(await requireReadablePath(payload?.source));
    const destination = validateImagePath(
      await requireWritableDestination(payload?.destination),
    );
    await fsp.copyFile(source, destination);
    return destination;
  });

  registerHandler("files:delete-image", async (_event, targetPath) => {
    const resolved = validateImagePath(await requireReadablePath(targetPath));
    if (!pathAuthorizer.canWrite(resolved)) {
      throw new Error("Selected source files cannot be deleted");
    }
    await fsp.unlink(resolved).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    return true;
  });

  registerHandler("json:write-authorized", async (_event, payload) => {
    validateJsonContent(payload?.content);
    const destination = await requireWritableDestination(payload?.filePath);
    validateJsonFilename(path.basename(destination));
    await writeJsonFile(destination, payload.content);
    return destination;
  });

  registerHandler("json:write-mirror", async (_event, payload) => {
    const directory = MIRROR_DIRECTORIES[payload?.type];
    if (!directory) throw new Error("Invalid mirror destination");
    const filename = validateJsonFilename(payload.filename);
    validateJsonContent(payload.content);
    const destination = path.join(directory, filename);
    await writeJsonFile(destination, payload.content);
    return destination;
  });

  registerHandler("app:get-temp-directory", () => appTempDirectory);

  registerHandler("app:select-images", async (_event, allowMultiple) => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile", ...(allowMultiple ? ["multiSelections"] : [])],
      filters: [
        { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
      ],
    });

    const authorized = [];
    for (const filePath of filePaths) {
      const resolved = validateImagePath(await resolveExistingPath(filePath));
      pathAuthorizer.authorizeSelectedFile(resolved);
      authorized.push(resolved);
    }
    return authorized;
  });

  registerHandler("index:update-equipment", async (_event, payload = {}) => {
    const audioItems = validateStringList(
      normalizeList(payload.audioItems),
      "audio equipment",
    );
    const videoItems = validateStringList(
      normalizeList(payload.videoItems),
      "video equipment",
    );
    await fsp.mkdir(path.dirname(EQUIPMENT_JSON_PATH), { recursive: true });

    let current = { audio: [], video: [] };
    try {
      const parsed = JSON.parse(await fsp.readFile(EQUIPMENT_JSON_PATH, "utf8"));
      current = {
        audio: normalizeList(parsed.audio),
        video: normalizeList(parsed.video),
      };
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn("Could not read equipment index:", error.message);
      }
    }

    const next = {
      audio: mergeDedupeCaseInsensitive(current.audio, audioItems),
      video: mergeDedupeCaseInsensitive(current.video, videoItems),
    };
    await fsp.writeFile(
      EQUIPMENT_JSON_PATH,
      `${JSON.stringify(next, null, 2)}\n`,
      "utf8",
    );
    return next;
  });

  registerHandler("index:update-tapers", (_event, payload = {}) =>
    updatePeopleIndex(
      TAPERS_INDEX_PATH,
      payload.tapers,
      payload.filename,
      "tapers",
    ),
  );

  registerHandler("index:update-traders", (_event, payload = {}) =>
    updatePeopleIndex(
      TRADERS_INDEX_PATH,
      payload.traders,
      payload.filename,
      "traders",
    ),
  );

  registerHandler("setlist:lookup", (_event, options) => lookupSetlist(options));
  registerHandler("drive:authenticate", () => authenticateDrive());

  registerHandler("drive:upload-screenshot", async (_event, filePath) => {
    const client = requireOAuthClient();
    if (!client.credentials?.refresh_token && !client.credentials?.access_token) {
      throw new Error("Google Drive authentication is required");
    }
    const source = validateImagePath(await requireReadablePath(filePath));
    const drive = google.drive({ version: "v3", auth: client });
    const upload = await drive.files.create({
      resource: { name: path.basename(source), parents: [DRIVE_FOLDER_ID] },
      media: { body: fs.createReadStream(source) },
      fields: "id",
    });
    await drive.permissions.create({
      fileId: upload.data.id,
      requestBody: { role: "reader", type: "anyone" },
    });
    return { id: upload.data.id };
  });
}

function lockDownMainWindow(window) {
  const expectedUrl = pathToFileURL(RENDERER_PATH).href;
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, targetUrl) => {
    if (targetUrl !== expectedUrl) event.preventDefault();
  });
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
}

async function createWindow() {
  if (!fs.existsSync(PRELOAD_PATH)) {
    throw new Error(`preload.js not found at: ${PRELOAD_PATH}`);
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 750,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      safeDialogs: true,
      navigateOnDragDrop: false,
    },
  });

  lockDownMainWindow(mainWindow);
  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error("Renderer failed to load:", {
        errorCode,
        errorDescription,
        validatedURL,
      });
    },
  );
  mainWindow.webContents.on("preload-error", (_event, preload, error) => {
    console.error(`Preload failed (${preload}):`, error);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("Renderer process exited:", details);
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadFile(RENDERER_PATH);
  console.log("Renderer loaded:", RENDERER_PATH);

  if (process.env.TL_TOOL_SMOKE_TEST === "1") {
    const unauthorizedJsonPath = path.join(__dirname, "unauthorized-smoke.json");
    const authorizedJsonPath = path.join(
      appTempDirectory,
      "electron_security_smoke.json",
    );
    const result = await mainWindow.webContents.executeJavaScript(`(async () => {
      let unauthorizedProbeRejected = false;
      let unauthorizedWriteRejected = false;
      let scopedWriteSucceeded = false;
      let authorizedProbeSucceeded = ${smokeMediaPath ? "false" : "null"};
      let screenshotPaths = [];
      try {
        await window.mediaTools.probeFile(${JSON.stringify(__filename)});
      } catch {
        unauthorizedProbeRejected = true;
      }
      try {
        await window.mediaTools.writeJson(
          ${JSON.stringify(unauthorizedJsonPath)},
          "{}",
        );
      } catch {
        unauthorizedWriteRejected = true;
      }
      try {
        await window.mediaTools.writeJson(
          ${JSON.stringify(authorizedJsonPath)},
          "{}",
        );
        scopedWriteSucceeded = true;
      } catch {}
      ${
        smokeMediaPath
          ? `try {
        const metadata = await window.mediaTools.probeFile(${JSON.stringify(smokeMediaPath)});
        authorizedProbeSucceeded = Number(metadata?.format?.duration || 0) > 0;
        screenshotPaths = await window.mediaTools.captureScreenshotsAt(
          ${JSON.stringify(smokeMediaPath)},
          [0.1],
        );
      } catch {}`
          : ""
      }
      return {
        mediaProbe: typeof window.mediaTools?.probeFile,
        arbitraryWrite: typeof window.mediaTools?.writeFile,
        scopedWrite: typeof window.mediaTools?.writeJson,
        nodeRequire: typeof window.require,
        secretsBridge: typeof window.secrets,
        unauthorizedProbeRejected,
        unauthorizedWriteRejected,
        scopedWriteSucceeded,
        authorizedProbeSucceeded,
        screenshotPaths
      };
    })()`);
    const authorizedWriteExists = fs.existsSync(authorizedJsonPath);
    await fsp.unlink(authorizedJsonPath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    for (const screenshotPath of result.screenshotPaths) {
      await fsp.unlink(screenshotPath).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    if (
      result.mediaProbe !== "function" ||
      result.arbitraryWrite !== "undefined" ||
      result.scopedWrite !== "function" ||
      result.nodeRequire !== "undefined" ||
      result.secretsBridge !== "undefined" ||
      result.unauthorizedProbeRejected !== true ||
      result.unauthorizedWriteRejected !== true ||
      result.scopedWriteSucceeded !== true ||
      (smokeMediaPath &&
        (result.authorizedProbeSucceeded !== true ||
          result.screenshotPaths.length !== 1)) ||
      authorizedWriteExists !== true ||
      fs.existsSync(unauthorizedJsonPath)
    ) {
      throw new Error(`Electron smoke assertions failed: ${JSON.stringify(result)}`);
    }
    console.log("TL_TOOL_SMOKE_OK", JSON.stringify(result));
    setTimeout(() => app.quit(), 250);
  }
}

registerIpcHandlers();

app.whenReady()
  .then(async () => {
    appTempDirectory = path.join(app.getPath("temp"), "tl-tool-media");
    await fsp.mkdir(appTempDirectory, { recursive: true });
    appTempDirectory = await fsp.realpath(appTempDirectory);
    pathAuthorizer.authorizeInternalDirectory(appTempDirectory);

    if (process.env.TL_TOOL_SMOKE_MEDIA_PATH) {
      smokeMediaPath = await resolveExistingPath(
        process.env.TL_TOOL_SMOKE_MEDIA_PATH,
      );
      const stats = await fsp.stat(smokeMediaPath);
      pathAuthorizer.authorizeWorkspacePath(
        smokeMediaPath,
        stats.isDirectory(),
      );
    }

    try {
      createOAuth2Client();
    } catch (error) {
      console.warn("Google Drive authentication is unavailable:", error.message);
    }

    await createWindow();
  })
  .catch((error) => {
    console.error("Application startup failed:", error);
    app.exit(1);
  });

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((error) =>
      console.error("Window creation failed:", error),
    );
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
