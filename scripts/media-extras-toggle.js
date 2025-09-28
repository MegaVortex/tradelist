// /scripts/media-extras-toggle.js
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.toggle-media');
    if (!trigger) return;

    e.preventDefault();

    const targetId = trigger.getAttribute('data-target');
    const panel = document.getElementById(targetId);
    if (!panel) return;

    const count = panel.children.length;

    // If panel currently has an inline display style, toggle inline (legacy path)
    // else use the class-based toggle.
    let open;
    const hasInlineDisplay =
      panel.style && (panel.style.display === 'none' || panel.style.display === 'block');

    if (hasInlineDisplay) {
      const isVisible = panel.style.display === 'block';
      panel.style.display = isVisible ? 'none' : 'block';
      open = !isVisible;
    } else {
      // Ensure base class approach works even if someone left an inline style before
      panel.style.display = ''; // clear any leftover inline so CSS can take over
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