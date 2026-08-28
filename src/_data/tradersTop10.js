const fs = require("fs");
const traders = JSON.parse(
  fs.readFileSync("./src/traders/traders_index.json", "utf-8")
);

const medals = ["🥇", "🥈", "🥉"];
const other = "📼";

const top10 = traders
  .map(t => ({
    name: t.name,
    website: t.website || "",
    count: Array.isArray(t.shows) ? t.shows.length : 0
  }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 10)
  .map((t, i) => ({
    emoji: i < 3 ? medals[i] : other,
    ...t
  }));

module.exports = top10;