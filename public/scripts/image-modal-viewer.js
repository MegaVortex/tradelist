document.addEventListener('DOMContentLoaded', function() {
    var thumbs = document.querySelectorAll('.image-thumb');
    var modal = document.getElementById('imageModal');
    var modalIframe = document.getElementById('driveViewer');
    var captionText = document.getElementById('caption');
    var closeBtn = document.querySelector('#imageModal .close');
    var nextBtn = document.querySelector('#imageModal .next');
    var prevBtn = document.querySelector('#imageModal .prev');
    var currentIndex = 0;

    thumbs.forEach(function(thumb, idx) {
        thumb.addEventListener('click', function(e) {
            e.preventDefault();
            currentIndex = idx;
            var id = thumb.getAttribute('data-drive-id');
            modal.style.display = 'flex';
            modalIframe.src = 'https://drive.google.com/file/d/' + id + '/preview';
            captionText.textContent = thumb.querySelector('img').alt || '';
        });
    });

    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        modalIframe.src = '';
    });

    nextBtn.addEventListener('click', function() {
        currentIndex = (currentIndex + 1) % thumbs.length;
        thumbs[currentIndex].click();
    });

    prevBtn.addEventListener('click', function() {
        currentIndex = (currentIndex - 1 + thumbs.length) % thumbs.length;
        thumbs[currentIndex].click();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
            modalIframe.src = '';
        }
    });
});