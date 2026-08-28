const fs = require("fs");
const path = require("path");

const repositoryRoot = path.resolve(__dirname, "..");
const outputDirectory = path.resolve(repositoryRoot, "public");

if (
  path.dirname(outputDirectory) !== repositoryRoot ||
  path.basename(outputDirectory) !== "public"
) {
  throw new Error(`Refusing to clean unexpected output path: ${outputDirectory}`);
}

fs.rmSync(outputDirectory, { recursive: true, force: true });
console.log(`Cleaned Eleventy output: ${outputDirectory}`);
