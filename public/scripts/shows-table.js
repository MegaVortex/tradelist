  let currentImages = [];
  let currentIndex = 0;

  function openModal(id, images = []) {
      currentImages = images;
      currentIndex = images.findIndex(img => img.externalId === id);
      showImageAt(currentIndex);
      document.getElementById('imageModal').style.display = 'flex';
  }

  function showImageAt(index) {
      const img = currentImages[index];
      if (!img) return;

      const iframe = document.getElementById('modalImage');
      iframe.src = `https://drive.google.com/file/d/${img.externalId}/preview`;

      // Show/hide arrows
      document.getElementById('modalPrev').style.display = index > 0 ? 'block' : 'none';
      document.getElementById('modalNext').style.display = index < currentImages.length - 1 ? 'block' : 'none';
  }

  function closeModal() {
      document.getElementById('imageModal').style.display = 'none';
      document.getElementById('modalImage').src = '';
      currentImages = [];
      currentIndex = 0;
  }

  function nextImage() {
      if (currentIndex < currentImages.length - 1) {
          currentIndex++;
          showImageAt(currentIndex);
      }
  }

  function prevImage() {
      if (currentIndex > 0) {
          currentIndex--;
          showImageAt(currentIndex);
      }
  }

  function updateShowCount() {
      const allRows = [...document.querySelectorAll('#shows-table tbody tr')];
      const visibleShows = allRows.filter(row =>
          row.style.display !== 'none' &&
          !row.classList.contains('year-label-row') &&
          !row.classList.contains('band-label-row') &&
          !row.classList.contains('category-label-row')
      );
      document.getElementById('show-count').textContent = `Shows: ${visibleShows.length}`;
  }

  function insertGroupLabels() {
      const tbody = document.querySelector('#shows-table tbody');
      const rows = [...tbody.querySelectorAll('tr')];
      const visible = rows.filter(r => r.style.display !== 'none' && !r.hasAttribute('data-label'));

      // Remove existing label rows
      rows.forEach(r => r.hasAttribute('data-label') && r.remove());

      if (!selectedBand) {
          // Group by band (default)
          let currentBand = null;
          for (const row of visible) {
              const band = row.dataset.band || '—';
              if (band !== currentBand) {
                  currentBand = band;
                  const label = document.createElement('tr');
                  label.className = 'band-label-row';
                  label.setAttribute('data-label', 'true');
                  label.innerHTML = `<td colspan="12" class="band-label">🎸 ${band}</td>`;
                  tbody.insertBefore(label, row);
              }
          }
          return;
      }

      // When band is selected
      const CATEGORY_ORDER = {
          'video': 1,
          'video_misc': 2,
          'video_compilation': 3,
          'audio': 4,
          'audio_misc': 5
      };

      const groups = {}; // { 'video': { year: [rows] } }

      for (const row of visible) {
          const raw = row.dataset.json;
          if (!raw) continue;

          let show;
          try {
              show = JSON.parse(decodeURIComponent(raw));
          } catch (e) {
              continue;
          }

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

          const year = show.startDateUnix ?
              new Date(show.startDateUnix * 1000).getFullYear().toString() :
              '—';

          if (!groups[catKey]) groups[catKey] = {};
          if (!groups[catKey][year]) groups[catKey][year] = [];
          groups[catKey][year].push(row);
      }

      const emojiFor = {
          video: '🎥 Video',
          video_misc: '🎥 Misc',
          video_compilation: '🎥 Compilation',
          audio: '🔊 Audio',
          audio_misc: '🔊 Audio Misc',
          other: '❓ Other'
      };

      const orderedKeys = Object.keys(CATEGORY_ORDER)
          .concat('other')
          .filter(k => groups[k]);

      for (const key of orderedKeys) {
          const catGroup = groups[key];
          if (!catGroup) continue;

          const catLabelRow = document.createElement('tr');
          catLabelRow.setAttribute('data-label', 'true');
          catLabelRow.className = 'category-label-row';
          catLabelRow.innerHTML = `<td colspan="12" class="category-label">${emojiFor[key]}</td>`;
          tbody.appendChild(catLabelRow);

          const sortedYears = Object.keys(catGroup).sort((a, b) => a.localeCompare(b));

          for (const year of sortedYears) {
              const yearLabelRow = document.createElement('tr');
              yearLabelRow.setAttribute('data-label', 'true');
              yearLabelRow.className = 'year-label-row';
              yearLabelRow.innerHTML = `<td colspan="12" class="year-label">📅 ${year}</td>`;
              tbody.appendChild(yearLabelRow);

              for (const row of catGroup[year]) {
                  tbody.appendChild(row);
              }
          }
      }
  }

  document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
  });

  document.getElementById('modalNext').onclick = nextImage;
  document.getElementById('modalPrev').onclick = prevImage;
  document.addEventListener('DOMContentLoaded', () => {});
  document.addEventListener("click", function(e) {
      if (e.target.matches(".toggle-media")) {
          e.preventDefault();
          const targetId = e.target.dataset.target;
          const block = document.getElementById(targetId);
          if (!block) return;

          const isVisible = block.style.display === "block";
          block.style.display = isVisible ? "none" : "block";
          e.target.innerHTML = isVisible ?
              `▾ +${block.children.length}` :
              `▴`;
      }
  });