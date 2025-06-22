document.addEventListener('DOMContentLoaded', () => {
    // Select all notice headers that should be expandable
    const noticeHeaders = document.querySelectorAll('.parent-compilation-notice .notice-header');

    noticeHeaders.forEach(header => {
        const targetId = header.getAttribute('data-target');
        const content = document.getElementById(targetId);
        const toggleArrow = header.querySelector('.toggle-arrow'); // Get the arrow

        // Only make the header expandable if there is associated content AND an arrow
        // (The arrow presence indicates there's content to expand/collapse)
        if (content && toggleArrow) {
            header.style.cursor = 'pointer'; // Indicate it's clickable

            // Add the main click listener for the header
            header.addEventListener('click', () => {
                header.classList.toggle('expanded'); // Toggle the expanded class
                if (content.style.display === 'none' || content.style.display === '') {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });

            // Prevent expansion when the ticket icon is clicked
            const iconLink = header.querySelector('.notice-icon-link');
            if (iconLink) {
                iconLink.addEventListener('click', (event) => {
                    // Stop the click event from bubbling up to the notice-header.
                    // This is the key: it prevents the header's click listener from firing.
                    event.stopPropagation();
                    // The default action of the link (navigating to its href)
                    // will still occur as we are NOT calling event.preventDefault().
                });
            }
        }
    });
});