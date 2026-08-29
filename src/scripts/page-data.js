(function () {
  "use strict";

  const dataElement = document.getElementById("all-shows-data");
  if (!dataElement) {
    window.allShowsData = [];
    return;
  }

  try {
    const parsed = JSON.parse(dataElement.textContent);
    window.allShowsData = Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    window.allShowsData = [];
    console.error("Could not parse embedded show data.", error);
  }
})();
