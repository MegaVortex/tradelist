// preload.js
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const os = require("os");
const fs = require("fs");
const path = require("path");
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appAPI", {
  updateTapersIndex: (tapers, filename) => ipcRenderer.invoke("update-tapers-index", { tapers, filename }),
  updateTradersIndex: (traders, filename) => ipcRenderer.invoke("update-traders-index", { traders, filename })
});

contextBridge.exposeInMainWorld("setlistAPI", {
  lookup: (params) => ipcRenderer.invoke("setlist-lookup", params)
});

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

function getFolderSize(folderPath) {
  let total = 0;
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) total += stat.size;
  }
  return total;
}

contextBridge.exposeInMainWorld("mediaTools", {
  readDir: (dir) => fs.readdirSync(dir),
  join: (...p) => path.join(...p),
  basename: (p) => path.basename(p),
  dirname: (p) => path.dirname(p),
  extname: (p) => path.extname(p),
  statSync: (p) => fs.statSync(p),
  existsSync: (p) => fs.existsSync(p),
  pathJoin: (...args) => path.join(...args),
  getDirname: (fullPath) => path.dirname(fullPath),
  getFolderSize,

  probeFile: (filePath) =>
    new Promise((res, rej) => {
      ffmpeg.ffprobe(filePath, (err, data) => (err ? rej(err) : res(data)));
    }),

  captureScreenshots: async (filePath, outDir = null, count = 4) => {
    const saveDir = outDir || path.dirname(filePath);
    const getDuration = () => {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) return reject(err);
          const duration = metadata.format.duration;
          resolve(duration);
        });
      });
    };

    const getRandomTimestamps = (duration, count) => {
      const times = new Set();
      while (times.size < count) {
        const t = Math.floor(Math.random() * (duration - 10)) + 5;
        times.add(t);
      }
      return Array.from(times);
    };

    const duration = await getDuration();
    const timestamps = getRandomTimestamps(duration, count);

    const outputPaths = [];

    for (let i = 0; i < timestamps.length; i++) {
      const outPath = path.join(saveDir, `shot-${Date.now()}-${i}.jpg`);
      await new Promise((res, rej) => {
        ffmpeg(filePath)
          .seekInput(timestamps[i])
          .frames(1)
          .outputOptions([
            "-vf scale=1024:576",
            "-q:v 4",
            "-an"
          ])
          .output(outPath)
          .on("end", res)
          .on("error", rej)
          .run();
      });
      outputPaths.push(outPath);
    }

    return outputPaths;
  },

  captureScreenshotsAt: async (filePath, timestamps = [], outDir = null) => {
    const saveDir = outDir || path.dirname(filePath);
    const outputPaths = [];

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const outPath = path.join(saveDir, `shot-${Date.now()}-${i}.jpg`);

      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .seekInput(timestamp)
          .frames(1)
          .outputOptions([
            "-vf scale=1024:576",
            "-q:v 4",
            "-an"
          ])
          .output(outPath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });
      outputPaths.push(outPath);
    }

    return outputPaths;
  },

  copyFile: (src, dest) => {
    fs.copyFileSync(src, dest);
  },

  deleteFile: (filePath) =>
    fs.existsSync(filePath) ? fs.unlinkSync(filePath) : null,

  moveFile: (from, toFolder) => {
    const dest = path.join(toFolder, path.basename(from));
    fs.renameSync(from, dest);
    return dest;
  },

  writeFile: (filePath, content) => {
    fs.writeFileSync(filePath, content, 'utf-8');
  },

  getTmpDir: () => os.tmpdir(),
});

contextBridge.exposeInMainWorld("oauthDrive", {
  getAuthUrl: () => ipcRenderer.invoke("get-auth-url"),
  setAuthCode: (code) => ipcRenderer.invoke("set-auth-code", code),
  uploadToDrive: (filePath) => ipcRenderer.invoke("upload-to-drive", filePath),
  openAuthWindow: (url) => ipcRenderer.invoke("open-auth-window", url),
  onAuthCode: (cb) => ipcRenderer.on("auth-code", (e, code) => cb(code)),
  setPermission: (fileId, permission) => ipcRenderer.invoke('drive:setPermission', fileId, permission)
});

contextBridge.exposeInMainWorld("api", {
  saveFile: (content) => ipcRenderer.invoke("save-json-file", content)
});