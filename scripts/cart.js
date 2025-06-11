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

function renderCartTable() {
    const tbody = document.querySelector('#cart-table tbody');
    const cart = getCart();
    tbody.innerHTML = cart.map(show => `
    <tr>
      <td>${show.artist || '—'}</td>
      <td>${show.date || '—'}</td>
      <td>${show.location || '—'}</td>
      <td>${show.sourceHtml || '—'}</td>
      <td>${show.tapersHtml || '—'}</td>
      <td><button class="btn btn-sm btn-danger" style="font-size: 0.75rem; padding: 2px 6px;" onclick="removeFromCart('${show.fileSlug}')">✖</button></td>
    </tr>
  `).join('');
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        const id = btn.dataset.id;
        const isInCart = cart.some(s => s.fileSlug === id);

        if (isInCart) {
            btn.innerHTML = '❌';
            btn.classList.remove('btn-outline-success');
            btn.classList.add('btn-outline-danger');
        } else {
            btn.innerHTML = '➕';
            btn.classList.remove('btn-outline-danger');
            btn.classList.add('btn-outline-success');
        }

    });
}

function updateCartCount() {
    const cart = getCart();
    const countSpan = document.getElementById('cart-count');
    if (countSpan) countSpan.textContent = cart.length;
}

// ✅ Main event listener for Add/Remove toggle
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;

    const fileSlug = btn.dataset.id;
    const showRow = btn.closest('tr');
    const show = {
        fileSlug,
        artist: showRow.querySelector('td:nth-child(1)')?.innerText,
        date: showRow.querySelector('td:nth-child(2)')?.innerText,
        location: showRow.querySelector('td:nth-child(3)')?.innerText,
        sourceHtml: (() => {
            const base = showRow.querySelector('td:nth-child(8)');
            if (!base) return '—';
            let labelHtml = '';

            if (base.querySelector('.show-label')) {
                labelHtml += `<span class="show-label">${base.querySelector('.show-label').innerText}</span>`;
            }
            if (base.querySelector('.trade-label.master')) {
                labelHtml += `<span class="trade-label master">MASTER</span>`;
            }

            const baseText = base.childNodes[0]?.textContent?.trim() || '—';

            return `<div class="cart-cell-label-wrap">${baseText}${labelHtml}</div>`;
        })(),

        tapersHtml: (() => {
            const base = showRow.querySelector('td:nth-child(9)');
            if (!base) return '—';
            let labelHtml = '';

            if (base.querySelector('.trade-label.red')) {
                labelHtml += `<span class="trade-label red">RT</span>`;
            }
            if (base.querySelector('.trade-label.blue')) {
                labelHtml += `<span class="trade-label blue">NT</span>`;
            }

            const baseText = base.childNodes[0]?.textContent?.trim() || '—';

            return `<div class="cart-cell-label-wrap">${baseText}${labelHtml}</div>`;
        })()
    };

    let cart = getCart();
    const exists = cart.find(s => s.fileSlug === fileSlug);

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

document.getElementById('send-cart').addEventListener('click', async () => {
    const form = document.getElementById('cart-form');
    const formData = new FormData(form);
    const cart = getCart();

    // 1. Check if cart is empty
    if (!cart.length) {
        alert('Please add some shows to your cart before sending a request.');
        return;
    }

    // 2. Client-side validation for mandatory fields
    const name = formData.get('name')?.trim(); // Use optional chaining and trim
    const email = formData.get('email')?.trim();

    if (!name || name === '') {
        alert('Your Name is required.');
        document.getElementById('name').focus();
        return;
    }
    if (!email || email === '') {
        alert('Your Email is required.');
        document.getElementById('email').focus();
        return;
    }
    // Basic email format validation (optional, can be more robust)
    if (!/\S+@\S+\.\S+/.test(email)) {
        alert('Please enter a valid email address.');
        document.getElementById('email').focus();
        return;
    }

    // Disable the send button to prevent multiple submissions
    const sendButton = document.getElementById('send-cart');
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';

    const body = {
        name: name,
        website: formData.get('website')?.trim() || '', // Ensure website is trimmed, default to empty string
        email: email,
        comments: formData.get('comments')?.trim() || '', // Ensure comments are trimmed, default to empty string
        cart: cart
    };

    try {
        const res = await fetch('/send-cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            localStorage.removeItem(cartKey);
            alert('✅ Your trade request has been sent successfully!'); // More positive message
            renderCartTable();
            document.getElementById('cart-form').reset(); // Reset form fields
            updateCartCount();
            // Close the modal after successful submission
            // Ensure Bootstrap's JS is loaded and accessible (e.g., <script src=".../bootstrap.bundle.min.js"></script>)
            const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
            if (cartModal) cartModal.hide();
        } else {
            // Attempt to get more specific error from server
            const errorText = await res.text();
            alert(`❌ Failed to send trade request. Server responded with: ${res.status} - ${errorText || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error sending cart:', error);
        alert('❌ An error occurred while sending your request. Please try again.');
    } finally {
        sendButton.disabled = false; // Re-enable button
        sendButton.textContent = 'Send Trade Request'; // Restore button text
    }
});

// Run once on page load
updateCartCount();
renderCartTable();