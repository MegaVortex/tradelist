const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const {
  PathAuthorizer,
  isPathInside,
  isTrustedRendererUrl,
  validateImagePath,
  validateJsonContent,
  validateJsonFilename,
  validateSetlistLookup,
} = require("../lib/security");

const TOOL_ROOT = path.resolve(__dirname, "..");

test("workspace capabilities do not escape the user-authorized directory", () => {
  const root = path.resolve(os.tmpdir(), "tl-tool-security-root");
  const sibling = path.resolve(os.tmpdir(), "tl-tool-security-sibling");
  const authorizer = new PathAuthorizer();
  authorizer.authorizeWorkspacePath(path.join(root, "show.mkv"));

  assert.equal(authorizer.canRead(path.join(root, "show.mkv")), true);
  assert.equal(authorizer.canWrite(path.join(root, "show.json")), true);
  assert.equal(authorizer.canRead(path.join(sibling, "secret.txt")), false);
  assert.equal(authorizer.canWrite(path.join(sibling, "escape.json")), false);
  assert.equal(isPathInside(root, path.join(root, "nested", "file.jpg")), true);
  assert.equal(isPathInside(root, sibling), false);
});

test("a selected image grants read access only, not directory write access", () => {
  const root = path.resolve(os.tmpdir(), "tl-tool-selected");
  const selected = path.join(root, "selected.jpg");
  const authorizer = new PathAuthorizer();
  authorizer.authorizeSelectedFile(selected);

  assert.equal(authorizer.canRead(selected), true);
  assert.equal(authorizer.canRead(path.join(root, "other.jpg")), false);
  assert.equal(authorizer.canWrite(selected), false);
});

test("JSON and image validators accept only the intended file classes", () => {
  assert.equal(validateJsonFilename("slipknot_18_08_2012_video.json"), "slipknot_18_08_2012_video.json");
  assert.throws(() => validateJsonFilename("../package.json"));
  assert.throws(() => validateJsonFilename("show.exe"));
  assert.equal(validateJsonContent('{"bands":["Slipknot"]}'), '{"bands":["Slipknot"]}');
  assert.throws(() => validateJsonContent("[]"));
  assert.throws(() => validateImagePath(path.resolve("payload.exe")));
  assert.equal(path.extname(validateImagePath(path.resolve("image.JPG"))).toLowerCase(), ".jpg");
});

test("renderer URLs and setlist inputs are constrained", () => {
  const rendererPath = path.join(TOOL_ROOT, "index.html");
  const rendererUrl = require("node:url").pathToFileURL(rendererPath).href;
  assert.equal(isTrustedRendererUrl(rendererUrl, rendererPath), true);
  assert.equal(isTrustedRendererUrl("https://attacker.example/", rendererPath), false);
  assert.equal(isTrustedRendererUrl(`${rendererUrl}?injected=1`, rendererPath), false);

  assert.deepEqual(
    validateSetlistLookup({ band: "Slipknot", city: "Berlin", year: "2026" }),
    { band: "Slipknot", city: "Berlin", year: "2026", date: "" },
  );
  assert.throws(() => validateSetlistLookup({ band: "Slipknot", year: "20xx" }));
});

test("sandbox preload has no direct Node filesystem or media imports", () => {
  const preload = fs.readFileSync(path.join(TOOL_ROOT, "preload.js"), "utf8");
  for (const forbidden of [
    'require("fs")',
    'require("path")',
    'require("fluent-ffmpeg")',
    'require("ffmpeg-static")',
    'require("ffprobe-static")',
  ]) {
    assert.equal(preload.includes(forbidden), false, forbidden);
  }
  for (const removedCapability of [
    "getSetlistKey",
    "readFile:",
    "writeFile:",
    "mkdirp:",
    "readDir:",
    "statSync:",
    "existsSync:",
    "setPermission:",
  ]) {
    assert.equal(preload.includes(removedCapability), false, removedCapability);
  }
});

test("all main-process IPC is sender-checked and the renderer is sandboxed", () => {
  const main = fs.readFileSync(path.join(TOOL_ROOT, "main.js"), "utf8");
  assert.equal((main.match(/ipcMain[.]handle/g) || []).length, 1);
  assert.match(main, /assertTrustedSender\(event\)/);
  assert.match(main, /sandbox:\s*true/);
  assert.doesNotMatch(main, /sandbox:\s*false/);
  assert.doesNotMatch(main, /nodeIntegration:\s*true/);
});

test("renderer document defines a restrictive content security policy", () => {
  const html = fs.readFileSync(path.join(TOOL_ROOT, "index.html"), "utf8");
  assert.match(html, /Content-Security-Policy/i);
  assert.match(html, /default-src 'self'/i);
  assert.match(html, /connect-src 'none'/i);
});
