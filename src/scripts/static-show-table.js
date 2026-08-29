(function () {
  "use strict";

  const table = document.getElementById("shows-table");
  if (!table) return;

  const formatColumn = Number(table.dataset.formatColumn);
  const pageColumn = Number(table.dataset.pageColumn);
  const showsBySlug = new Map(
    (window.allShowsData || []).map((show) => [show.fileSlug, show]),
  );
  const nowSeconds = Math.floor(Date.now() / 1000);
  const twoWeeksSeconds = 14 * 24 * 60 * 60;

  table.querySelectorAll("tbody tr[data-show-id]").forEach((row) => {
    const show = showsBySlug.get(row.dataset.showId);
    if (!show) return;

    const formatCell = row.children[formatColumn];
    if (formatCell) {
      const formatValue =
        formatCell.querySelector(".format-value-other")?.textContent ||
        formatCell.textContent ||
        "—";
      formatCell.replaceChildren();
      formatCell.classList.add("format-cell");

      const value = document.createElement("span");
      value.className = "format-value-other";
      value.textContent = formatValue.trim();
      formatCell.appendChild(value);
      if (typeof window.appendResolutionBadges === "function") {
        window.appendResolutionBadges(formatCell, show);
      }
    }

    const pageCell = row.children[pageColumn];
    const created = Number(show.created);
    if (
      pageCell &&
      Number.isFinite(created) &&
      nowSeconds - created <= twoWeeksSeconds
    ) {
      const label = document.createElement("span");
      label.className = "new-label";
      label.textContent = "NEW";
      pageCell.appendChild(label);
    }
  });
})();
