const cartKey = 'vortexCart';

function getCart() {
    return JSON.parse(localStorage.getItem(cartKey) || '[]');
}

function setCart(cart) {
    localStorage.setItem(cartKey, JSON.stringify(cart));
}

function addToCart(show) {
    const cart = getCart();
    // NEW: Check if cart already has 5 items
    if (cart.length >= 5) {
        alert('You can only select up to 5 shows for a trade request.');
        return; // Prevent adding more
    }
    if (!cart.find(s => s.fileSlug === show.fileSlug)) {
        cart.push(show);
        setCart(cart);
    }
}

function removeFromCart(fileSlug) {
    const newCart = getCart().filter(s => s.fileSlug !== fileSlug);
    setCart(newCart);
    renderCartTable();
}

// Helper function to format date from Unix timestamp or object (remains unchanged)
function formatDate(dateInput) {
    if (!dateInput) return '—';

    // If dateInput is already a string (e.g., "1995-10-26"), return it directly
    if (typeof dateInput === 'string') {
        return dateInput;
    }

    if (typeof dateInput === 'number') { // Unix timestamp
        const date = new Date(dateInput * 1000); // Convert to milliseconds
        return date.toISOString().split('T')[0]; // Format asYYYY-MM-DD
    } else if (typeof dateInput === 'object') { // Date object { year, month, day }
        const { year, month, day } = dateInput;
        if (year && month && day) {
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else if (year && month) {
            return `${year}-${String(month).padStart(2, '0')}`;
        } else if (year) {
            return `${year}`;
        }
    }
    return '—';
}


function renderCartTable() {
    const tbody = document.querySelector('#cart-table tbody');
    const cart = getCart();
    tbody.innerHTML = cart.map(show => {
        // --- Generate content for the Source cell (including labels) ---
        let sourceCellContent = show.source || '—';
        if (show.fileSlug) {
            if (show.fileSlug.includes('show_1')) {
                sourceCellContent += `<span class="cart-cell-label-wrap"><span class="show-label">Show 1</span></span>`;
            } else if (show.fileSlug.includes('show_2')) {
                sourceCellContent += `<span class="cart-cell-label-wrap"><span class="show-label">Show 2</span></span>`;
            }
        }
        if (show.master === true || (show.tapers && show.tapers.length === 1 && show.tapers[0] === "Vortex")) {
            sourceCellContent += `<span class="cart-cell-label-wrap"><span class="trade-label master">MASTER</span></span>`;
        }

        // --- Generate content for the Tapers cell (including labels) ---
        let tapersCellContent = show.tapers && show.tapers.length ? show.tapers.join(', ') : '—';
        // Simplified tapers display for cart (no toggle for multiple tapers in cart summary)

        if (show.tradeLabel === 'RT') {
            tapersCellContent += `<span class="cart-cell-label-wrap"><span class="trade-label red">RT</span></span>`;
        } else if (show.tradeLabel === 'NT') {
            tapersCellContent += `<span class="cart-cell-label-wrap"><span class="trade-label blue">NT</span></span>`;
        }

        return `
            <tr>
              <td>${show.bands && show.bands.length ? show.bands.join(', ') : '—'}</td>
              <td>${formatDate(show.startDateUnix || show.startDate)}</td>
              <td>${show.location && show.location.city ? show.location.city : '—'}</td>
              <td>${sourceCellContent}</td>
              <td>${tapersCellContent}</td>
              <td><button class="btn btn-sm btn-danger" style="font-size: 0.75rem; padding: 2px 6px;" onclick="removeFromCart('${show.fileSlug}')">✖</button></td>
            </tr>
        `;
    }).join('');
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        const fileSlug = btn.dataset.id;
        const exists = cart.some(s => s.fileSlug === fileSlug);
        if (exists) {
            btn.innerHTML = '❌';
            btn.classList.remove('btn-outline-success');
            btn.classList.add('btn-outline-danger'); // Corrected class
        } else {
            btn.innerHTML = '➕';
            btn.classList.remove('btn-outline-danger'); // Corrected class
            btn.classList.add('btn-outline-success');
        }
    });

    updateCartCount();
}


function updateCartCount() {
    const cart = getCart();
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = cart.length;
    }
}

// Initial render when the page loads
document.addEventListener('DOMContentLoaded', () => {
    renderCartTable();
    updateCartCount();
});


document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', function() {
        const showData = decodeURIComponent(this.dataset.json);
        const show = JSON.parse(showData);
        const fileSlug = show.fileSlug;

        let cart = getCart();
        const exists = cart.some(s => s.fileSlug === fileSlug);

        // NEW: Check if cart already has 5 items BEFORE adding a new one
        if (!exists && cart.length >= 5) {
            alert('You can only select up to 5 shows for a trade request.');
            return; // Stop execution if limit reached
        }

        if (exists) {
            cart = cart.filter(s => s.fileSlug !== fileSlug);
            btn.innerHTML = '➕';
            btn.classList.remove('btn-outline-danger'); // Corrected class
            btn.classList.add('btn-outline-success');
        } else {
            cart.push(show);
            btn.innerHTML = '❌';
            btn.classList.remove('btn-outline-success');
            btn.classList.add('btn-outline-danger'); // Corrected class
        }

        setCart(cart);
        updateCartCount();
        renderCartTable();
    });
});

// ✅ THIS IS THE UPDATED BLOCK FOR SENDING CART - NOW GENERATES PLAIN TEXT URLS
document.getElementById('send-cart').addEventListener('click', async () => {
    const form = document.getElementById('cart-form');
    const formData = new FormData(form);
    const cart = getCart();

    // Mandatory Field Validation (re-added as frontend check)
    const name = formData.get('name');
    const email = formData.get('email');
	const website = formData.get('website');

    if (!name || name.trim() === '') {
        alert('Please enter your Name.');
        return;
    }
    if (!email || email.trim() === '') {
        alert('Please enter your Email.');
        return;
    }
    if (!website || website.trim() === '') {
        alert('Please enter your Website.');
        return;
    }
    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid Email address.');
        return;
    }

    // Cart validation
    if (!cart.length) {
        alert('No shows selected. Please add at least one show to your cart.');
        return;
    }
    // New: Check for max shows on submission (redundant if addToCart works, but good safeguard)
    if (cart.length > 5) {
        alert('You have more than 5 shows in your cart. Please remove some.');
        return;
    }

    // --- Start: Generate the PLAIN TEXT urls string here ---
    const urlsContent = cart.map(show => {
        // --- Format Artist (plain text) ---
        const artist = show.bands && show.bands.length ? show.bands.join(', ') : '—';

        // --- Format Date (plain text) ---
        const date = formatDate(show.startDateUnix || show.startDate);

        // --- Format Location (plain text) ---
        const location = show.location && show.location.city ? show.location.city : '—';

        // --- Format Source (plain text) ---
        let source = show.source || '—';
        if (show.fileSlug) { // Add "Show 1/2" if relevant
            if (show.fileSlug.includes('show_1')) {
                source += ' Show 1';
            } else if (show.fileSlug.includes('show_2')) {
                source += ' Show 2';
            }
        }
        if (show.master === true || (show.tapers && show.tapers.length === 1 && show.tapers[0] === "Vortex")) { // Add "MASTER" if relevant
            source += ' MASTER';
        }

        // --- Format Tapers (plain text) ---
        let tapers = show.tapers && show.tapers.length ? show.tapers.join(', ') : '—';
        if (show.tradeLabel) { // Add trade label (RT/NT) if relevant
            tapers += ` ${show.tradeLabel}`;
        }

        // --- Construct the plain text link ---
        // IMPORTANT: Adjust this base URL if your site is in a subdirectory on GitHub Pages
        const link = `https://megavortex.github.io/tradelist/shows/${show.fileSlug}/index.html`;

        // Combine all parts into a single plain text line
        return `${artist} | ${date} | ${location} | ${source} | ${tapers} | ${link}`;
    }).join('\n'); // Join each show line with a newline character
    // --- End: Generate the PLAIN TEXT urls string ---


    const body = {
        name: formData.get('name'),
        website: formData.get('website'),
        email: formData.get('email'),
        comments: formData.get('comments'),
        urls: urlsContent
    };

    const getformEndpoint = 'https://getform.io/f/allzgkra'; // Your Getform endpoint

    try {
        const res = await fetch(getformEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            localStorage.removeItem(cartKey);
            alert('📩 Trade request sent successfully! The cart has been cleared.');
            document.getElementById('cart-form').reset(); // Clear form fields
            renderCartTable();
            updateCartCount();
            const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
            if (cartModal) {
                cartModal.hide();
            }
        } else {
            const errorData = await res.json();
            console.error("Getform Error:", res.status, errorData);
            alert(`❌ Failed to send trade request: ${errorData.message || res.statusText}. Check console for details.`);
        }
    } catch (err) {
        console.error("Network or Fetch Error:", err);
        alert('An unexpected error occurred while sending the request. Please check your internet connection.');
    }
});

// Run once on page load (remain unchanged)
document.addEventListener('DOMContentLoaded', () => {
    renderCartTable();
    updateCartCount();
});