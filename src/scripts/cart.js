const cartKey = 'vortexCart';

function getCart() {
    return JSON.parse(localStorage.getItem(cartKey) || '[]');
}

function setCart(cart) {
    localStorage.setItem(cartKey, JSON.stringify(cart));
}

function addToCart(show) {
    const cart = getCart();
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

// Helper function to format date from Unix timestamp or object
function formatDate(dateInput) {
    if (!dateInput) return '—';

    if (typeof dateInput === 'number') { // Unix timestamp
        const date = new Date(dateInput * 1000); // Convert to milliseconds
        return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
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
    tbody.innerHTML = cart.map(show => `
    <tr>
      <td>${show.bands && show.bands.length ? show.bands.join(', ') : '—'}</td>
      <td>${formatDate(show.startDateUnix || show.startDate)}</td>
      <td>${show.location && show.location.city ? show.location.city : '—'}</td>
      <td>${show.source || '—'}</td>
      <td>${show.tapers && show.tapers.length ? show.tapers.join(', ') : '—'}</td>
      <td><button class="btn btn-sm btn-danger" style="font-size: 0.75rem; padding: 2px 6px;" onclick="removeFromCart('${show.fileSlug}')">✖</button></td>
    </tr>
  `).join('');
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        const fileSlug = btn.dataset.id;
        const exists = cart.some(s => s.fileSlug === fileSlug);
        if (exists) {
            btn.innerHTML = '❌';
            btn.classList.remove('btn-outline-success');
            btn.classList.add('btn-outline-secondary');
        } else {
            btn.innerHTML = '➕';
            btn.classList.remove('btn-outline-secondary');
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

        if (exists) {
            cart = cart.filter(s => s.fileSlug !== fileSlug);
            btn.innerHTML = '➕';
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-outline-success');
        } else {
            cart.push(show);
            btn.innerHTML = '❌';
            btn.classList.remove('btn-outline-success');
            btn.classList.add('btn-outline-secondary');
        }

        setCart(cart);
        updateCartCount();
        renderCartTable();
    });
});

document.getElementById('send-cart').addEventListener('click', async () => {
    const form = document.getElementById('cart-form');
    const formData = new FormData(form);
    const cart = getCart();
    if (!cart.length) return alert('No shows selected.');

    const body = {
        name: formData.get('name'),
        website: formData.get('website'),
        email: formData.get('email'),
        comments: formData.get('comments'),
        cart
    };

    const res = await fetch('/send-cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (res.ok) {
        localStorage.removeItem(cartKey);
        alert('📩 Trade request sent successfully! The cart has been cleared.');
        renderCartTable(); // Clear the table and update button states
        updateCartCount();
        const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
        if (cartModal) {
            cartModal.hide();
        }
    } else {
        alert('Failed to send trade request.');
    }
});