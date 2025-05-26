document.addEventListener('DOMContentLoaded', function() {
    var thumbs = document.querySelectorAll('.image-thumb');
    var modal = document.getElementById('imageModal');
    var modalIframe = document.getElementById('modalImage');
    var closeBtn = document.querySelector('#imageModal span');
    var nextBtn = document.getElementById('modalNext');
    var prevBtn = document.getElementById('modalPrev');
    var currentIndex = 0;

    thumbs.forEach(function(thumb, idx) {
        thumb.addEventListener('click', function(e) {
            e.preventDefault();
            currentIndex = idx;
            var id = thumb.getAttribute('data-drive-id');
            modal.style.display = 'flex';
            modalIframe.src = 'https://drive.google.com/file/d/' + id + '/preview';
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