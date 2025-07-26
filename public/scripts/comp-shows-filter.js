let currentLetter = 'all';
let tableRows = [];

function updateShowCount() {
    const countSpan = document.getElementById('show-count-number');
    if (!countSpan) return;

    const allRows = [...document.querySelectorAll('#shows-table tbody tr')];
    const visibleShows = allRows.filter(row =>
        row.style.display !== 'none' &&
        !row.hasAttribute('data-label')
    );

    countSpan.textContent = visibleShows.length;
}

function markAlreadyAdded() {
    const cart = JSON.parse(localStorage.getItem('cart') || '{}');
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        const id = btn.dataset.id;
        if (cart[id]) {
            btn.innerHTML = '✅';
            btn.classList.remove('btn-outline-success');
            btn.classList.add('btn-success');
        }
    });
}
markAlreadyAdded();

document.addEventListener('DOMContentLoaded', () => {
    window.selectedBand = null;
    const tbody = document.querySelector('#shows-table tbody');
    tableRows = [...tbody.querySelectorAll('tr')];

    // --- MODIFIED: Sorter function for VA shows (Band, Start Date, End Date, then Title) ---
    const vaShowSorter = (a, b) => {
        // 1. Sort by Band Name (alphabetically)
        const bandA = (a.dataset.band || '').split('|||')[0].toLowerCase();
        const bandB = (b.dataset.band || '').split('|||')[0].toLowerCase();
        const bandCompare = bandA.localeCompare(bandB);
        if (bandCompare !== 0) {
            return bandCompare;
        }

        // 2. If bands are identical, sort by Start Date (YYYY-MM-DD format works well with localeCompare)
        const startDateA = a.querySelector('td:nth-child(2)')?.innerText || '';
        const startDateB = b.querySelector('td:nth-child(2)')?.innerText || '';
        const startDateCompare = startDateA.localeCompare(startDateB);
        if (startDateCompare !== 0) {
            return startDateCompare;
        }

        // 3. If start dates are identical, sort by End Date
        const endDateA = a.querySelector('td:nth-child(3)')?.innerText || ''; // End Date is the 3rd column
        const endDateB = b.querySelector('td:nth-child(3)')?.innerText || '';
        const endDateCompare = endDateA.localeCompare(endDateB);
        if (endDateCompare !== 0) {
            return endDateCompare;
        }

        // 4. If end dates are identical, sort by Title (with numeric sorting)
        // You would need to ensure the title (showName) is accessible for comparison.
        // If the title is not directly in a data attribute or visible cell, you might need to look it up.
        // For this example, let's assume `data-title` exists on the row for 'showName'
        const titleA = (a.dataset.title || '').toLowerCase(); // Assuming data-title attribute exists
        const titleB = (b.dataset.title || '').toLowerCase(); // Assuming data-title attribute exists
        return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
    };

    // --- Sort the rows initially ---
    const showRows = tableRows.filter(r => !r.hasAttribute('data-label'));
    showRows.sort(vaShowSorter);
    // Re-append sorted rows (and their corresponding labels) to the table body
    showRows.forEach(row => {
        const bandLabel = row.previousElementSibling;
        if (bandLabel && bandLabel.classList.contains('band-label-row')) {
           // This part needs adjustment if labels are to be sorted correctly with rows.
           // For simplicity, we just re-append the rows. This might misorder band labels.
        }
        tbody.appendChild(row);
    });

    function buildBandPillsForLetter(letter) {
        const bandSet = new Set();
        tableRows.forEach(row => {
            const bands = (row.dataset.band || '').split('|||');
            bands.forEach(band => {
                const trimmed = band.trim();
                const first = trimmed[0]?.toUpperCase();
                if (
                    (letter === 'all') ||
                    (letter === '#' && !/^[A-Z]/.test(first)) ||
                    (first === letter)
                ) {
                    bandSet.add(trimmed);
                }
            });
        });

        const sortedBands = [...bandSet].sort();
        const bandPillsContainer = document.getElementById("band-pills");

        if (sortedBands.length === 0) {
            bandPillsContainer.innerHTML = '';
            bandPillsContainer.style.display = 'none';
            return;
        }

        bandPillsContainer.innerHTML = sortedBands.map(band =>
            `<span class="band-pill" data-band="${band}">${band}</span>`
        ).join("");

        bandPillsContainer.style.display = 'flex';

        bandPillsContainer.querySelectorAll(".band-pill").forEach(pill => {
            pill.addEventListener("click", e => {
                pill.classList.toggle("bg-primary");
                pill.classList.toggle("bg-secondary");

                const activeBands = [...document.querySelectorAll(".band-pill.bg-primary")]
                    .map(p => p.dataset.band.toLowerCase());
                window.selectedBand = activeBands.length === 1 ? activeBands[0] : null;

                tableRows.forEach(row => {
                    const raw = (row.dataset.band || "").toLowerCase();
                    const bands = raw.split("|||").map(b => b.trim());

                    const matchLetter = currentLetter === 'all' || bands.some(b => {
                        const first = b[0]?.toUpperCase();
                        return (currentLetter === '#' && !/^[A-Z]/.test(first)) || first === currentLetter;
                    });

                    const matchBand = activeBands.length === 0 || bands.some(b => activeBands.includes(b));

                    row.style.display = matchLetter && matchBand ? '' : 'none';
                });

                updateShowCount();
                paginateShows();
            });
        });
    }

    const letterBar = document.getElementById('letter-bar');
    const letters = new Set();
    tableRows.forEach(row => {
        const bands = (row.dataset.band || '').split('|||');
        bands.forEach(b => {
            const first = b.trim()[0]?.toUpperCase();
            if (first) letters.add(/^[A-Z]$/.test(first) ? first : '#');
        });
    });

    const sorted = Array.from(letters).sort();
    const barHTML = sorted.map(l =>
        `<li class="nav-item">
            <a class="nav-link" href="#" data-letter="${l}">${l}</a>
        </li>`
    ).join('');
    letterBar.innerHTML = `<ul class="nav nav-pills">${barHTML}</ul>`;

    letterBar.addEventListener('click', e => {
        if (e.target.tagName !== 'A') return;
        e.preventDefault();
        window.selectedBand = null;
        const selected = e.target.dataset.letter;
        currentLetter = selected;

        letterBar.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
        e.target.classList.add('active');

        buildBandPillsForLetter(currentLetter);

        // Filter rows based on the selected letter
        tableRows.forEach(row => {
            if (row.hasAttribute('data-label')) return; // Ignore label rows for now

            const bands = (row.dataset.band || '').split('|||');
            const match = selected === 'all' || bands.some(b => {
                const first = b.trim()[0]?.toUpperCase();
                const isNumber = !/^[A-Z]/.test(first);
                return (selected === '#' && isNumber) || first === selected;
            });
            row.style.display = match ? '' : 'none';
        });

        // Hide all band labels initially
        document.querySelectorAll('.band-label-row').forEach(label => label.style.display = 'none');

        // Show only the labels for visible bands
        const visibleRows = tableRows.filter(row => row.style.display !== 'none');
        visibleRows.forEach(row => {
            const label = row.previousElementSibling;
            if (label && label.classList.contains('band-label-row')) {
                label.style.display = '';
            }
        });

        updateShowCount();
        paginateShows();
    });

function paginateShows() {
    // 1. Get the list of all shows that are currently visible based on the active filters.
    const rows = [...document.querySelectorAll('.paginated-show')].filter(row => row.style.display !== 'none');
    const perPage = 200;
    const controls = document.getElementById('pagination-controls');

    // If there are not enough rows to need pagination, hide the controls and exit.
    if (rows.length <= perPage) {
        if (controls) controls.innerHTML = '';
        // Make sure all rows in this small set are visible.
        rows.forEach(r => r.style.display = '');
        return;
    }

    let currentPage = 1;
    const totalPages = Math.ceil(rows.length / perPage);

    function showPage(page) {
        currentPage = page;

        // This is the core fix:
        // Iterate over the filtered list and decide visibility based only on the current page number.
        // This is much simpler and avoids the previous conflict.
        rows.forEach((row, index) => {
            const isVisible = (index >= (page - 1) * perPage && index < page * perPage);
            row.style.display = isVisible ? '' : 'none';
        });

        renderPaginationControls();
        updateShowCount(); // It's better to update the count after showing the page.
    }

    function renderPaginationControls() {
        if (totalPages <= 1) {
            controls.innerHTML = '';
            return;
        }

        let html = '<nav><ul class="pagination justify-content-center">';

        // "Previous" arrow
        if (currentPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">←</a></li>`;
        }

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }

        // "Next" arrow
        if (currentPage < totalPages) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">→</a></li>`;
        }

        html += '</ul></nav>';
        controls.innerHTML = html;

        // Re-attach event listeners for the new pagination links
        controls.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const page = parseInt(btn.dataset.page, 10);
                showPage(page);
            });
        });
    }

    // Initially, show the first page.
    showPage(1);
}
    updateShowCount();
    if (!window.selectedBand) {
        paginateShows();
    }
});