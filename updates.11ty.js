module.exports = {
  data: {
    layout: "base.njk",
    title: "Recently Added",
    permalink: "/updates/index.html",
    eleventyExcludeFromCollections: true,
  },

  render({ shows }) {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - 180 * 86400;

    const recent = shows.filter(s => s.public && s.created && s.created >= cutoff);

    const grouped = {};
    for (const show of recent) {
      const dateStr = new Date(show.created * 1000).toISOString().slice(0, 10);
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(show);
    }

    for (const dateStr in grouped) {
      grouped[dateStr].sort((a, b) => a.artist.localeCompare(b.artist));
    }

    const groupedSorted = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));

    return { showsGroupedByDate: groupedSorted };
  }
};