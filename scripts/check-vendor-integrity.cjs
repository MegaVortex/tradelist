const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(PROJECT_ROOT, "vendor-assets.lock.json");
const assetGroups = require("../config/vendor-assets.cjs");

function portablePath(value) {
  return value.split(path.sep).join("/");
}

function collectFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  const files = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(entryPath));
    if (entry.isFile()) files.push(entryPath);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function sha256(filename) {
  return crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function createManifest() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"),
  );
  const packageLock = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, "package-lock.json"), "utf8"),
  );
  const declarations = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const packages = {};
  const files = [];

  for (const group of assetGroups) {
    const locked = packageLock.packages[`node_modules/${group.packageName}`];
    assert.ok(locked, `${group.packageName} is absent from package-lock.json`);
    assert.equal(
      declarations[group.packageName],
      locked.version,
      `${group.packageName} must be exact-pinned in package.json`,
    );
    assert.match(
      locked.integrity || "",
      /^sha512-[A-Za-z0-9+/]+={0,2}$/,
      `${group.packageName} has no npm integrity hash`,
    );

    packages[group.packageName] = {
      integrity: locked.integrity,
      version: locked.version,
    };

    const absoluteSource = path.join(PROJECT_ROOT, group.source);
    const sourceStat = fs.statSync(absoluteSource);
    for (const filename of collectFiles(absoluteSource)) {
      const relativeAsset = sourceStat.isDirectory()
        ? path.relative(absoluteSource, filename)
        : "";
      files.push({
        destination: portablePath(path.join(group.destination, relativeAsset)),
        package: group.packageName,
        sha256: sha256(filename),
        source: portablePath(path.relative(PROJECT_ROOT, filename)),
      });
    }
  }

  return {
    schemaVersion: 1,
    packages: Object.fromEntries(
      Object.entries(packages).sort(([left], [right]) => left.localeCompare(right)),
    ),
    files: files.sort((left, right) => left.source.localeCompare(right.source)),
  };
}

function verifyManifest() {
  const expected = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  assert.deepEqual(
    createManifest(),
    expected,
    "Vendored browser assets differ from vendor-assets.lock.json. Verify the dependency upgrade, then regenerate with npm run update:vendor-integrity.",
  );
  console.log(`Vendor integrity check passed: ${expected.files.length} files verified.`);
}

if (require.main === module) {
  if (process.argv.includes("--update")) {
    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(createManifest(), null, 2)}\n`);
    console.log(`Updated ${path.relative(PROJECT_ROOT, MANIFEST_PATH)}.`);
  } else {
    verifyManifest();
  }
}

module.exports = { createManifest, verifyManifest };
