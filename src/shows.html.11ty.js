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
        layout: "templates/show.njk",
        permalink: `/shows/${filename.replace(/\.json$/, "")}/index.html`
      },
      ...show,
      fileSlug: filename.replace(/\.json$/, "")
    };
  });
};

exports.render = function (data) {
  return data;
};