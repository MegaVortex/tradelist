const assert = require("node:assert/strict");
const { test } = require("node:test");

const { parseAspectRatio } = require("../lib/aspect-ratio");

test("aspect ratios accept strict decimal, fraction, and colon formats", () => {
  assert.equal(parseAspectRatio("16:9"), 16 / 9);
  assert.equal(parseAspectRatio(" 16 / 9 "), 16 / 9);
  assert.equal(parseAspectRatio("1.777"), 1.777);
  assert.equal(parseAspectRatio("4:3"), 4 / 3);
});

test("aspect ratios reject code, suffixes, and invalid denominators", () => {
  for (const invalid of [
    "16:9 + 1",
    "globalThis.process.exit()",
    "16:0",
    "0:9",
    "Infinity",
    "NaN",
    "",
    null,
    {},
  ]) {
    assert.equal(parseAspectRatio(invalid), null);
  }
});
