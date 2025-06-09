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
	btn.blur();

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
        alert('📩 Trade request sent!');
        renderCartTable();
        document.getElementById('cart-form').reset();
        updateCartCount();
    } else {
        alert('❌ Failed to send.');
    }
});

// Run once on page load
updateCartCount();
renderCartTable();