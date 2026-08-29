const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function readPackageJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, relativePath, "package.json"), "utf8"),
  );
}

test("root package does not duplicate helper-only native dependencies", () => {
  const packageJson = readPackageJson(".");
  const declared = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const removedPackage of [
    "electron",
    "ffmpeg-static",
    "fluent-ffmpeg",
    "nodemailer",
  ]) {
    assert.equal(declared[removedPackage], undefined, removedPackage);
  }
});

test("active frameworks retain their remediated dependency floors", () => {
  const rootPackage = readPackageJson(".");
  const helperPackage = readPackageJson(path.join("helpers", "tl_tool"));

  assert.equal(rootPackage.devDependencies["@11ty/eleventy"], "^3.1.6");
  assert.equal(rootPackage.devDependencies["@playwright/test"], "^1.62.1");
  assert.equal(rootPackage.dependencies.express, "^5.2.1");
  assert.equal(helperPackage.dependencies.googleapis, "^176.0.0");
  assert.equal(helperPackage.devDependencies.electron, "44.0.0");
});
