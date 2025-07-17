const fs = require('fs');
const tapers = JSON.parse(fs.readFileSync('./src/tapers/tapers_index.json', 'utf-8'));

const medals = ["🥇", "🥈", "🥉"];
const otherEmoji = "🎥";

const top10 = Object.entries(tapers)
    .map(([taper, shows]) => ({
        taper,
        count: shows.length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item, index) => ({
        emoji: index < 3 ? medals[index] : otherEmoji,
        taper: item.taper,
        count: item.count
    }));

module.exports = top10;