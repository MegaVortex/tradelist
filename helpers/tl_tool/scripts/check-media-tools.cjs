const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const TOOL_ROOT = path.resolve(__dirname, "..");
const config = JSON.parse(
  fs.readFileSync(path.join(TOOL_ROOT, "media-tools.json"), "utf8"),
);

for (const executable of ["ffmpeg.exe", "ffprobe.exe"]) {
  const executablePath = path.join(TOOL_ROOT, "vendor", "media-tools", executable);
  const output = execFileSync(executablePath, ["-version"], {
    encoding: "utf8",
    env: {
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      WINDIR: process.env.WINDIR,
    },
    shell: false,
    timeout: 10_000,
    windowsHide: true,
  });
  const firstLine = output.split(/\r?\n/, 1)[0];
  if (!firstLine.includes(`version ${config.version}`)) {
    throw new Error(`${executable} does not match pinned version ${config.version}`);
  }
  console.log(firstLine);
}
