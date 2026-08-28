let currentImages = [];
let currentIndex = 0;

function openModal(id, images = []) {
    currentImages = images;
    currentIndex = images.findIndex(img => img.externalId === id);
    showImageAt(currentIndex);
    const modal = document.getElementById('imageModal');
    if (modal) modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    if (!document.querySelector('meta[name="viewport"]')) {
        const meta = document.createElement('meta');
        meta.name = "viewport";
        meta.content = "width=device-width, initial-scale=1";
        document.head.appendChild(meta);
    }
}

function showImageAt(index) {
    const imgData = currentImages[index];
    if (!imgData) return;

    const modalImg = document.getElementById('modalImage');
    const modalInner = document.querySelector('#imageModal .modal-inner');
    if (!modalImg || !modalInner) return;

    modalImg.style.visibility = 'hidden';
    modalImg.onload = () => {
        modalInner.style.width = modalImg.naturalWidth + 'px';
        modalInner.style.height = modalImg.naturalHeight + 'px';
        modalImg.style.visibility = 'visible';
    };

    modalImg.src = `https://lh3.googleusercontent.com/d/${imgData.externalId}`;

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

    const existing = document.querySelector('meta[name="viewport"]');
    if (existing) existing.remove();

    const url = new URL(window.location.href);
    if (window.innerWidth <= 768) {
        window.location.href = url.toString();
    } else {
        history.replaceState({}, '', url.toString());
        document.body.style.overflow = '';
    }
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