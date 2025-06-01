function toggleFeatInfo(el) {
    const popup = el.nextElementSibling;
    if (popup) {
        popup.style.display = popup.style.display === 'inline' ? 'none' : 'inline';
    }
}