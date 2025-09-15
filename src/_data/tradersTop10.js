const fs = require('fs');
const traders = JSON.parse(fs.readFileSync('./src/traders/traders_index.json', 'utf-8'));

const medals = ["🥇", "🥈", "🥉"];
const otherEmoji = "📼";

const top10 = Object.entries(traders)
    .map(([trader, shows]) => ({
        trader,
        count: shows.length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item, index) => ({
        emoji: index < 3 ? medals[index] : otherEmoji,
        trader: item.trader,
        count: item.count
    }));

module.exports = top10;