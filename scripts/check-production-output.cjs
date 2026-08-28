const fs = require("fs");
const path = require("path");

const repositoryRoot = path.resolve(__dirname, "..");
const forbiddenOutputs = [
  path.join(repositoryRoot, "public", "private"),
  path.join(repositoryRoot, "public", "private-shows"),
];

const leakedOutputs = forbiddenOutputs.filter((outputPath) =>
  fs.existsSync(outputPath),
);

if (leakedOutputs.length > 0) {
  throw new Error(
    `Production build contains private output:\n${leakedOutputs.join("\n")}`,
  );
}

console.log("Production output check passed: no private pages were generated.");
