const fs = require("fs");
const path = require("path");
const {
    DateTime
} = require("luxon");
const ISO6391 = require("iso-639-1");

module.exports = function(eleventyConfig) {
	eleventyConfig.addGlobalData("environment", process.env.ELEVENTY_ENV || "prod");
	
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

    // NEW HELPER FILTER: Safely converts a value to an integer, defaults to 0 if invalid
    eleventyConfig.addFilter("toInt", (value) => {
        const num = parseInt(value, 10);
        return isNaN(num) ? 0 : num;
    });

    // NEW HELPER FILTER: Pads a string with a leading character (default '0') to a specified length
    eleventyConfig.addFilter("padStart", (value, length, padChar = '0') => {
        if (value === null || typeof value === 'undefined') return '';
        return String(value).padStart(length, padChar);
    });

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
        const regularDataDir = "./src/data";
        const vaDataDir = "./src/data-va";
        const compilationDataDir = "./src/data-comp";

        const readShowsFromDir = (dir, type) => {
            if (!fs.existsSync(dir)) {
                console.warn(`Data directory not found: ${dir}`);
                return [];
            }
            const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
            return files.map(file => {
                const json = JSON.parse(fs.readFileSync(`${dir}/${file}`, "utf-8"));
                const fileSlug = file.replace(/\.json$/, "");

                let permalink;
                let specificTypeFlag;

                switch (type) {
                    case 'va':
                        permalink = `/va-shows/${fileSlug}/`;
                        specificTypeFlag = { isVA: true };
                        break;
                    case 'compilation':
                        permalink = `/compilations/${fileSlug}/`;
                        specificTypeFlag = { isCompilation: true };
                        break;
                    default:
                        permalink = `/shows/${fileSlug}/`;
                        specificTypeFlag = { isRegular: true };
                        break;
                }

                return {
                    ...json,
                    fileSlug: fileSlug,
                    ...specificTypeFlag,
                    permalink: permalink
                };
            });
        };

        // Read shows from all directories
        const regularShows = readShowsFromDir(regularDataDir, 'regular');
        const vaShows = readShowsFromDir(vaDataDir, 'va');
        const compilationShows = readShowsFromDir(compilationDataDir, 'compilation');

        // Combine all shows into a single array and sort them
        const allShows = [...regularShows, ...vaShows, ...compilationShows].sort((a, b) => {
            const unixA = a.startDateUnix;
            const unixB = b.startDateUnix;
            if (typeof unixA === 'number' && typeof unixB === 'number') return unixA - unixB;
            if (typeof unixA === 'number') return 1;
            if (typeof unixB === 'number') return -1;

            const sdA = a.startDate || {};
            const sdB = b.startDate || {};
            const yearA = parseInt(sdA.year, 10) || 0;
            const yearB = parseInt(sdB.year, 10) || 0;
            if (yearA !== yearB) return yearA - yearB;

            const monthA = parseInt(sdA.month, 10) || 0;
            const monthB = parseInt(sdB.month, 10) || 0;
            if (monthA !== monthB) return monthA - monthB;

            const dayA = parseInt(sdA.day, 10) || 0;
            const dayB = parseInt(sdB.day, 10) || 0;
            if (dayA !== dayB) return dayA - dayB;

            const bandA = (a.bands && a.bands[0]) ? String(a.bands[0]).toLowerCase() : '';
            const bandB = (b.bands && b.bands[0]) ? String(b.bands[0]).toLowerCase() : '';
            if (bandA < bandB) return -1;
            if (bandA > bandB) return 1;

            return 0;
        });

        const publicShows = allShows.filter(show => show.public !== false);

        // Create separate arrays for public regular, VA, and Compilation shows
        const publicRegularShows = publicShows.filter(show => !show.isVA && !show.isCompilation);
        const publicVaShows = publicShows.filter(show => show.isVA);
        const publicCompilationShows = publicShows.filter(show => show.isCompilation);

        // --- Logic for Updates Page --- (keep existing)
        const now = Math.floor(Date.now() / 1000);
        const cutoff = now - 180 * 86400; // 180 days ago in seconds
        
        const recentShows = publicRegularShows.filter(s => s.created && s.created >= cutoff);
        
        const groupedByDate = {};
        for (const show of recentShows) {
            const dateStr = new Date(show.created * 1000).toISOString().slice(0, 10);
            if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
            groupedByDate[dateStr].push(show);
        }
        
        for (const dateStr in groupedByDate) {
            groupedByDate[dateStr].sort((a, b) => {
                const bandA = (a.bands && a.bands[0]) ? String(a.bands[0]).toLowerCase() : '';
                const bandB = (b.bands && b.bands[0]) ? String(b.bands[0]).toLowerCase() : '';
                return bandA.localeCompare(bandB);
            });
        }

        const updatesPageData = Object.entries(groupedByDate).sort((a, b) => b[0].localeCompare(a[0]));

        const showsBySlug = {};
        for (const show of publicShows) {
            showsBySlug[show.fileSlug] = show;
        }

        return {
            allShows,
            publicShows,
            publicRegularShows,
            publicVaShows,
            publicCompilationShows,
            updatesPageData,
            showsBySlug
        };
    });

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