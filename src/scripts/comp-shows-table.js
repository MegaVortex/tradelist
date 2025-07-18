function insertGroupLabels() {
  const tbody = document.querySelector('#shows-table tbody');
  const rows = [...tbody.querySelectorAll('tr')];
  const visible = rows.filter(r => r.style.display !== 'none' && !r.hasAttribute('data-label'));

  // Remove previous labels
  rows.forEach(r => r.hasAttribute('data-label') && r.remove());

  if (!selectedBand) {
    // Default mode: group by band
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

  // Band selected mode — group by category + year
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

    let year;
    if (show.startDateUnix) {
      year = new Date(show.startDateUnix * 1000).getFullYear().toString();
    } else if (show.startDate && show.startDate.year) {
      year = show.startDate.year.toString();
    } else {
      year = '—';
    }

    if (!groups[catKey]) groups[catKey] = {};
    if (!groups[catKey][year]) groups[catKey][year] = [];
    groups[catKey][year].push(row);
  }

  const orderedKeys = Object.keys(CATEGORY_ORDER)
    .concat('other')
    .filter(k => groups[k]);

  for (const key of orderedKeys) {
    const catGroup = groups[key];
    if (!catGroup) continue;

    const catLabelRow = document.createElement('tr');
    catLabelRow.setAttribute('data-label', 'true');
    catLabelRow.className = 'category-label-row';
    catLabelRow.innerHTML = `<td colspan="13" class="category-label">${emojiFor[key]}</td>`;
    tbody.appendChild(catLabelRow);

    const sortedYears = Object.keys(catGroup).sort((a, b) => a.localeCompare(b));

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