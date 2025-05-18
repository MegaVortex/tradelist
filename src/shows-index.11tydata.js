module.exports = () => {
  const fs = require("fs");
  const path = require("path");

  const dataDir = path.join(__dirname, "data");
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
    data: {
      layout: "base.njk",
      permalink: "/shows/index.html",
      shows // ✅ now it's under `data`, available to .njk
    }
  };
};
