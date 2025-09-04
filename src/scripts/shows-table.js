window.selectedBand = null;
const cart = getCart();
setCart(cart);
const environment = window.location.hostname === 'localhost' ? 'dev' : 'prod';

const pathPrefix = "/tradelist";

function formatTime(seconds) {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
}

function smartSize(sizeInMB) {
    let num = parseFloat(sizeInMB);
    if (isNaN(num)) return "—";

    if (num >= 100) return String(Math.round(num));
    if (num < 10) return num.toFixed(2);
    return (Math.round(num * 10) / 10).toFixed(1);
}

function getTypeLabel(categoryArray) {
    const cat = Array.isArray(categoryArray) ? categoryArray : [categoryArray];
    const catSet = new Set(cat);

    if (catSet.has('video') && catSet.size === 1) {
        return '<span class="type-label video-label">video</span>';
    } else if (catSet.has('video') && catSet.has('misc')) {
        return '<span class="type-label misc-label">misc</span>';
    } else if (catSet.has('video') && catSet.has('compilation')) {
        return '<span class="type-label video-label">video</span>';
    } else if (catSet.has('audio') && catSet.size === 1) {
        return '<span class="type-label audio-label">audio</span>';
    } else if (catSet.has('audio') && catSet.has('misc')) {
        return '<span class="type-label audio-label">audio</span>';
    } else {
        return '—';
    }
}

function getShowNumber(show) {
  const slug = (show.fileSlug || '').toString();
  // look for "show_1" or "show-1" or "show1", but NOT 10/11 etc.
  const m = slug.match(/show[_\s-]?(\d+)(?=[^\d]|$)/i);
  return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
}

function isSameDayUnix(a, b) {
  const A = new Date(a * 1000);
  const B = new Date(b * 1000);
  return (
    A.getUTCFullYear() === B.getUTCFullYear() &&
    A.getUTCMonth() === B.getUTCMonth() &&
    A.getUTCDate() === B.getUTCDate()
  );
}

function getSourceNumber(show) {
  const s = (show.source || '').toString();
  const m = s.match(/source\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);

  // fallback: sometimes the slug may contain the number
  if (show.fileSlug) {
    const m2 = show.fileSlug.match(/source[_\s-]?(\d+)/i);
    if (m2) return parseInt(m2[1], 10);
  }

  // no number? sort these last
  return Number.POSITIVE_INFINITY;
}

function renderInitialShows(shows) {
    const tbody = document.getElementById('shows-table-body');
    tbody.innerHTML = '';

    const limited = shows.slice(0, 100);
    for (const show of limited) {
        const tr = document.createElement('tr');
        tr.classList.add('paginated-show');
        tr.dataset.band = (show.bands || []).join('|||');

        tr.innerHTML = `
    <td>${(show.bands || []).join(', ') || '—'}</td>
    <td>${show.startDateUnix
                ? new Date(show.startDateUnix * 1000).toISOString().slice(0, 10)
                : show.startDate
                    ? (show.startDate.day && show.startDate.month && show.startDate.year)
                        ? `${show.startDate.year}-${String(show.startDate.month).padStart(2, '0')}-${String(show.startDate.day).padStart(2, '0')}`
                        : (show.startDate.month && show.startDate.year)
                            ? `${show.startDate.year}-${String(show.startDate.month).padStart(2, '0')}`
                            : show.startDate.year || '—'
                    : '—'
            }</td>
    <td>${show.location
                ? [show.location.city, show.location.state, show.location.country].filter(Boolean).join(', ') || '—'
                : '—'
            }</td>
    <td>${show.specs?.length ? formatTime(show.specs.length) : '—'}</td>
    <td>${show.specs?.media?.length
                ? `
                <div class="media-wrapper">
                    <span>${smartSize(show.specs.media[0].size)}${show.specs.media[0].unit}</span>
                    ${show.specs.media.length > 1
                    ? `<a href="#" class="toggle-media" data-target="media-${i}">▾ +${show.specs.media.length - 1}</a>`
                    : ''
                }
                </div>
                ${show.specs.media.length > 1
                    ? `<div id="media-${i}" class="extra-media">
                        ${show.specs.media.slice(1).map(m => `<div>${smartSize(m.size)}${m.unit}</div>`).join('')}
                    </div>`
                    : ''
                }
            `
                : '—'
            }</td>
    <td>${show.specs?.sourceDetail?.fileFormat || '—'}</td>
<td class="type-cell">
    ${show.specs?.sourceDetail?.recordingType || '—'}
    ${getTypeLabel(show.category)}
</td>

    <td class="type-cell">${show.source || '—'
            }
        ${show.fileSlug?.includes('show_1') ? '<span class="show-label">Show 1</span>' : ''
            }
        ${show.fileSlug?.includes('show_2') ? '<span class="show-label">Show 2</span>' : ''
            }
        ${show.master === true || (show.tapers?.length === 1 && show.tapers[0] === 'Vortex')
                ? '<span class="trade-label master">MASTER</span>'
                : ''
            }
    </td>
    <td class="type-cell">${show.tapers?.length
                ? `
                <div class="media-wrapper">
                    <span>${show.tapers[0]}</span>
                    ${show.tapers.length > 1
                    ? `<a href="#" class="toggle-media" data-target="tapers-${i}">▾ +${show.tapers.length - 1}</a>`
                    : ''
                }
                </div>
                ${show.tapers.length > 1
                    ? `<div id="tapers-${i}" class="extra-media">
                        ${show.tapers.slice(1).map(t => `<div>${t}</div>`).join('')}
                    </div>`
                    : ''
                }
            `
                : '—'
            }
        ${show.tradeLabel === 'RT'
                ? '<span class="trade-label red">RT</span>'
                : show.tradeLabel === 'NT'
                    ? '<span class="trade-label blue">NT</span>'
                    : ''
            }
    </td>
    <td>${show.images?.length
                ? `<span role="button" style="cursor: pointer; font-size: 18px;" onclick='openModal("${show.images[0].externalId}", ${JSON.stringify(show.images)})'>📷 ${show.images.length}</span>`
                : '—'
            }</td>
    <td><a href="${pathPrefix}/shows/${show.fileSlug}/" target="_blank" rel="noopener noreferrer" style="font-size: 1.20em;">🎫</a></td>
    <td>${show.tradeLabel === 'NT'
                ? `<button class="btn btn-sm btn-outline-secondary disabled" style="font-size: 0.75rem; padding: 2px 6px;" disabled title="Not available for trade" data-id="${show.fileSlug}">➕</button>`
                : `<button class="btn btn-sm btn-outline-success add-to-cart" style="font-size: 0.75rem; padding: 2px 6px;" data-id="${show.fileSlug}" data-json='${encodeURIComponent(JSON.stringify(show))}' title="Add to trade cart">➕</button>`
            }</td>
    ${environment === 'dev'
                ? `<td><button onclick="openJsonEditor('${show.fileSlug}', 'regular')" class="btn btn-sm btn-outline-secondary" style="font-size: 0.75rem; padding: 2px 6px;">✏️</button></td>`
                : ''
            }
`;

        tbody.appendChild(tr);
    }
}

function prepareTableRows(shows) {
    tableRows = shows.map((show, i) => {
        const tr = document.createElement('tr');
        tr.classList.add('paginated-show');
        tr.dataset.band = (show.bands || []).join('|||');

        tr.innerHTML = `
    <td>${(show.bands || []).join(', ') || '—'}</td>
    <td>${show.startDateUnix
                ? new Date(show.startDateUnix * 1000).toISOString().slice(0, 10)
                : show.startDate
                    ? (show.startDate.day && show.startDate.month && show.startDate.year)
                        ? `${show.startDate.year}-${String(show.startDate.month).padStart(2, '0')}-${String(show.startDate.day).padStart(2, '0')}`
                        : (show.startDate.month && show.startDate.year)
                            ? `${show.startDate.year}-${String(show.startDate.month).padStart(2, '0')}`
                            : show.startDate.year || '—'
                    : '—'
            }</td>
    <td>${show.location
                ? [show.location.city, show.location.state, show.location.country].filter(Boolean).join(', ') || '—'
                : '—'
            }</td>
    <td>${show.specs?.length ? formatTime(show.specs.length) : '—'}</td>
    <td>${show.specs?.media?.length
                ? `
                <div class="media-wrapper">
                    <span>${smartSize(show.specs.media[0].size)}${show.specs.media[0].unit}</span>
                    ${show.specs.media.length > 1
                    ? `<a href="#" class="toggle-media" data-target="media-${i}">▾ +${show.specs.media.length - 1}</a>`
                    : ''
                }
                </div>
                ${show.specs.media.length > 1
                    ? `<div id="media-${i}" class="extra-media">
                        ${show.specs.media.slice(1).map(m => `<div>${smartSize(m.size)}${m.unit}</div>`).join('')}
                    </div>`
                    : ''
                }
            `
                : '—'
            }</td>
    <td>${show.specs?.sourceDetail?.fileFormat || '—'}</td>
<td class="type-cell">
    ${show.specs?.sourceDetail?.recordingType || '—'}
    ${getTypeLabel(show.category)}
</td>

    <td class="type-cell">${show.source || '—'
            }
        ${show.fileSlug?.includes('show_1') ? '<span class="show-label">Show 1</span>' : ''
            }
        ${show.fileSlug?.includes('show_2') ? '<span class="show-label">Show 2</span>' : ''
            }
        ${show.master === true || (show.tapers?.length === 1 && show.tapers[0] === 'Vortex')
                ? '<span class="trade-label master">MASTER</span>'
                : ''
            }
    </td>
    <td class="type-cell">${show.tapers?.length
                ? `
                <div class="media-wrapper">
                    <span>${show.tapers[0]}</span>
                    ${show.tapers.length > 1
                    ? `<a href="#" class="toggle-media" data-target="tapers-${i}">▾ +${show.tapers.length - 1}</a>`
                    : ''
                }
                </div>
                ${show.tapers.length > 1
                    ? `<div id="tapers-${i}" class="extra-media">
                        ${show.tapers.slice(1).map(t => `<div>${t}</div>`).join('')}
                    </div>`
                    : ''
                }
            `
                : '—'
            }
        ${show.tradeLabel === 'RT'
                ? '<span class="trade-label red">RT</span>'
                : show.tradeLabel === 'NT'
                    ? '<span class="trade-label blue">NT</span>'
                    : ''
            }
    </td>
    <td>${show.images?.length
                ? `<span role="button" style="cursor: pointer; font-size: 18px;" onclick='openModal("${show.images[0].externalId}", ${JSON.stringify(show.images)})'>📷 ${show.images.length}</span>`
                : '—'
            }</td>
    <td><a href="${pathPrefix}/shows/${show.fileSlug}/" target="_blank" rel="noopener noreferrer" style="font-size: 1.20em;">🎫</a></td>
    <td>${show.tradeLabel === 'NT'
                ? `<button class="btn btn-sm btn-outline-secondary disabled" style="font-size: 0.75rem; padding: 2px 6px;" disabled title="Not available for trade" data-id="${show.fileSlug}">➕</button>`
                : `<button class="btn btn-sm btn-outline-success add-to-cart" style="font-size: 0.75rem; padding: 2px 6px;" data-id="${show.fileSlug}" data-json='${encodeURIComponent(JSON.stringify(show))}' title="Add to trade cart">➕</button>`
            }</td>
    ${environment === 'dev'
                ? `<td><button onclick="openJsonEditor('${show.fileSlug}', 'regular')" class="btn btn-sm btn-outline-secondary" style="font-size: 0.75rem; padding: 2px 6px;">✏️</button></td>`
                : ''
            }
`;

        return tr;
    });
}

const DB_NAME = "TradelistDB";
const DB_VERSION = 1;
const STORE_NAME = "shows";

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject("Error opening IndexedDB");
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

function getFromDB(key) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Error reading from IndexedDB");
        });
    });
}

function saveToDB(key, value) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject("Error writing to IndexedDB");
        });
    });
}

function insertGroupLabels(selectedBands) {
    const tbody = document.querySelector('#shows-table tbody');
    const rows = [...tbody.querySelectorAll('tr')];
    const visible = rows.filter(r => r.style.display !== 'none' && !r.hasAttribute('data-label'));

    rows.forEach(r => r.hasAttribute('data-label') && r.remove());

    if (!selectedBands || selectedBands.length !== 1) {
        let currentBand = null;
        for (const row of visible) {
            const band = row.dataset.band || '—';
            if (band !== currentBand) {
                currentBand = band;
                const label = document.createElement('tr');
                label.className = 'band-label-row';
                label.setAttribute('data-label', 'true');
                label.innerHTML = `<td colspan="13" class="band-label">🎸 ${band}</td>`;
                tbody.insertBefore(label, row);
            }
        }
        return;
    }

    const selectedBand = selectedBands[0];

    const CATEGORY_ORDER = {
        'video': 1,
        'video_misc': 2,
        'video_compilation': 3,
        'audio': 4,
        'audio_misc': 5
    };

    const emojiFor = {
        video: '🎥 Video',
        video_misc: '🎥 Misc',
        video_compilation: '🎥 Compilation',
        audio: '🔊 Audio',
        audio_misc: '🔊 Audio Misc',
        other: '❓ Other'
    };

    const groups = {};

    for (const row of visible) {
        const idBtn = row.querySelector('button[data-id]');
        if (!idBtn) continue;

        const fileSlug = idBtn.getAttribute('data-id');
        const show = window.allShowsData.find(s => s.fileSlug === fileSlug);
        if (!show) continue;

        if (!show.bands.includes(selectedBand)) continue;

        const catArr = show.category || [];
        let catKey = '';

        if (Array.isArray(catArr)) {
            const set = new Set(catArr);
            if (set.has('video') && set.size === 1) {
                catKey = 'video';
            } else if ((set.has('video') && set.has('misc')) || (set.has('misc') && set.size === 1)) {
                catKey = 'video_misc';
            } else if ((set.has('video') && set.has('compilation')) || (set.has('compilation') && set.size === 1)) {
                catKey = 'video_compilation';
            } else if (set.has('audio') && set.size === 1) {
                catKey = 'audio';
            } else if (set.has('audio') && set.has('misc')) {
                catKey = 'audio_misc';
            } else {
                catKey = 'other';
            }
        }

        let year = '—';
        if (show.startDateUnix) {
            year = new Date(show.startDateUnix * 1000).getFullYear().toString();
        } else if (show.startDate?.year) {
            year = show.startDate.year.toString();
        }

        if (!groups[catKey]) groups[catKey] = {};
        if (!groups[catKey][year]) groups[catKey][year] = [];
        groups[catKey][year].push(row);
    }

    const orderedKeys = Object.keys(CATEGORY_ORDER).concat('other').filter(k => groups[k]);

    for (const key of orderedKeys) {
        const catGroup = groups[key];
        if (!catGroup) continue;

        const catLabelRow = document.createElement('tr');
        catLabelRow.setAttribute('data-label', 'true');
        catLabelRow.className = 'category-label-row';
        catLabelRow.innerHTML = `<td colspan="13" class="category-label">${emojiFor[key]}</td>`;
        tbody.appendChild(catLabelRow);

        const sortedYears = Object.keys(catGroup).sort();

        for (const year of sortedYears) {
            const yearLabelRow = document.createElement('tr');
            yearLabelRow.setAttribute('data-label', 'true');
            yearLabelRow.className = 'year-label-row';
            yearLabelRow.innerHTML = `<td colspan="13" class="year-label">📅 ${year}</td>`;
            tbody.appendChild(yearLabelRow);

            for (const row of catGroup[year]) {
                tbody.appendChild(row);
            }
        }
    }
}

function renderShows(limit = 100) {
    const tbody = document.getElementById('shows-table-body');
    tbody.innerHTML = '';
    const limited = tableRows.slice(0, limit);
    for (const tr of limited) {
        tbody.appendChild(tr);
    }
}

function initializeShowFilters(shows) {
    let currentFilterLetter = 'all';
    let currentFilterBands = [];
    let currentPage = 1;
    const perPage = 100;

    const tbody = document.getElementById('shows-table-body');
    const showCountSpan = document.getElementById('show-count-number');
    const paginationControls = document.getElementById('pagination-controls');

    shows.sort((a, b) => {
      // Band A–Z
      const bandA = (a.bands && a.bands.length) ? a.bands[0].toLowerCase() : '';
      const bandB = (b.bands && b.bands.length) ? b.bands[0].toLowerCase() : '';
      if (bandA < bandB) return -1;
      if (bandA > bandB) return 1;
    
      // Date DESC (same logic you use elsewhere)
      const unixA = a.startDateUnix;
      const unixB = b.startDateUnix;
      if (typeof unixA === 'number' && typeof unixB === 'number') {
  if (!isSameDayUnix(unixA, unixB)) return unixB - unixA;   // DESC
} else if (typeof unixA === 'number' || typeof unixB === 'number') {
        return (typeof unixA === 'number') ? -1 : 1;
      } else {
        const sdA = a.startDate || {}, sdB = b.startDate || {};
        const yearA = parseInt(sdA.year, 10) || 0, yearB = parseInt(sdB.year, 10) || 0;
        if (yearB !== yearA) return yearB - yearA;
        const monthA = parseInt(sdA.month, 10) || 0, monthB = parseInt(sdB.month, 10) || 0;
        if (monthB !== monthA) return monthB - monthA;
        const dayA = parseInt(sdA.day, 10) || 0, dayB = parseInt(sdB.day, 10) || 0;
        if (dayB !== dayA) return dayB - dayA;
      }
    
      // TIE-BREAKER: Source number ASC (Source 1 → Source 14)
      // TIE-BREAKER 1: Show 1 → Show 2 → none
const shA = getShowNumber(a), shB = getShowNumber(b);
if (shA !== shB) return shA - shB;

// TIE-BREAKER 2: Source 1 → 2 → 3 → …
return getSourceNumber(a) - getSourceNumber(b);

    });

    function renderPage(filteredShows, page) {
        currentPage = page;
        tbody.innerHTML = '';

        const startIndex = (page - 1) * perPage;
        let showsForPage;
        if (currentFilterBands.length === 1) {
            showsForPage = filteredShows;
        } else {
            showsForPage = filteredShows.slice(startIndex, startIndex + perPage);
        }

        if (showsForPage.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" style="text-align: center;">No shows match your filters.</td></tr>';
            return;
        }

        tableRows = showsForPage.map((show, i) => {
            const tr = document.createElement('tr');
            tr.classList.add('paginated-show');
            tr.dataset.band = (show.bands || []).join('|||');
            tr.innerHTML = `
    <td>${(show.bands || []).join(', ') || '—'}</td>
    <td>${show.startDateUnix
                    ? new Date(show.startDateUnix * 1000).toISOString().slice(0, 10)
                    : show.startDate
                        ? (show.startDate.day && show.startDate.month && show.startDate.year)
                            ? `${show.startDate.year}-${String(show.startDate.month).padStart(2, '0')}-${String(show.startDate.day).padStart(2, '0')}`
                            : (show.startDate.month && show.startDate.year)
                                ? `${show.startDate.year}-${String(show.startDate.month).padStart(2, '0')}`
                                : show.startDate.year || '—'
                        : '—'
                }</td>
    <td>${show.location
                    ? [show.location.city, show.location.state, show.location.country].filter(Boolean).join(', ') || '—'
                    : '—'
                }</td>
    <td>${show.specs?.length ? formatTime(show.specs.length) : '—'}</td>
    <td>${show.specs?.media?.length
                    ? `
                <div class="media-wrapper">
                    <span>${smartSize(show.specs.media[0].size)}${show.specs.media[0].unit}</span>
                    ${show.specs.media.length > 1
                        ? `<a href="#" class="toggle-media" data-target="media-${i}">▾ +${show.specs.media.length - 1}</a>`
                        : ''
                    }
                </div>
                ${show.specs.media.length > 1
                        ? `<div id="media-${i}" class="extra-media">
                        ${show.specs.media.slice(1).map(m => `<div>${smartSize(m.size)}${m.unit}</div>`).join('')}
                    </div>`
                        : ''
                    }
            `
                    : '—'
                }</td>
    <td>${show.specs?.sourceDetail?.fileFormat || '—'}</td>
<td class="type-cell">
    ${show.specs?.sourceDetail?.recordingType || '—'}
    ${getTypeLabel(show.category)}
</td>

    <td class="type-cell">${show.source || '—'
                }
        ${show.fileSlug?.includes('show_1') ? '<span class="show-label">Show 1</span>' : ''
                }
        ${show.fileSlug?.includes('show_2') ? '<span class="show-label">Show 2</span>' : ''
                }
        ${show.master === true || (show.tapers?.length === 1 && show.tapers[0] === 'Vortex')
                    ? '<span class="trade-label master">MASTER</span>'
                    : ''
                }
    </td>
    <td class="type-cell">${show.tapers?.length
                    ? `
                <div class="media-wrapper">
                    <span>${show.tapers[0]}</span>
                    ${show.tapers.length > 1
                        ? `<a href="#" class="toggle-media" data-target="tapers-${i}">▾ +${show.tapers.length - 1}</a>`
                        : ''
                    }
                </div>
                ${show.tapers.length > 1
                        ? `<div id="tapers-${i}" class="extra-media">
                        ${show.tapers.slice(1).map(t => `<div>${t}</div>`).join('')}
                    </div>`
                        : ''
                    }
            `
                    : '—'
                }
        ${show.tradeLabel === 'RT'
                    ? '<span class="trade-label red">RT</span>'
                    : show.tradeLabel === 'NT'
                        ? '<span class="trade-label blue">NT</span>'
                        : ''
                }
    </td>
    <td>${show.images?.length
                    ? `<span role="button" style="cursor: pointer; font-size: 18px;" onclick='openModal("${show.images[0].externalId}", ${JSON.stringify(show.images)})'>📷 ${show.images.length}</span>`
                    : '—'
                }</td>
    <td><a href="${pathPrefix}/shows/${show.fileSlug}/" target="_blank" rel="noopener noreferrer" style="font-size: 1.20em;">🎫</a></td>
    <td>${show.tradeLabel === 'NT'
                    ? `<button class="btn btn-sm btn-outline-secondary disabled" style="font-size: 0.75rem; padding: 2px 6px;" disabled title="Not available for trade" data-id="${show.fileSlug}">➕</button>`
                    : `<button class="btn btn-sm btn-outline-success add-to-cart" style="font-size: 0.75rem; padding: 2px 6px;" data-id="${show.fileSlug}" data-json='${encodeURIComponent(JSON.stringify(show))}' title="Add to trade cart">➕</button>`
                }</td>
    ${environment === 'dev'
                    ? `<td><button onclick="openJsonEditor('${show.fileSlug}', 'regular')" class="btn btn-sm btn-outline-secondary" style="font-size: 0.75rem; padding: 2px 6px;">✏️</button></td>`
                    : ''
                }
`;

            return tr;
        });

        tableRows.forEach(tr => tbody.appendChild(tr));
        attachCartHandlers();
        insertGroupLabels();
    }

function renderPagination(totalItems, currentPage) {
    const totalPages = Math.ceil(totalItems / perPage);
    paginationControls.innerHTML = '';
    if (totalPages <= 1) return;

    let html = '<nav><ul class="pagination justify-content-center">';

    // Previous
    if (currentPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">←</a></li>`;
    }

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || i === totalPages || 
            (i >= currentPage - 2 && i <= currentPage + 2)
        ) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                     </li>`;
        } else if (
            i === 2 && currentPage > 4 || 
            i === totalPages - 1 && currentPage < totalPages - 3
        ) {
            html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
        }
    }

    // Next
    if (currentPage < totalPages) {
        html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">→</a></li>`;
    }

    html += '</ul></nav>';
    paginationControls.innerHTML = html;
}


function filterShows() {
  const lowerCaseBands = currentFilterBands.map(b => b.toLowerCase());

  let filtered = shows.filter(show => {
    if (!show.bands || show.bands.length === 0) return false;

    const firstLetter = (show.bands[0][0] || '').toUpperCase();
    const isNumeric = !/^[A-Z]/.test(firstLetter);
    const letterMatch =
      currentFilterLetter === 'all' ||
      (currentFilterLetter === '#' && isNumeric) ||
      firstLetter === currentFilterLetter;

    if (lowerCaseBands.length === 0) return letterMatch;

    const bandMatch = show.bands.some(b => lowerCaseBands.includes(b.toLowerCase()));
    return letterMatch && bandMatch;
  });

  // decide which mode we're in
  const pillMode = currentFilterLetter !== 'all' && currentFilterBands.length > 0;

  if (currentFilterLetter === 'all') {
    // ===== All → date DESC =====
    filtered.sort((a, b) => {
      const unixA = a.startDateUnix, unixB = b.startDateUnix;

      if (typeof unixA === 'number' && typeof unixB === 'number') {
        if (!isSameDayUnix(unixA, unixB)) return unixB - unixA; // DESC
      } else if (typeof unixA === 'number' || typeof unixB === 'number') {
        return (typeof unixA === 'number') ? -1 : 1;
      } else {
        const sdA = a.startDate || {}, sdB = b.startDate || {};
        const yearA = parseInt(sdA.year, 10) || 0, yearB = parseInt(sdB.year, 10) || 0;
        if (yearB !== yearA) return yearB - yearA;
        const monthA = parseInt(sdA.month, 10) || 0, monthB = parseInt(sdB.month, 10) || 0;
        if (monthB !== monthA) return monthB - monthA;
        const dayA = parseInt(sdA.day, 10) || 0, dayB = parseInt(sdB.day, 10) || 0;
        if (dayB !== dayA) return dayB - dayA;
      }

      // Band A–Z for stability on same day
      const bandA = (a.bands?.[0] || '').toLowerCase();
      const bandB = (b.bands?.[0] || '').toLowerCase();
      if (bandA < bandB) return -1;
      if (bandA > bandB) return 1;

      // Show → Source
      const shA = getShowNumber(a), shB = getShowNumber(b);
      if (shA !== shB) return shA - shB;
      return getSourceNumber(a) - getSourceNumber(b);
    });

  } else if (!pillMode) {
    // ===== Letter-only → band A–Z, then date DESC =====
    filtered.sort((a, b) => {
      const bandA = (a.bands?.[0] || '').toLowerCase();
      const bandB = (b.bands?.[0] || '').toLowerCase();
      if (bandA < bandB) return -1;
      if (bandA > bandB) return 1;

      const unixA = a.startDateUnix, unixB = b.startDateUnix;
      if (typeof unixA === 'number' && typeof unixB === 'number') {
        if (!isSameDayUnix(unixA, unixB)) return unixB - unixA; // DESC
      } else if (typeof unixA === 'number' || typeof unixB === 'number') {
        return (typeof unixA === 'number') ? -1 : 1;
      } else {
        const sdA = a.startDate || {}, sdB = b.startDate || {};
        const yearA = parseInt(sdA.year, 10) || 0, yearB = parseInt(sdB.year, 10) || 0;
        if (yearB !== yearA) return yearB - yearA;
        const monthA = parseInt(sdA.month, 10) || 0, monthB = parseInt(sdB.month, 10) || 0;
        if (monthB !== monthA) return monthB - monthA;
        const dayA = parseInt(sdA.day, 10) || 0, dayB = parseInt(sdB.day, 10) || 0;
        if (dayB !== dayA) return dayB - dayA;
      }

      const shA = getShowNumber(a), shB = getShowNumber(b);
      if (shA !== shB) return shA - shB;
      return getSourceNumber(a) - getSourceNumber(b);
    });

  } else {
    // ===== Pill(s) selected → band A–Z, then date ASC =====
    filtered.sort((a, b) => {
      const bandA = (a.bands?.[0] || '').toLowerCase();
      const bandB = (b.bands?.[0] || '').toLowerCase();
      if (bandA < bandB) return -1;
      if (bandA > bandB) return 1;

      const unixA = a.startDateUnix, unixB = b.startDateUnix;
      if (typeof unixA === 'number' && typeof unixB === 'number') {
        if (!isSameDayUnix(unixA, unixB)) return unixA - unixB; // ASC
      } else if (typeof unixA === 'number' || typeof unixB === 'number') {
        return (typeof unixA === 'number') ? 1 : -1; // ASC bias
      } else {
        const sdA = a.startDate || {}, sdB = b.startDate || {};
        const yearA = parseInt(sdA.year, 10) || 0, yearB = parseInt(sdB.year, 10) || 0;
        if (yearA !== yearB) return yearA - yearB;
        const monthA = parseInt(sdA.month, 10) || 0, monthB = parseInt(sdB.month, 10) || 0;
        if (monthA !== monthB) return monthA - monthB;
        const dayA = parseInt(sdA.day, 10) || 0, dayB = parseInt(sdB.day, 10) || 0;
        if (dayA !== dayB) return dayA - dayB;
      }

      const shA = getShowNumber(a), shB = getShowNumber(b);
      if (shA !== shB) return shA - shB;
      return getSourceNumber(a) - getSourceNumber(b);
    });
  }

  return filtered;
}


    function updateDisplay() {
        const filtered = filterShows();
        showCountSpan.textContent = filtered.length;

        if (currentFilterBands.length === 1) {
            renderPage(filtered, 1);
            paginationControls.innerHTML = '';
        } else {
            renderPage(filtered, 1);
            renderPagination(filtered.length, 1);
        }
        insertGroupLabels(currentFilterBands);
    }

    function buildLetterBar() {
        const letterBar = document.getElementById('letter-bar');
        const letters = new Set();
        shows.forEach(show => {
            const first = (show.bands?.[0]?.[0] || '').toUpperCase();
            if (first) letters.add(/^[A-Z]$/.test(first) ? first : '#');
        });

        const sorted = [...letters].sort();
        letterBar.innerHTML = `<ul class="nav nav-pills">
            <li class="nav-item"><a class="nav-link active" href="#" data-letter="all">All</a></li>
            ${sorted.map(l => `<li class="nav-item"><a class="nav-link" href="#" data-letter="${l}">${l}</a></li>`).join('')}
        </ul>`;

        letterBar.addEventListener('click', e => {
            if (e.target.tagName !== 'A') return;
            e.preventDefault();
            letterBar.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
            e.target.classList.add('active');
            currentFilterLetter = e.target.dataset.letter;

            currentFilterBands = [];
            document.querySelectorAll('.band-pill').forEach(p => {
                p.classList.remove('bg-primary', 'bg-secondary');
            });
            document.getElementById("grouping-hint").style.display = "none";

            buildBandPills();
            updateDisplay();

        });
    }

    function buildBandPills() {
        const container = document.getElementById('band-pills');

        if (currentFilterLetter === 'all') {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        const bands = new Set();
        shows.forEach(show => {
            const first = (show.bands?.[0]?.[0] || '').toUpperCase();
            const isNumeric = !/^[A-Z]$/.test(first);
            const letterMatch = (currentFilterLetter === '#' && isNumeric) || first === currentFilterLetter;
            if (letterMatch) show.bands.forEach(b => bands.add(b));
        });

        const sorted = [...bands].sort();
        if (sorted.length === 0) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        const hintBox = document.getElementById("grouping-hint");
        if (currentFilterBands.length > 1) {
            hintBox.textContent = "ℹ️ Grouping by category and year is only available when one band is selected.";
            hintBox.style.display = "block";
        } else {
            hintBox.style.display = "none";
        }
		
function getBandPillColor(count) {
	if (count < 2) return '#ffff';
    if (count < 5) return '#ffebf5';
    if (count < 10) return '#ffe2f1';
    if (count < 25) return '#ffdaed';
    if (count < 50) return '#ffd2e9';
    if (count < 100) return '#ffcae4';
    if (count < 150) return '#ffc2e0';
    if (count < 200) return '#ffbadc';
    if (count < 300) return '#ffb1d8';
    if (count < 500) return '#ffa9d4';
    if (count < 750) return '#ffa1d0';
    if (count < 1000) return '#ff99cc';
    return '#ff91c8';
}

const bandCounts = {};
shows.forEach(show => {
    const first = (show.bands?.[0]?.[0] || '').toUpperCase();
    const isNumeric = !/^[A-Z]$/.test(first);
    const letterMatch = (currentFilterLetter === '#' && isNumeric) || first === currentFilterLetter;
    if (letterMatch) {
        show.bands.forEach(b => {
            bandCounts[b] = (bandCounts[b] || 0) + 1;
        });
    }
});

const sortedBands = [...Object.keys(bandCounts)].sort();

container.innerHTML = sortedBands.map(b => {
    const count = bandCounts[b];
    const bg = getBandPillColor(count);

    return `<span class="band-pill" data-band="${b}" style="background-color: ${bg};">${b}</span>`;
}).join('');

        container.style.display = 'flex';

        container.querySelectorAll('.band-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                pill.classList.toggle('bg-primary');
                pill.classList.toggle('bg-secondary');

                currentFilterBands = [...document.querySelectorAll('.band-pill.bg-primary')].map(p => p.dataset.band);

                if (currentFilterBands.length > 1) {
                    hintBox.textContent = "ℹ️ Grouping by category and year is only available when one band is selected.";
                    hintBox.style.display = "block";
                } else {
                    hintBox.style.display = "none";
                }

                updateDisplay();
            });
        });
    }


    paginationControls.addEventListener('click', e => {
        if (e.target.tagName !== 'A') return;
        e.preventDefault();

        if (currentFilterBands.length === 1) {
            return;
        }

        const page = parseInt(e.target.dataset.page, 10);
        const filtered = filterShows();
        renderPage(filtered, page);
        renderPagination(filtered.length, page);
    });


    buildLetterBar();
    buildBandPills();
    updateDisplay();
}

function attachCartHandlers() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        const id = btn.dataset.id;

        function updateButton() {
            const cart = getCart();
            if (cart.some(s => s.fileSlug === id)) {
                btn.innerHTML = '❌';
                btn.classList.remove('btn-outline-success');
                btn.classList.add('btn-outline-danger');
            } else {
                btn.innerHTML = '➕';
                btn.classList.remove('btn-outline-danger');
                btn.classList.add('btn-outline-success');
            }
        }

        updateButton();

        btn.onclick = () => {
            const show = window.allShowsData.find(s => s.fileSlug === id);
            if (!show) return;

            const cart = getCart();
            const exists = cart.some(s => s.fileSlug === id);

            if (exists) {
                const newCart = cart.filter(s => s.fileSlug !== id);
                setCart(newCart);
            } else {
                addToCart(show);
            }

            updateButton();
            renderCartTable();
            updateCartCount();
        };
    });
}