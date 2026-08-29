(async function () {
  "use strict";

  const cacheTtl = 12 * 60 * 60 * 1000;
  const timestampKey = "allShowsDataTimestamp";
  const dataKey = "allShowsData";
  const freshShows = window.allShowsData || [];
  const showCount = document.getElementById("show-count-number");

  let shows = await getFromDB(dataKey);
  const lastUpdated = await getFromDB(timestampKey);
  const now = Date.now();

  if (
    !Array.isArray(shows) ||
    shows.length === 0 ||
    !lastUpdated ||
    now - lastUpdated > cacheTtl
  ) {
    shows = freshShows;
    await saveToDB(dataKey, shows);
    await saveToDB(timestampKey, now);
  }

  window.allShowsData = shows;
  if (showCount) showCount.textContent = String(shows.length);
  initializeShowFilters(shows);
})().catch((error) => {
  console.error("Could not initialize the show browser.", error);
});
