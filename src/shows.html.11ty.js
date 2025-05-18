const fs = require("fs");
const path = require("path");

exports.data = () => {
  const dataDir = path.join(__dirname, "data");
  const files = fs.readdirSync(dataDir).filter(name => name.endsWith(".json"));

  return files.map(filename => {
    const filePath = path.join(dataDir, filename);
    const show = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    return {
      data: {
        layout: "templates/shows.njk",  // ✅ match the layout path
        permalink: `/shows/${filename.replace(/\.json$/, "")}/index.html`,
        ...show                          // ✅ this makes data available in layout
      }
    };
  });
};
