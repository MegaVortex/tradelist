const path = require("node:path");
const { execFile } = require("node:child_process");

const TOOL_DIRECTORY = path.resolve(__dirname, "..", "vendor", "media-tools");
const DEFAULT_PATHS = Object.freeze({
  ffmpeg: path.join(TOOL_DIRECTORY, "ffmpeg.exe"),
  ffprobe: path.join(TOOL_DIRECTORY, "ffprobe.exe"),
});
const LIMITS = Object.freeze({
  maxAllocationBytes: 256 * 1024 * 1024,
  maxProbeOutputBytes: 16 * 1024 * 1024,
  maxToolOutputBytes: 2 * 1024 * 1024,
  probeSizeBytes: 64 * 1024 * 1024,
  analyzeDurationMicroseconds: 60_000_000,
  probeTimeoutMs: 45_000,
  screenshotTimeoutMs: 60_000,
});

function mediaEnvironment() {
  return Object.fromEntries(
    ["SystemRoot", "TEMP", "TMP", "WINDIR"]
      .filter((name) => process.env[name])
      .map((name) => [name, process.env[name]]),
  );
}

function formatToolError(command, error, stderr) {
  const executable = path.basename(command);
  const detail = String(stderr || "").trim().slice(0, 4_000);
  if (error.killed || error.code === "ETIMEDOUT") {
    return new Error(`${executable} exceeded its execution time limit`);
  }
  if (error.code === "ENOENT") {
    return new Error(
      `${executable} is not installed; run npm run install:media-tools in helpers/tl_tool`,
    );
  }
  return new Error(`${executable} failed${detail ? `: ${detail}` : ""}`);
}

function createMediaTools({ execFileImpl = execFile, paths = DEFAULT_PATHS } = {}) {
  function run(command, args, { maxBuffer, timeout }) {
    return new Promise((resolve, reject) => {
      execFileImpl(
        command,
        args,
        {
          encoding: "utf8",
          env: mediaEnvironment(),
          killSignal: "SIGKILL",
          maxBuffer,
          shell: false,
          timeout,
          windowsHide: true,
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(formatToolError(command, error, stderr));
            return;
          }
          resolve(stdout);
        },
      );
    });
  }

  async function probeFile(filePath) {
    const output = await run(
      paths.ffprobe,
      [
        "-v",
        "error",
        "-max_alloc",
        String(LIMITS.maxAllocationBytes),
        "-protocol_whitelist",
        "file",
        "-probesize",
        String(LIMITS.probeSizeBytes),
        "-analyzeduration",
        String(LIMITS.analyzeDurationMicroseconds),
        "-show_format",
        "-show_streams",
        "-of",
        "json",
        filePath,
      ],
      {
        maxBuffer: LIMITS.maxProbeOutputBytes,
        timeout: LIMITS.probeTimeoutMs,
      },
    );
    try {
      return JSON.parse(output);
    } catch {
      throw new Error("ffprobe returned invalid JSON");
    }
  }

  async function captureScreenshot(filePath, timestamp, outputPath) {
    await run(
      paths.ffmpeg,
      [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-max_alloc",
        String(LIMITS.maxAllocationBytes),
        "-protocol_whitelist",
        "file",
        "-probesize",
        String(LIMITS.probeSizeBytes),
        "-analyzeduration",
        String(LIMITS.analyzeDurationMicroseconds),
        "-ss",
        String(timestamp),
        "-i",
        filePath,
        "-map",
        "0:v:0",
        "-frames:v",
        "1",
        "-threads",
        "1",
        "-filter_threads",
        "1",
        "-vf",
        "scale=1024:576",
        "-q:v",
        "4",
        "-an",
        "-y",
        outputPath,
      ],
      {
        maxBuffer: LIMITS.maxToolOutputBytes,
        timeout: LIMITS.screenshotTimeoutMs,
      },
    );
    return outputPath;
  }

  return Object.freeze({ captureScreenshot, probeFile });
}

module.exports = {
  ...createMediaTools(),
  createMediaTools,
  DEFAULT_PATHS,
  LIMITS,
};
