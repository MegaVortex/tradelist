const fs = require("fs");
const path = require("path");

const fileArg = process.argv[2];
if (!fileArg) process.exit(0);

const abs = path.resolve(fileArg);
if (!abs.toLowerCase().endsWith(".json")) process.exit(0);

try {
  const text = fs.readFileSync(abs, "utf8");
  const data = JSON.parse(text);

  data.lastUpdated = Math.floor(Date.now() / 1000);

  const out = JSON.stringify(data, null, 2);
  fs.writeFileSync(abs, out, "utf8");

  process.stdout.write(`[lastUpdated] ${abs}\n`);
} catch (e) {
  process.stderr.write(`[lastUpdated] skipped ${abs}: ${e.message}\n`);
  process.exit(0);
}