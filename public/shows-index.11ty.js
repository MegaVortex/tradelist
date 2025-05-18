const fs = require("fs");
const path = require("path");

exports.data = {
  layout: "base.njk",
  permalink: "/shows/index.html"
};

exports.render = function () {
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

  return `
    <h1>All Shows</h1>
    <ul>
      ${shows.map(show => `
        <li>
          <a href="${show.permalink}">
            ${show.bands?.join(", ") ?? "—"} (${show.startDate?.year ?? "?"})
          </a>
        </li>
      `).join("")}
    </ul>
  `;
};
