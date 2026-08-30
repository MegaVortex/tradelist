const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

test("renderer metadata parsing contains no dynamic code execution", () => {
  const renderer = read("helpers/tl_tool/renderer.js");
  const parser = read("helpers/tl_tool/lib/aspect-ratio.js");
  assert.doesNotMatch(`${renderer}\n${parser}`, /\beval\s*[(]/);
  assert.match(renderer, /aspectRatio[.]parseAspectRatio[(]dar[)]/);
});

test("static and workflow tools resolve only from the installed npm tree", () => {
  const packageJson = JSON.parse(read("package.json"));
  const workflows = [
    read(".github/workflows/deploy.yml"),
    read(".github/workflows/e2e.yml"),
  ].join("\n");

  assert.equal(
    packageJson.scripts["serve:static"],
    "http-server ./public -a 127.0.0.1 -p 8080 -c-1",
  );
  assert.equal(packageJson.devDependencies["http-server"], "14.1.1");
  assert.doesNotMatch(`${JSON.stringify(packageJson.scripts)}\n${workflows}`, /\bnpx\b/);
  assert.match(workflows, /npm exec --offline -- playwright install --with-deps/);
});

test("Python migration dependencies are exact and hash-locked", () => {
  const direct = read("helpers/migration/requirements.in")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const lock = read("helpers/migration/requirements.txt");
  const requirements = lock
    .replace(/\\\r?\n\s*/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  assert.equal(direct.length, 2);
  for (const requirement of direct) {
    assert.match(requirement, /^[a-z0-9-]+==[^\s]+$/);
  }
  assert.ok(requirements.length > direct.length);
  for (const requirement of requirements) {
    assert.match(requirement, /^[a-z0-9_.-]+==[^\s]+/i);
    assert.match(requirement, /--hash=sha256:[a-f0-9]{64}/);
  }
});

test("every copied third-party browser asset has package and file integrity", () => {
  const manifest = JSON.parse(read("vendor-assets.lock.json"));
  const configuredAssets = require("../../config/vendor-assets.cjs");
  const configuredPackages = new Set(configuredAssets.map((asset) => asset.packageName));

  assert.equal(manifest.schemaVersion, 1);
  assert.ok(manifest.files.length > configuredAssets.length);
  assert.deepEqual(new Set(Object.keys(manifest.packages)), configuredPackages);
  for (const metadata of Object.values(manifest.packages)) {
    assert.match(metadata.version, /^\d+[.]\d+[.]\d+/);
    assert.match(metadata.integrity, /^sha512-/);
  }
  for (const asset of manifest.files) {
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
  }
});
