const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "src", "data");

function walk(dirPath) {
  return fs.readdirSync(dirPath).flatMap(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      return walk(fullPath);
    } else if (file.endsWith(".json")) {
      return [fullPath];
    } else {
      return [];
    }
  });
}

const files = walk(dir);
console.log(`Found ${files.length} JSON files.`);

let nonPublic = [];

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (data.public === false) {
      nonPublic.push(file);
    }
  } catch (err) {
    console.error("Failed to parse:", file, err.message);
  }
}

console.log(`Found ${nonPublic.length} files with "public": false`);
fs.writeFileSync("nonPublic.json", JSON.stringify(nonPublic, null, 2));
console.log("List written to nonPublic.json");