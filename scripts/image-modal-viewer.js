let currentImages = [];
let currentIndex = 0;

function openModal(id, images = []) {
    currentImages = images;
    currentIndex = images.findIndex(img => img.externalId === id);
    showImageAt(currentIndex);
    const modal = document.getElementById('imageModal');
    if (modal) modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // ✅ Inject viewport tag ONLY when modal is shown
    if (!document.querySelector('meta[name="viewport"]')) {
        const meta = document.createElement('meta');
        meta.name = "viewport";
        meta.content = "width=device-width, initial-scale=1";
        document.head.appendChild(meta);
    }
}

function showImageAt(index) {
    const img = currentImages[index];
    if (!img) return;

    const iframe = document.getElementById('modalImage');
    if (iframe) iframe.src = `https://drive.google.com/file/d/${img.externalId}/preview`;

    const prevBtn = document.getElementById('modalPrev');
    const nextBtn = document.getElementById('modalNext');

    if (prevBtn) prevBtn.style.display = index > 0 ? 'block' : 'none';
    if (nextBtn) nextBtn.style.display = index < currentImages.length - 1 ? 'block' : 'none';

    const counter = document.getElementById('imageCounter');
    if (counter) counter.textContent = `${index + 1} / ${currentImages.length}`;
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    const iframe = document.getElementById('modalImage');
    if (modal) modal.style.display = 'none';
    if (iframe) iframe.src = '';
    currentImages = [];
    currentIndex = 0;

    // Remove the injected viewport tag
    const existing = document.querySelector('meta[name="viewport"]');
    if (existing) existing.remove();
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

document.addEventListener('DOMContentLoaded', () => {
    const nextBtn = document.getElementById('modalNext');
    const prevBtn = document.getElementById('modalPrev');
    const closeBtn = document.querySelector('#imageModal .close');

    if (nextBtn) nextBtn.onclick = nextImage;
    if (prevBtn) prevBtn.onclick = prevImage;
    if (closeBtn) closeBtn.onclick = closeModal;

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
    });

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

    const gestureArea = document.getElementById("gestureOverlay");
    if (gestureArea && typeof Hammer !== "undefined") {
        const hammer = new Hammer(gestureArea);

        hammer.get('swipe').set({
            direction: Hammer.DIRECTION_ALL
        });

        hammer.on("swipeleft", () => nextImage());
        hammer.on("swiperight", () => prevImage());
        hammer.on('swipeup', closeModal);
        hammer.on('swipedown', closeModal);
    }
});