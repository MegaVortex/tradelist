const fs = require("fs");
const path = require("path");

module.exports = () => {
  const dataDir = path.join(__dirname, "..", "data"); // Go up one level to src/data
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));

  const shows = files.map(file => {
    const json = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));
    return {
      ...json,
      fileSlug: file.replace(/\.json$/, ""),
      permalink: `/shows/${file.replace(/\.json$/, "")}/index.html`
    };
  });

  return {
    layout: "base.njk",
    shows,
    permalink: "/shows/index.html"
  };
};
