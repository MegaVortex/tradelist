function insertGroupLabels() {
    const tbody = document.querySelector("#shows-table tbody");
    if (!tbody) return;

    const rows = [...tbody.querySelectorAll("tr.paginated-show")];
    tbody.querySelectorAll(".band-label-row").forEach(el => el.remove());

    let currentBand = null;

    rows.forEach(row => {
        const bandAttr = row.dataset.band ? row.dataset.band.split("|||")[0] : "";
        if (bandAttr && bandAttr !== currentBand) {
            currentBand = bandAttr;
            const labelRow = document.createElement("tr");
            labelRow.classList.add("band-label-row");
            labelRow.setAttribute("data-label", "true");
            labelRow.innerHTML = `
                <td colspan="12" class="band-label">🎸 ${bandAttr}</td>
            `;
            tbody.insertBefore(labelRow, row);
        }
    });
}