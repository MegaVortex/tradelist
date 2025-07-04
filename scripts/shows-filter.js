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

    function buildBandPillsForLetter(letter) {
        const bandSet = new Set();
        tableRows.forEach(row => {
            const band = row.dataset.band || '';
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

                const hintBox = document.getElementById("grouping-hint");
                if (activeBands.length !== 1) {
                    hintBox.textContent = "ℹ️ Grouping by category and year is only available when one band is selected.";
                    hintBox.style.display = 'block';
                } else {
                    hintBox.textContent = '';
                    hintBox.style.display = 'none';
                }

                tableRows.forEach(row => {
                    const raw = (row.dataset.band || "").toLowerCase();
                    const bands = raw.split("|||").map(b => b.trim());

                    const first = bands[0]?.[0]?.toUpperCase();
                    const isNumber = !/^[A-Z]/.test(first);
                    const matchLetter = currentLetter === 'all' || (currentLetter === '#' && isNumber) || first === currentLetter;
                    const matchBand = activeBands.length === 0 || bands.some(b => activeBands.includes(b));

                    row.style.display = matchLetter && matchBand ? '' : 'none';

                });

                updateShowCount();
                insertGroupLabels();
                paginateShows();
            });
        });
    }

    const showRows = tableRows.filter(r => !r.hasAttribute('data-label'));

    // Sort by band, then date
    showRows.sort((a, b) => {
        const bandA = (a.dataset.band || '').split('|||')[0].toLowerCase();
        const bandB = (b.dataset.band || '').split('|||')[0].toLowerCase();

        if (bandA < bandB) return -1;
        if (bandA > bandB) return 1;

        const dateA = a.querySelector('td:nth-child(2)')?.innerText || '';
        const dateB = b.querySelector('td:nth-child(2)')?.innerText || '';
        return dateA.localeCompare(dateB);
    });

    showRows.forEach(row => tbody.appendChild(row));

    tableRows.sort((a, b) => {
        const bandA = (a.dataset.band || '').split('|||')[0].trim().toLowerCase();
        const bandB = (b.dataset.band || '').split('|||')[0].trim().toLowerCase();
        if (bandA < bandB) return -1;
        if (bandA > bandB) return 1;

        const dateA = a.querySelector('td:nth-child(2)')?.innerText || '';
        const dateB = b.querySelector('td:nth-child(2)')?.innerText || '';
        return dateA.localeCompare(dateB);
    });
    const letterBar = document.getElementById('letter-bar');
    const dropdownWrapper = document.getElementById("band-dropdown-wrapper");
    const dropdown = document.getElementById("band-dropdown");

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

        tableRows.forEach(row => {
            if (row.hasAttribute('data-label')) {
                row.style.display = 'none';
                return;
            }
            const bands = (row.dataset.band || '').split('|||');
            let match = selected === 'all';
            if (bands[0]) {
                const first = bands[0].trim()[0]?.toUpperCase();
                const isNumber = !/^[A-Z]/.test(first);
                match = (selected === 'all') || (selected === '#' && isNumber) || (first === selected);
            }
            row.style.display = match ? '' : 'none';
        });

        buildBandPillsForLetter(currentLetter);
        updateShowCount();
        insertGroupLabels();

        paginateShows();
    });

    function paginateShows() {
        const activeBands = document.querySelectorAll(".band-pill.bg-primary");

        if (activeBands.length === 1) {
            const controls = document.getElementById('pagination-controls');
            if (controls) {
                controls.innerHTML = '';
            }

            const visibleRows = [...document.querySelectorAll('.paginated-show')].filter(row => row.style.display !== 'none');
            visibleRows.forEach(r => r.style.display = '');

            return;
        }
        const rows = [...document.querySelectorAll('.paginated-show')].filter(row => row.style.display !== 'none');
        const perPage = 25;
        if (rows.length <= perPage) {
            const controls = document.getElementById('pagination-controls');
            if (controls) controls.innerHTML = '';
            rows.forEach(r => r.style.display = '');
            return;
        }
        let currentPage = 1;
        let totalPages = Math.ceil(rows.length / perPage);

        function showPage(page) {
            currentPage = page;
            rows.forEach((row, i) => {
                row.style.display = (i >= (page - 1) * perPage && i < page * perPage) ? '' : 'none';
            });
            renderPaginationControls();
            updateShowCount();
            insertGroupLabels();
        }

        function renderPaginationControls() {
            const controls = document.getElementById('pagination-controls');
            if (totalPages <= 1) {
                controls.innerHTML = '';
                return;
            }

            let html = '<nav><ul class="pagination justify-content-center">';

            if (currentPage > 1) {
                html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">←</a></li>`;
            }

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
    insertGroupLabels();
    if (!window.selectedBand) {
        paginateShows();
    }
});