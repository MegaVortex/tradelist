const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  // ✅ Format UNIX timestamp (seconds) into human-readable date
  eleventyConfig.addFilter("date", (timestamp, format = "yyyy-MM-dd") => {
    if (!timestamp) return "—";
    return DateTime.fromSeconds(timestamp).toFormat(format);
  });

  // ✅ Format seconds into HH:MM:SS
  eleventyConfig.addFilter("formatTime", (seconds) => {
    if (!seconds || typeof seconds !== "number") return "—";
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  });

  // ✅ Directories and formats
  return {
    dir: {
      input: "src",
      output: "public",
      includes: "_includes"
    },
    templateFormats: ["njk", "html", "js"]
  };
};
