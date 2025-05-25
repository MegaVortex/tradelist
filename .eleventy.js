const fs = require("fs");
const path = require("path");
const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/styles": "styles" });
	
  // ✅ Date formatter
  eleventyConfig.addFilter("date", (timestamp, format = "yyyy-MM-dd") => {
    return DateTime.fromSeconds(timestamp).toFormat(format);
  });

  // ✅ Duration formatter
  eleventyConfig.addFilter("formatTime", (seconds) => {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  });
  
eleventyConfig.addFilter("smartSize", function(num) {
  if (typeof num !== "number") num = parseFloat(num);
  if (isNaN(num)) return "—";

  const str = String(num);

  if (/^\d{3,}$/.test(str)) return str;

  return num.toFixed(2);
});

  // ✅ Load all JSON files into global `shows`
  eleventyConfig.addGlobalData("shows", () => {
    const dataDir = "./src/data";
    if (!fs.existsSync(dataDir)) return [];
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));
    return files.map(file => {
      const json = JSON.parse(fs.readFileSync(`${dataDir}/${file}`, "utf-8"));
      return {
        ...json,
        fileSlug: file.replace(/\.json$/, ""),
        permalink: `/tradelist/shows/${file.replace(/\.json$/, "")}/index.html`
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