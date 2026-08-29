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

const outputRoot = path.join(repositoryRoot, "public");
const htmlFiles = [];
const pendingDirectories = [outputRoot];

while (pendingDirectories.length > 0) {
  const directory = pendingDirectories.pop();
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) pendingDirectories.push(entryPath);
    if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(entryPath);
  }
}

const inlineHandlerPattern = /\son[a-z]+\s*=/i;
const executableInlineScriptPattern =
  /<script\b(?![^>]*\bsrc\s*=)(?![^>]*\btype\s*=\s*["']application\/json["'])[^>]*>/i;
const violations = [];

for (const htmlPath of htmlFiles) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const relativePath = path.relative(outputRoot, htmlPath);

  if (!html.includes('http-equiv="Content-Security-Policy"')) {
    violations.push(`${relativePath}: missing Content Security Policy`);
  }
  if (inlineHandlerPattern.test(html)) {
    violations.push(`${relativePath}: contains an inline event handler`);
  }
  if (executableInlineScriptPattern.test(html)) {
    violations.push(`${relativePath}: contains executable inline JavaScript`);
  }
}

if (violations.length > 0) {
  throw new Error(
    `Production output failed XSS checks:\n${violations.slice(0, 25).join("\n")}`,
  );
}

console.log(
  `Production output check passed: ${htmlFiles.length} HTML files have CSP, no inline handlers or executable inline scripts, and no private pages were generated.`,
);
