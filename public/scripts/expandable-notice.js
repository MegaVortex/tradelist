document.addEventListener('DOMContentLoaded', () => {
    const noticeHeaders = document.querySelectorAll('.parent-compilation-notice .notice-header');

    noticeHeaders.forEach(header => {
        const targetId = header.getAttribute('data-target');
        const content = document.getElementById(targetId);
        const toggleArrow = header.querySelector('.toggle-arrow');

        if (content && toggleArrow) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                header.classList.toggle('expanded');
                if (content.style.display === 'none' || content.style.display === '') {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });

            const iconLink = header.querySelector('.notice-icon-link');
            if (iconLink) {
                iconLink.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
            }
        }
    });
});