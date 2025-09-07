function initializeShowFilters(shows) {
    let currentFilterLetter = 'all';
    let currentFilterBands = [];
    let currentPage = 1;
    const perPage = 100;

    const tbody = document.getElementById('shows-table-body');
    const showCountSpan = document.getElementById('show-count-number');
    const paginationControls = document.getElementById('pagination-controls');

    shows.sort((a, b) => {
        const bandA = (a.bands && a.bands.length) ? a.bands[0].toLowerCase() : '';
        const bandB = (b.bands && b.bands.length) ? b.bands[0].toLowerCase() : '';
        if (bandA < bandB) return -1;
        if (bandA > bandB) return 1;
        return (b.startDateUnix || 0) - (a.startDateUnix || 0);
    });

    function renderPage(filteredShows, page) {
        currentPage = page;
        tbody.innerHTML = '';

        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const showsForPage = filteredShows.slice(startIndex, endIndex);

        if (showsForPage.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" style="text-align: center;">No shows match your filters.</td></tr>';
            return;
        }

        let rowsHtml = '';
        showsForPage.forEach(show => {
            const dateDisplay = show.startDateUnix ? new Date(show.startDateUnix * 1000).toISOString().slice(0, 10) : '—';
            const locationDisplay = show.location ? [show.location.city, show.location.country].filter(Boolean).join(', ') : '—';
            
            rowsHtml += `
                <tr class="paginated-show" data-band="${show.bands ? show.bands.join('|||') : ''}">
                    <td>${show.bands ? show.bands.join(', ') : '—'}</td>
                    <td>${dateDisplay}</td>
                    <td>${locationDisplay}</td>
                    <td>${show.specs && show.specs.length ? Math.round(show.specs.length / 60) + ' min' : '—'}</td>
                    <td>${show.specs && show.specs.media && show.specs.media[0] ? `${show.specs.media[0].size}${show.specs.media[0].unit}`: '—'}</td>
                    <td>${show.specs && show.specs.sourceDetail ? show.specs.sourceDetail.fileFormat : '—'}</td>
                    <td>${show.specs && show.specs.sourceDetail ? show.specs.sourceDetail.recordingType : '—'}</td>
                    <td>${show.source || '—'}</td>
                    <td>${show.tapers ? show.tapers.join(', ') : '—'}</td>
                    <td>${show.images && show.images.length ? `📷 ${show.images.length}` : '—'}</td>
                    <td><a href="${show.permalink || '#'}" title="View info">🎫</a></td>
                    <td><button class="btn btn-sm btn-outline-success add-to-cart" data-id="${show.fileSlug}">➕</button></td>
                </tr>
            `;
        });

        tbody.innerHTML = rowsHtml;
        markAlreadyAdded();
        insertGroupLabels();
    }

    function renderPagination(totalItems, page) {
        const totalPages = Math.ceil(totalItems / perPage);
        paginationControls.innerHTML = '';
        if (totalPages <= 1) return;

        let html = '<nav><ul class="pagination justify-content-center">';
        if (page > 1) html += `<li class="page-item"><a class="page-link" href="#" data-page="${page - 1}">←</a></li>`;
        
        for (let i = 1; i <= totalPages; i++) {
            html += `<li class="page-item ${i === page ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        
        if (page < totalPages) html += `<li class="page-item"><a class="page-link" href="#" data-page="${page + 1}">→</a></li>`;
        html += '</ul></nav>';
        paginationControls.innerHTML = html;
    }

    function updateDisplay() {
        const lowerCaseBands = currentFilterBands.map(b => b.toLowerCase());
        
        const filteredShows = shows.filter(show => {
            if (!show.bands || show.bands.length === 0) return false;

            const firstLetter = (show.bands[0][0] || '').toUpperCase();
            const isNumeric = !/^[A-Z]/.test(firstLetter);
            const letterMatch = currentFilterLetter === 'all' || (currentFilterLetter === '#' && isNumeric) || firstLetter === currentFilterLetter;
            if (!letterMatch) return false;

            const bandMatch = lowerCaseBands.length === 0 || show.bands.some(b => lowerCaseBands.includes(b.toLowerCase()));
            return bandMatch;
        });

        showCountSpan.textContent = filteredShows.length;
        renderPage(filteredShows, 1);
        renderPagination(filteredShows.length, 1);
    }

    function buildLetterBar() {
        const letterBar = document.getElementById('letter-bar');
        const letters = new Set();
        shows.forEach(show => {
            if (show.bands && show.bands.length > 0) {
                const first = (show.bands[0][0] || '').toUpperCase();
                if (first) letters.add(/^[A-Z]$/.test(first) ? first : '#');
            }
        });

        const sortedLetters = Array.from(letters).sort();
        const barHTML = sortedLetters.map(l => `<li class="nav-item"><a class="nav-link" href="#" data-letter="${l}">${l}</a></li>`).join('');
        letterBar.innerHTML = `<ul class="nav nav-pills"><li class="nav-item"><a class="nav-link active" href="#" data-letter="all">All</a></li>${barHTML}</ul>`;

        letterBar.addEventListener('click', e => {
            if (e.target.tagName !== 'A') return;
            e.preventDefault();
            letterBar.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
            e.target.classList.add('active');
            
            currentFilterLetter = e.target.dataset.letter;
            updateDisplay();
            buildBandPills();
        });
    }

    function buildBandPills() {
        const bandPillsContainer = document.getElementById("band-pills");
        const bandSet = new Set();

        shows.forEach(show => {
            if (show.bands && show.bands.length > 0) {
                const firstLetter = (show.bands[0][0] || '').toUpperCase();
                const isNumeric = !/^[A-Z]/.test(firstLetter);
                const letterMatch = currentFilterLetter === 'all' || (currentFilterLetter === '#' && isNumeric) || firstLetter === currentFilterLetter;
                if(letterMatch) {
                    show.bands.forEach(band => bandSet.add(band));
                }
            }
        });

        const sortedBands = [...bandSet].sort();
        if (sortedBands.length === 0) {
            bandPillsContainer.innerHTML = '';
            bandPillsContainer.style.display = 'none';
            return;
        }

        bandPillsContainer.innerHTML = sortedBands.map(band => `<span class="band-pill" data-band="${band}">${band}</span>`).join("");
        bandPillsContainer.style.display = 'flex';

        bandPillsContainer.querySelectorAll(".band-pill").forEach(pill => {
            pill.addEventListener("click", () => {
                pill.classList.toggle("bg-primary");
                pill.classList.toggle("bg-secondary");
                currentFilterBands = [...document.querySelectorAll(".band-pill.bg-primary")].map(p => p.dataset.band);
                window.selectedBand = currentFilterBands.length === 1 ? currentFilterBands[0] : null;
                updateDisplay();
            });
        });
    }
    
    paginationControls.addEventListener('click', e => {
        if (e.target.tagName !== 'A') return;
        e.preventDefault();
        const page = parseInt(e.target.dataset.page, 10);
        const filteredShows = shows.filter(show => {
            const letterMatch = currentFilterLetter === 'all' || (show.bands && show.bands.length > 0 && show.bands[0][0].toUpperCase() === currentFilterLetter);
            const bandMatch = currentFilterBands.length === 0 || (show.bands && show.bands.some(b => currentFilterBands.includes(b)));
            return letterMatch && bandMatch;
        });

        renderPage(filteredShows, page);
        renderPagination(filteredShows.length, page);
    });

    buildLetterBar();
    buildBandPills();
    updateDisplay();
}