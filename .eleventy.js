const fs = require("fs");
const path = require("path");
const {
    DateTime
} = require("luxon");
const ISO6391 = require("iso-639-1");

module.exports = function(eleventyConfig) {
    // Existing filter for language names
    eleventyConfig.addFilter("langName", function(code) {
        if (!code || typeof code !== "string") return "";
        return ISO6391.getName(code) || code;
    });

    // Passthrough copies for static assets
    eleventyConfig.addPassthroughCopy({
      "src/styles": "styles",
      "src/scripts": "scripts",
      "src/assets/images": "assets/images"
    });

    // Passthrough copies for node_modules dependencies
    eleventyConfig.addPassthroughCopy({
      'node_modules/bootstrap/dist/js/bootstrap.bundle.min.js': 'scripts/bootstrap.bundle.min.js'
    });

    eleventyConfig.addPassthroughCopy({
      'node_modules/bootstrap/dist/css/bootstrap.min.css': 'styles/bootstrap.min.css'
    });

    // Existing "date" formatter
    eleventyConfig.addFilter("date", (timestamp, format = "yyyy-MM-dd") => {
        if (timestamp === null || typeof timestamp === 'undefined') return '';
        return DateTime.fromSeconds(timestamp).toFormat(format);
    });

    // 🌟🌟🌟 HELPER FILTERS (already good) 🌟🌟🌟

    // NEW HELPER FILTER: Safely converts a value to an integer, defaults to 0 if invalid
    eleventyConfig.addFilter("toInt", (value) => {
        const num = parseInt(value, 10);
        return isNaN(num) ? 0 : num; // Returns 0 for empty strings or non-numeric values
    });

    // NEW HELPER FILTER: Pads a string with a leading character (default '0') to a specified length
    eleventyConfig.addFilter("padStart", (value, length, padChar = '0') => {
        if (value === null || typeof value === 'undefined') return ''; // Handle null/undefined values
        return String(value).padStart(length, padChar);
    });

    // 🌟🌟🌟 END OF HELPER FILTERS 🌟🌟🌟


    // Duration formatter
    eleventyConfig.addFilter("formatTime", (seconds) => {
        if (!seconds) return "—";
        const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${h}:${m}:${s}`;
    });

    eleventyConfig.addFilter("smartSize", function (num) {
      if (typeof num !== "number") num = parseFloat(num);
      if (isNaN(num)) return "—";

      // If it's 3+ digit integer (before decimal), return as is
      if (num >= 100) return String(Math.round(num));

      // If < 10, show 2 decimal places: 4 → 4.00, 4.1 → 4.10, 4.12 → 4.12
      if (num < 10) return num.toFixed(2);

      // If 10–99.9 range, show 1 decimal place: 11 → 11.0, 11.12 → 11.1
      return (Math.round(num * 10) / 10).toFixed(1);
    });

    // Load all JSON files and filter them into categories
    eleventyConfig.addGlobalData("allShowData", () => {
        const dataDir = "./src/data";
        if (!fs.existsSync(dataDir)) {
            console.warn(`Data directory not found: ${dataDir}`);
            return {
                allShows: [],
                publicShows: [],
                singleArtistShows: [],
                variousArtistShows: []
            };
        }

        const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));
        const allShows = files.map(file => {
            const json = JSON.parse(fs.readFileSync(`${dataDir}/${file}`, "utf-8"));
            return {
                ...json,
                fileSlug: file.replace(/\.json$/, ""),
                permalink: `/shows/${file.replace(/\.json$/, "")}/index.html`
            };
        }).sort((a, b) => {
            // Priority 1: Sort by startDateUnix (ascending). Items without Unix date go to the beginning.
            const unixA = a.startDateUnix;
            const unixB = b.startDateUnix;

            // If both have valid unix dates
            if (typeof unixA === 'number' && typeof unixB === 'number') {
                return unixA - unixB;
            }

            else if (typeof unixA === 'number') {
                return 1;
            }
            // If only B has a valid unix date, A comes before B (B is "older")
            else if (typeof unixB === 'number') {
                return -1;
            }

            // Priority 2: If both startDateUnix are null/undefined, sort by startDate.year, month, day (ascending)
            const sdA = a.startDate || {};
            const sdB = b.startDate || {};

            const yearA = parseInt(sdA.year, 10) || 0;
            const yearB = parseInt(sdB.year, 10) || 0;
            if (yearA !== yearB) {
                return yearA - yearB; // <--- CHANGE THIS LINE (was yearB - yearA)
            }

            const monthA = parseInt(sdA.month, 10) || 0;
            const monthB = parseInt(sdB.month, 10) || 0;
            if (monthA !== monthB) {
                return monthA - monthB; // <--- CHANGE THIS LINE (was monthB - monthA)
            }

            const dayA = parseInt(sdA.day, 10) || 0;
            const dayB = parseInt(sdB.day, 10) || 0;
            if (dayA !== dayB) {
                return dayA - dayB; // <--- CHANGE THIS LINE (was dayB - dayA)
            }

            // Priority 3: Fallback to sorting by primary artist name (ascending, alphabetical)
            // This logic naturally sorts alphabetically (ascending)
            const bandA = (a.bands && a.bands[0]) ? String(a.bands[0]).toLowerCase() : '';
            const bandB = (b.bands && b.bands[0]) ? String(b.bands[0]).toLowerCase() : '';
            if (bandA < bandB) return -1;
            if (bandA > bandB) return 1;

            return 0;
        });

        const publicShows = allShows.filter(show => show.public);

        // singleArtistShows and variousArtistShows will now inherit the new sorting order
        const singleArtistShows = publicShows.filter(show => show.bands && show.bands.length === 1);
        const variousArtistShows = publicShows.filter(show => show.bands && show.bands.length > 1);

        return {
            allShows,
            publicShows,
            singleArtistShows,
            variousArtistShows
        };
    });

    // Return the Eleventy configuration object
    return {
        pathPrefix: "/tradelist",
        dir: {
            input: "src",
            output: "public",
            includes: "_includes"
        },
        templateFormats: ["njk", "html", "js"]
    };
};