const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const {
  createMediaTools,
  LIMITS,
} = require("../lib/media-tools");

const TOOL_ROOT = path.resolve(__dirname, "..");

test("media parser dependencies are pinned and checksum-verified", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(TOOL_ROOT, "package.json"), "utf8"),
  );
  const config = JSON.parse(
    fs.readFileSync(path.join(TOOL_ROOT, "media-tools.json"), "utf8"),
  );

  assert.equal(packageJson.dependencies["ffmpeg-static"], undefined);
  assert.equal(packageJson.dependencies["ffprobe-static"], undefined);
  assert.equal(packageJson.dependencies["fluent-ffmpeg"], undefined);
  assert.match(config.sourceUrl, /^https:\/\/www[.]gyan[.]dev\//);
  assert.match(config.archiveSha256, /^[a-f0-9]{64}$/);
  assert.equal(config.version, "9.0.1");
});

test("ffprobe is shell-free, network-denied, and resource-bounded", async () => {
  const calls = [];
  const tools = createMediaTools({
    paths: { ffmpeg: "pinned-ffmpeg.exe", ffprobe: "pinned-ffprobe.exe" },
    execFileImpl(command, args, options, callback) {
      calls.push({ command, args, options });
      callback(null, '{"format":{"duration":"1.5"},"streams":[]}', "");
    },
  });

  const result = await tools.probeFile("C:\\shows\\untrusted.mkv");
  assert.equal(result.format.duration, "1.5");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "pinned-ffprobe.exe");
  assert.equal(calls[0].options.shell, false);
  assert.equal(calls[0].options.timeout, LIMITS.probeTimeoutMs);
  assert.equal(calls[0].options.maxBuffer, LIMITS.maxProbeOutputBytes);
  assert.deepEqual(calls[0].args.slice(4, 6), ["-protocol_whitelist", "file"]);
  assert.ok(calls[0].args.includes("-max_alloc"));
  assert.equal(calls[0].options.env.PATH, undefined);
});

test("FFmpeg screenshot decoding is bounded and uses an exact argument array", async () => {
  const calls = [];
  const tools = createMediaTools({
    paths: { ffmpeg: "pinned-ffmpeg.exe", ffprobe: "pinned-ffprobe.exe" },
    execFileImpl(command, args, options, callback) {
      calls.push({ command, args, options });
      callback(null, "", "");
    },
  });

  const output = await tools.captureScreenshot(
    "C:\\shows\\untrusted.mkv",
    0.1,
    "C:\\shows\\shot.jpg",
  );
  assert.equal(output, "C:\\shows\\shot.jpg");
  assert.equal(calls[0].command, "pinned-ffmpeg.exe");
  assert.equal(calls[0].options.shell, false);
  assert.equal(calls[0].options.timeout, LIMITS.screenshotTimeoutMs);
  assert.equal(calls[0].options.maxBuffer, LIMITS.maxToolOutputBytes);
  assert.ok(calls[0].args.includes("-nostdin"));
  assert.ok(calls[0].args.includes("-protocol_whitelist"));
  assert.deepEqual(calls[0].args.slice(-2), ["-y", "C:\\shows\\shot.jpg"]);
});

test("invalid ffprobe output is rejected", async () => {
  const tools = createMediaTools({
    paths: { ffmpeg: "unused", ffprobe: "pinned-ffprobe.exe" },
    execFileImpl(_command, _args, _options, callback) {
      callback(null, "not json", "");
    },
  });
  await assert.rejects(() => tools.probeFile("C:\\shows\\bad.mkv"), /invalid JSON/);
});
