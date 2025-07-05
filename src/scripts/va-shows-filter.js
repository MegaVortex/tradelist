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

    // --- NEW: Sorter function for VA shows (Date first) ---
    const vaShowSorter = (a, b) => {
        // Get dates from the second column (YYYY-MM-DD format works well with localeCompare)
        const dateA = a.querySelector('td:nth-child(2)')?.innerText || '';
        const dateB = b.querySelector('td:nth-child(2)')?.innerText || '';

        // Compare dates first
        const dateCompare = dateA.localeCompare(dateB);
        if (dateCompare !== 0) {
            return dateCompare;
        }

        // If dates are identical, use band name as a tie-breaker
        const bandA = (a.dataset.band || '').split('|||')[0].toLowerCase();
        const bandB = (b.dataset.band || '').split('|||')[0].toLowerCase();
        return bandA.localeCompare(bandB);
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
        const rows = [...document.querySelectorAll('.paginated-show')].filter(row => row.style.display !== 'none');
        const perPage = 25;
        const controls = document.getElementById('pagination-controls');

        if (rows.length <= perPage) {
            if (controls) controls.innerHTML = '';
            rows.forEach(r => r.style.display = ''); // Ensure they are visible if not paginated
            return;
        }

        let currentPage = 1;
        let totalPages = Math.ceil(rows.length / perPage);

        function showPage(page) {
            currentPage = page;
            rows.forEach((row, i) => {
                const isVisible = (i >= (page - 1) * perPage && i < page * perPage);
                // Important: Only change display for paginated rows that are meant to be visible from letter filter
                if (row.style.display !== 'none') {
                    row.style.display = isVisible ? '' : 'none';
                }
            });
            renderPaginationControls();
            updateShowCount();
        }

        function renderPaginationControls() {
            if (totalPages <= 1) {
                controls.innerHTML = '';
                return;
            }

            let html = '<nav><ul class="pagination justify-content-center">';

            if (currentPage > 1) {
                html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">←</a></li>`;
            }

            // Simplified pagination display logic for brevity
            for (let i = 1; i <= totalPages; i++) {
                html += `<li class="page-item${i === currentPage ? ' active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>`;
            }

            if (currentPage < totalPages) {
                html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">→</a></li>`;
            }

            html += '</ul></nav>';
            controls.innerHTML = html;

            controls.querySelectorAll('[data-page]').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    const page = parseInt(btn.dataset.page);
                    showPage(page);
                });
            });
        }
        showPage(1);
    }
    updateShowCount();
    if (!window.selectedBand) {
        paginateShows();
    }
});