"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { serializeJsonForHtml } = require("../../lib/web-security.cjs");

const repositoryRoot = path.resolve(__dirname, "../..");

function sourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(entryPath));
    if (entry.isFile() && /\.(?:njk|html|js)$/.test(entry.name)) files.push(entryPath);
  }
  return files;
}

test("embedded JSON neutralizes HTML parser breakouts and round-trips", () => {
  const payload = {
    band: '</script><img src=x onerror="globalThis.pwned=true">',
    separators: "line\u2028paragraph\u2029&<>",
  };
  const serialized = serializeJsonForHtml(payload);

  assert.equal(serialized.includes("</script"), false);
  assert.equal(serialized.includes("<img"), false);
  assert.equal(serialized.includes("&"), false);
  assert.deepEqual(JSON.parse(serialized), payload);
});

test("templates contain no unsafe dump filters, inline handlers, or inline JavaScript", () => {
  const templateRoot = path.join(repositoryRoot, "src");
  const violations = [];
  const inlineHandler = /\son(?:click|error|load|submit|change|input)\s*=/i;
  const unsafeDump = /\|\s*dump\s*\|\s*safe/i;
  const executableInlineScript =
    /<script\b(?![^>]*\bsrc\s*=)(?![^>]*\btype\s*=\s*["']application\/json["'])[^>]*>/i;

  for (const filePath of sourceFiles(templateRoot).filter((name) => name.endsWith(".njk"))) {
    const source = fs.readFileSync(filePath, "utf8");
    const relativePath = path.relative(repositoryRoot, filePath);
    if (unsafeDump.test(source)) violations.push(`${relativePath}: unsafe dump`);
    if (inlineHandler.test(source)) violations.push(`${relativePath}: inline handler`);
    if (executableInlineScript.test(source)) violations.push(`${relativePath}: inline script`);
  }

  assert.deepEqual(violations, []);
});

test("base layout loads local sanitization before application scripts and enforces CSP", () => {
  const base = fs.readFileSync(
    path.join(repositoryRoot, "src", "_includes", "base.njk"),
    "utf8",
  );

  assert.match(base, /Content-Security-Policy/);
  assert.match(base, /script-src 'self';/);
  assert.doesNotMatch(base, /script-src[^;]*'unsafe-inline'/);
  assert.doesNotMatch(base, /cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(base, /vendor\/jsoneditor\/jsoneditor\.min\.js/);
  assert.match(base, /vendor\/bootstrap-icons\/bootstrap-icons\.min\.css/);
  assert.ok(base.indexOf("purify.min.js") < base.indexOf("security.js"));
});

test("dynamic show and cart HTML is passed through the local sanitizer", () => {
  for (const relativePath of ["src/scripts/shows-table.js", "src/scripts/cart.js"]) {
    const source = fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
    assert.match(source, /tlSecurity\.(?:sanitizeHTML|setHTML)/);
    assert.doesNotMatch(source, /data-json=/);
    assert.doesNotMatch(source, /onclick=/);
  }
});
