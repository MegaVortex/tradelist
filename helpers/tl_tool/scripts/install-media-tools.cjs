const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = fs.promises;
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const TOOL_ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(TOOL_ROOT, "media-tools.json");
const INSTALL_DIRECTORY = path.join(TOOL_ROOT, "vendor", "media-tools");
const INSTALL_MANIFEST = path.join(INSTALL_DIRECTORY, "installed.json");
const DOWNLOAD_HOSTS = new Set(["www.gyan.dev"]);
const REQUIRED_FILES = Object.freeze(["ffmpeg.exe", "ffprobe.exe"]);

function readConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  if (
    config.schemaVersion !== 1 ||
    !/^\d+[.]\d+(?:[.]\d+)?$/.test(config.version) ||
    !/^[a-f0-9]{64}$/.test(config.archiveSha256) ||
    !Number.isSafeInteger(config.maxArchiveBytes) ||
    config.maxArchiveBytes <= 0
  ) {
    throw new Error("media-tools.json is invalid");
  }
  return config;
}

function assertSupportedPlatform(config) {
  if (process.platform !== config.platform || process.arch !== config.arch) {
    throw new Error(
      `Bundled media tools support ${config.platform}-${config.arch}; ` +
        `this runtime is ${process.platform}-${process.arch}`,
    );
  }
}

function isCurrentInstallation(config) {
  try {
    const installed = JSON.parse(fs.readFileSync(INSTALL_MANIFEST, "utf8"));
    return (
      installed.version === config.version &&
      installed.archiveSha256 === config.archiveSha256 &&
      REQUIRED_FILES.every((filename) =>
        fs.statSync(path.join(INSTALL_DIRECTORY, filename)).isFile(),
      )
    );
  } catch {
    return false;
  }
}

function download(url, destination, config, redirectCount = 0) {
  if (redirectCount > 4) {
    return Promise.reject(new Error("Too many media-tool download redirects"));
  }

  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:" || !DOWNLOAD_HOSTS.has(parsedUrl.hostname)) {
    return Promise.reject(new Error("Media-tool download left the trusted host"));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(
      parsedUrl,
      { headers: { "User-Agent": "tl-tool-media-installer/1" } },
      (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          const nextUrl = new URL(response.headers.location, parsedUrl).href;
          download(nextUrl, destination, config, redirectCount + 1)
            .then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Media-tool download failed with HTTP ${response.statusCode}`));
          return;
        }

        const contentLength = Number(response.headers["content-length"] || 0);
        if (contentLength > config.maxArchiveBytes) {
          response.destroy();
          reject(new Error("Media-tool archive exceeds its configured size limit"));
          return;
        }

        const output = fs.createWriteStream(destination, { flags: "wx" });
        const hash = crypto.createHash("sha256");
        let received = 0;
        let settled = false;

        const fail = (error) => {
          if (settled) return;
          settled = true;
          output.destroy();
          reject(error);
        };

        response.on("data", (chunk) => {
          received += chunk.length;
          if (received > config.maxArchiveBytes) {
            response.destroy(new Error("Media-tool archive exceeds its configured size limit"));
            return;
          }
          hash.update(chunk);
        });
        response.on("error", fail);
        output.on("error", fail);
        output.on("finish", () => {
          if (settled) return;
          settled = true;
          output.close(() => resolve({ bytes: received, sha256: hash.digest("hex") }));
        });
        response.pipe(output);
      },
    );
    request.setTimeout(120_000, () =>
      request.destroy(new Error("Media-tool download timed out")),
    );
    request.on("error", reject);
  });
}

function extractArchive(archivePath, destination) {
  const result = spawnSync(
    "tar.exe",
    ["-xf", archivePath, "-C", destination],
    {
      encoding: "utf8",
      shell: false,
      timeout: 120_000,
      windowsHide: true,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Could not extract media tools: ${result.stderr.trim()}`);
  }
}

async function install() {
  const config = readConfig();
  assertSupportedPlatform(config);
  if (isCurrentInstallation(config)) {
    console.log(`Media tools ${config.version} are already installed.`);
    return;
  }

  const temporaryDirectory = await fsp.mkdtemp(
    path.join(os.tmpdir(), "tl-tool-media-install-"),
  );
  const archivePath = path.join(temporaryDirectory, "media-tools.zip");
  const extractionDirectory = path.join(temporaryDirectory, "extracted");

  try {
    await fsp.mkdir(extractionDirectory);
    console.log(`Downloading verified media tools ${config.version}...`);
    const downloaded = await download(config.sourceUrl, archivePath, config);
    if (downloaded.sha256 !== config.archiveSha256) {
      throw new Error(
        `Media-tool archive checksum mismatch: expected ${config.archiveSha256}, ` +
          `received ${downloaded.sha256}`,
      );
    }

    extractArchive(archivePath, extractionDirectory);
    const archiveRoot = path.join(extractionDirectory, config.archiveDirectory);
    const sourceFiles = REQUIRED_FILES.map((filename) =>
      path.join(archiveRoot, "bin", filename),
    );
    for (const source of sourceFiles) {
      if (!(await fsp.stat(source)).isFile()) {
        throw new Error(`Verified archive is missing ${path.basename(source)}`);
      }
    }

    await fsp.mkdir(INSTALL_DIRECTORY, { recursive: true });
    for (let index = 0; index < REQUIRED_FILES.length; index += 1) {
      await fsp.copyFile(
        sourceFiles[index],
        path.join(INSTALL_DIRECTORY, REQUIRED_FILES[index]),
      );
    }
    const licenseSource = path.join(archiveRoot, "LICENSE");
    if (fs.existsSync(licenseSource)) {
      await fsp.copyFile(
        licenseSource,
        path.join(INSTALL_DIRECTORY, "LICENSE.ffmpeg.txt"),
      );
    }
    await fsp.writeFile(
      INSTALL_MANIFEST,
      `${JSON.stringify(
        {
          version: config.version,
          provider: config.provider,
          sourceUrl: config.sourceUrl,
          archiveSha256: config.archiveSha256,
          installedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`Installed FFmpeg and FFprobe ${config.version}.`);
  } finally {
    await fsp.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

install().catch((error) => {
  console.error(`Media-tool installation failed: ${error.message}`);
  process.exitCode = 1;
});
