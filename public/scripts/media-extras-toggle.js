document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.toggle-media');
    if (!trigger) return;

    e.preventDefault();

    const targetId = trigger.getAttribute('data-target');
    const panel = document.getElementById(targetId);
    if (!panel) return;

    const count = panel.children.length;

    let open;
    const hasInlineDisplay =
      panel.style && (panel.style.display === 'none' || panel.style.display === 'block');

    if (hasInlineDisplay) {
      const isVisible = panel.style.display === 'block';
      panel.style.display = isVisible ? 'none' : 'block';
      open = !isVisible;
    } else {
      panel.style.display = '';
      if (panel.classList.contains('extra-media')) {
        open = panel.classList.toggle('visible');
      } else {
        // fallback
        const isVisible = panel.style.display === 'block';
        panel.style.display = isVisible ? 'none' : 'block';
        open = !isVisible;
      }
    }

    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (trigger.classList.contains('count-badge')) {
      const m = trigger.textContent.match(/\d+/);
      if (m) trigger.textContent = `${open ? '−' : '+'}${m[0]}`;
    } else {
      trigger.textContent = open ? '▴' : `▾ +${count}`;
    }
  });
});