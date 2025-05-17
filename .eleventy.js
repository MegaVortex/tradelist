const fs = require("fs");
const path = require("path");
const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  // ✅ Date formatter
  eleventyConfig.addFilter("date", (timestamp, format = "yyyy-MM-dd") => {
    return DateTime.fromSeconds(timestamp).toFormat(format);
  });

  // ✅ Duration formatter
  eleventyConfig.addFilter("formatTime", (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  });

  // ✅ Ignore raw JSON from being compiled
  eleventyConfig.ignores.add("src/data/*.json");

  // ✅ Load all JSON as global `shows`
  eleventyConfig.addGlobalData("shows", () => {
    const dataDir = "./src/data";
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json") && f !== "shows.json");

    return files.map(file => {
      const json = JSON.parse(fs.readFileSync(`${dataDir}/${file}`, "utf-8"));
      return {
        ...json,
        fileSlug: file.replace(/\.json$/, ""),
        permalink: `/shows/${file.replace(/\.json$/, "")}/index.html`
      };
    });
  });

  return {
    dir: {
      input: "src",
      output: "public",
      includes: "_includes"
    },
    templateFormats: ["njk", "html", "js"]
  };
};