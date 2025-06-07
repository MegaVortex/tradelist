const fs = require("fs");
const path = require("path");

module.exports = class {
  data({ query }) {
    const dataDir = path.join(__dirname, "..", "data");
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));

    let shows = files
      .map(file => {
        const json = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));
        return {
          ...json,
          fileSlug: file.replace(/\.json$/, ""),
          permalink: `/shows/${file.replace(/\.json$/, "")}/index.html`
        };
      })
      .filter(show => show.public !== false);

    const selectedBand = query?.band ? decodeURIComponent(query.band) : null;

    if (selectedBand) {
      shows = shows.filter(show =>
        show.bands &&
        show.bands.map(b => b.toLowerCase()).includes(selectedBand.toLowerCase())
      );
    }

    return {
      layout: "base.njk",
      title: "All Shows",
      shows,
      selectedBand,
      pagination: {
        data: "shows",
        size: 25,
        alias: "show",
		filter: (show) => show.public !== false
      },
      permalink: "/shows/index.html"
    };
  }

  render({ shows, selectedBand }) {
    return `<p>${shows.length} shows ${selectedBand ? `for ${selectedBand}` : ""}</p>`;
  }
};