document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener("click", function(e) {
        if (e.target.matches(".toggle-media")) {
            e.preventDefault();
           
            const targetId = e.target.dataset.target;
            const block = document.getElementById(targetId);
            if (!block) return;
           
            const isVisible = block.style.display === "block";
            block.style.display = isVisible ? "none" : "block";
           
            e.target.innerHTML = isVisible
                ? `▾ +${block.children.length}`
                : `▴`;
        }
    });
});