const { contextBridge, ipcRenderer, webUtils } = require("electron");

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args);
}

function pathSeparator(value) {
  return String(value || "").includes("\\") ? "\\" : "/";
}

function dirname(value) {
  const input = String(value || "").replace(/[\\/]+$/, "");
  const lastSeparator = Math.max(input.lastIndexOf("\\"), input.lastIndexOf("/"));
  if (lastSeparator < 0) return ".";
  if (lastSeparator === 2 && /^[A-Za-z]:/.test(input)) {
    return input.slice(0, 3);
  }
  return input.slice(0, lastSeparator) || pathSeparator(input);
}

function basename(value) {
  const input = String(value || "").replace(/[\\/]+$/, "");
  const lastSeparator = Math.max(input.lastIndexOf("\\"), input.lastIndexOf("/"));
  return input.slice(lastSeparator + 1);
}

function pathJoin(...parts) {
  const cleanParts = parts
    .filter((part) => part !== undefined && part !== null && String(part) !== "")
    .map(String);
  if (!cleanParts.length) return "";

  const separator = pathSeparator(cleanParts[0]);
  return cleanParts
    .map((part, index) => {
      if (index === 0) return part.replace(/[\\/]+$/, "");
      return part.replace(/^[\\/]+|[\\/]+$/g, "");
    })
    .join(separator);
}

contextBridge.exposeInMainWorld("appAPI", {
  selectImageFiles: (allowMultiple) =>
    invoke("app:select-images", allowMultiple === true),
  updateEquipmentIndex: (payload) =>
    invoke("index:update-equipment", payload),
  updateTapersIndex: (tapers, filename) =>
    invoke("index:update-tapers", { tapers, filename }),
  updateTradersIndex: (traders, filename) =>
    invoke("index:update-traders", { traders, filename }),
  writeMirrorJson: (type, filename, content) =>
    invoke("json:write-mirror", { type, filename, content }),
});

contextBridge.exposeInMainWorld("setlistAPI", {
  lookup: (options) => invoke("setlist:lookup", options),
});

contextBridge.exposeInMainWorld("mediaTools", {
  getPathForFile: (file) => {
    const droppedPath = webUtils.getPathForFile(file);
    return invoke("media:authorize-dropped-path", droppedPath);
  },
  isDirectory: (targetPath) => invoke("media:is-directory", targetPath),
  probeFile: (filePath) => invoke("media:probe", filePath),
  captureScreenshotsAt: (filePath, timestamps, outDir = null) =>
    invoke("media:capture-screenshots", { filePath, timestamps, outDir }),
  copyFile: (source, destination) =>
    invoke("files:copy-image", { source, destination }),
  deleteFile: (filePath) => invoke("files:delete-image", filePath),
  writeJson: (filePath, content) =>
    invoke("json:write-authorized", { filePath, content }),
  getTmpDir: () => invoke("app:get-temp-directory"),
  basename,
  getDirname: dirname,
  pathJoin,
});

contextBridge.exposeInMainWorld("oauthDrive", {
  authenticate: () => invoke("drive:authenticate"),
  uploadScreenshot: (filePath) => invoke("drive:upload-screenshot", filePath),
});
