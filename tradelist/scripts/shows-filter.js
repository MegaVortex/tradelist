  let currentLetter = 'all';
  let tableRows = [];

  function updateShowCount() {
      const allRows = [...document.querySelectorAll('#shows-table tbody tr')];

      allRows.forEach((row, i) => {
          const label = row.hasAttribute('data-label') ? '[LABEL]' : '[SHOW]';
          const visible = row.style.display !== 'none';
          const classes = row.className;
          console.log(`${i}: ${label} visible=${visible} class=${classes}`);
      });

      const visibleShows = allRows.filter(row =>
          row.style.display !== 'none' &&
          !row.hasAttribute('data-label')
      );
      document.getElementById('show-count').textContent = `Shows: ${visibleShows.length}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
      window.selectedBand = null;
      const tbody = document.querySelector('#shows-table tbody');
      tableRows = [...tbody.querySelectorAll('tr')];

      // Filter only data rows (not label rows)
      const showRows = tableRows.filter(r => !r.hasAttribute('data-label'));

      // Sort by band, then date
      showRows.sort((a, b) => {
          const bandA = (a.dataset.band || '').toLowerCase();
          const bandB = (b.dataset.band || '').toLowerCase();
          if (bandA < bandB) return -1;
          if (bandA > bandB) return 1;

          const dateA = a.querySelector('td:nth-child(2)')?.innerText || '';
          const dateB = b.querySelector('td:nth-child(2)')?.innerText || '';
          return dateA.localeCompare(dateB);
      });

      // Re-append sorted rows to DOM
      showRows.forEach(row => tbody.appendChild(row));

      tableRows.sort((a, b) => {
          const bandA = (a.dataset.band || '').toLowerCase();
          const bandB = (b.dataset.band || '').toLowerCase();
          if (bandA < bandB) return -1;
          if (bandA > bandB) return 1;

          const dateA = a.querySelector('td:nth-child(2)')?.innerText || '';
          const dateB = b.querySelector('td:nth-child(2)')?.innerText || '';
          return dateA.localeCompare(dateB);
      });
      const letterBar = document.getElementById('letter-bar');
      const dropdownWrapper = document.getElementById("band-dropdown-wrapper");
      const dropdown = document.getElementById("band-dropdown");

      // --- Build letter filter ---
      const letters = new Set();
      tableRows.forEach(row => {
          const band = row.dataset.band || '';
          const first = band[0]?.toUpperCase();
          if (first) letters.add(/^[A-Z]$/.test(first) ? first : '#');
      });

      const sorted = Array.from(letters).sort();
      const barHTML = ['<strong>Filter:</strong> <a href="#" data-letter="all">ALL</a>']
          .concat(sorted.map(l => `<a href="#" data-letter="${l}">${l}</a>`))
          .join(' | ');
      letterBar.innerHTML = barHTML;

      // --- Letter click filter ---
      letterBar.addEventListener('click', e => {
          if (e.target.tagName !== 'A') return;
          e.preventDefault();
          window.selectedBand = null;
          const selected = e.target.dataset.letter;
          currentLetter = selected;
          updateDropdown(selected);
          dropdown.selectedIndex = 0;

          // Filter rows by letter
          tableRows.forEach(row => {
              const band = row.dataset.band || '';
              const first = band[0]?.toUpperCase();
              const isNumber = !/^[A-Z]/.test(first);
              const match = selected === 'all' ||
                  (selected === '#' && isNumber) ||
                  (first === selected);
              row.style.display = match ? '' : 'none';
          });
          const tbody = document.querySelector('#shows-table tbody');
          tableRows = [...tbody.querySelectorAll('tr')];

          // Filter only data rows (not label rows)
          const showRows = tableRows.filter(r => !r.hasAttribute('data-label'));

          // Sort by band, then date
          showRows.sort((a, b) => {
              const bandA = (a.dataset.band || '').toLowerCase();
              const bandB = (b.dataset.band || '').toLowerCase();
              if (bandA < bandB) return -1;
              if (bandA > bandB) return 1;

              const dateA = a.querySelector('td:nth-child(2)')?.innerText || '';
              const dateB = b.querySelector('td:nth-child(2)')?.innerText || '';
              return dateA.localeCompare(dateB);
          });

          // Re-append sorted rows to DOM
          showRows.forEach(row => tbody.appendChild(row));

          updateShowCount();
          insertGroupLabels();
      });

      // --- Band dropdown logic ---
      function updateDropdown(letter) {
          const bandMap = new Map();
          tableRows.forEach(row => {
              const band = row.dataset.band || '';
              const first = band[0]?.toUpperCase();
              const cell = row.querySelector('td');
              const display = cell ? cell.innerText.trim() : '';

              if (
                  (letter === 'all') ||
                  (letter === '#' && !/^[A-Z]/.test(first)) ||
                  (first === letter)
              ) {
                  if (band && display) bandMap.set(band, display);
              }
          });

          const sortedBands = Array.from(bandMap.entries()).sort((a, b) =>
              a[1].localeCompare(b[1])
          );

          dropdown.innerHTML =
              `<option value="" disabled selected>— Select band —</option>` +
              sortedBands.map(([key, label]) =>
                  `<option value="${label}">${label}</option>`
              ).join('');

          dropdownWrapper.style.display = sortedBands.length ? 'block' : 'none';
      }

      dropdown.addEventListener("change", () => {
          const selectedBand = dropdown.value;
          if (!selectedBand) return;
          window.selectedBand = selectedBand;

          tableRows.forEach(row => {
              const band = row.dataset.band || '';
              const first = band[0]?.toUpperCase();
              const isNumber = !/^[A-Z]/.test(first);
              const matchLetter =
                  currentLetter === 'all' ||
                  (currentLetter === '#' && isNumber) ||
                  first === currentLetter;
              const matchBand = band.toLowerCase() === selectedBand.toLowerCase();
              row.style.display = matchLetter && matchBand ? '' : 'none';
          });

          updateShowCount();
          insertGroupLabels();
      });
      updateShowCount();
      insertGroupLabels();
  });