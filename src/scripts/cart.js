const cartKey = 'vortexCart';

function getCart() {
    return JSON.parse(localStorage.getItem(cartKey) || '[]');
}

function setCart(cart) {
    localStorage.setItem(cartKey, JSON.stringify(cart));
}

function addToCart(show) {
    const cart = getCart();
    if (cart.length >= 5) {
        alert('You can only select up to 5 shows for a trade request.');
        return;
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

function formatDate(dateInput, dateObject) {
    if (!dateInput && !dateObject) return '—';

    if (typeof dateInput === 'number' && dateInput !== null) {
        const date = new Date(dateInput * 1000);
        if (isNaN(date.getTime())) return '—';
        return date.toISOString().split('T')[0];
    } else if (dateObject) {
        const year = parseInt(dateObject.year, 10) || 0;
        const month = parseInt(dateObject.month, 10) || 0;
        const day = parseInt(dateObject.day, 10) || 0;

        if (day && month && year) {
            return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
        } else if (month && year) {
            return `${String(month).padStart(2, '0')}.${year}`;
        } else if (year) {
            return `${year}`;
        }
    }
    return '—';
}

function renderCartTable() {
    const tbody = document.querySelector('#cart-table tbody');
    const cart = getCart();

    function formatTimeJs(seconds) {
        if (!seconds) return "—";
        const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${h}:${m}:${s}`;
    }

    function smartSizeJs(num) {
        if (typeof num !== "number") num = parseFloat(num);
        if (isNaN(num)) return "—";
        if (num >= 100) return String(Math.round(num));
        if (num < 10) return num.toFixed(2);
        return (Math.round(num * 10) / 10).toFixed(1);
    }


    tbody.innerHTML = cart.map((show, index) => {
        const formattedStartDate = (() => {
            if (typeof show.startDateUnix === 'number' && show.startDateUnix !== null) {
                const date = new Date(show.startDateUnix * 1000);
                return date.toISOString().split('T')[0];
            } else if (show.startDate) {
                const day = parseInt(show.startDate.day, 10) || 0;
                const month = parseInt(show.startDate.month, 10) || 0;
                const year = parseInt(show.startDate.year, 10) || 0;

                if (day && month && year) {
                    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
                } else if (month && year) {
                    return `${String(month).padStart(2, '0')}.${year}`;
                } else if (year) {
                    return `${year}`;
                }
            }
            return '—';
        })();

        const formattedLocation = (() => {
            if (show.location) {
                const parts = [];
                if (show.location.city && show.location.city.trim() !== '') parts.push(show.location.city.trim());
                if (show.location.state && show.location.state.trim() !== '') parts.push(show.location.state.trim());
                if (show.location.country && show.location.country.trim() !== '') parts.push(show.location.country.trim());
                return parts.length > 0 ? parts.join(', ') : '—';
            }
            return '—';
        })();

        const formattedArtists = (() => {
            if (show.bands && show.bands.length) {
                const firstBand = show.bands[0];
                let toggleHtml = '';
                let extraBandsHtml = '';

                const uniqueId = `bands-cart-${show.fileSlug}`;

                if (show.bands.length > 1) {
                    toggleHtml = `<a href="#" class="toggle-media" data-target="${uniqueId}">▾ +${show.bands.length - 1}</a>`;
                    extraBandsHtml = `
                        <div id="${uniqueId}" class="extra-media" style="display: none;">
                            ${show.bands.slice(1).map(band => `<div>${band}</div>`).join('')}
                        </div>
                    `;
                }
                return `
                    <div class="media-wrapper">
                        <span>${firstBand}</span>
                        ${toggleHtml}
                    </div>
                    ${extraBandsHtml}
                `;
            }
            return '—';
        })();

        let sourceCellContent = show.source || '—';
        if (show.fileSlug) {
            if (show.fileSlug.includes('show_1')) {
                sourceCellContent += `<span class="cart-cell-label-wrap"><span class="show-label">1</span></span>`;
            } else if (show.fileSlug.includes('show_2')) {
                sourceCellContent += `<span class="cart-cell-label-wrap"><span class="show-label">2</span></span>`;
            }
        }
        if (show.master === true || (show.tapers && show.tapers.length === 1 && show.tapers[0] === "Vortex")) {
            sourceCellContent += `<span class="cart-cell-label-wrap"><span class="trade-label master">M</span></span>`;
        }

        let tapersCellContent = show.tapers && show.tapers.length ? show.tapers.join(', ') : '—';
        if (show.tradeLabel === 'RT') {
            tapersCellContent += `<span class="cart-cell-label-wrap"><span class="trade-label red">RT</span></span>`;
        } else if (show.tradeLabel === 'NT') {
            tapersCellContent += `<span class="cart-cell-label-wrap"><span class="trade-label blue">NT</span></span>`;
        }

        return `
            <tr>
              <td>${formattedArtists}</td>
              <td>${formattedStartDate}</td>
              <td>${formattedLocation}</td>
              <td>${sourceCellContent}</td>
              <td>${tapersCellContent}</td>
              <td><button class="btn btn-sm btn-danger" style="font-size: 0.6rem; padding: 2px 6px;" onclick="removeFromCart('${show.fileSlug}')">✖</button></td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.add-to-cart').forEach(btn => {
        const fileSlug = btn.dataset.id;
        const exists = cart.some(s => s.fileSlug === fileSlug);
        if (exists) {
            btn.innerHTML = '❌';
            btn.classList.remove('btn-outline-success');
            btn.classList.add('btn-outline-danger');
        } else {
            btn.innerHTML = '➕';
            btn.classList.remove('btn-outline-danger');
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

document.addEventListener('DOMContentLoaded', () => {
    renderCartTable();
    updateCartCount();
});

document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', function () {
        const showData = decodeURIComponent(this.dataset.json);
        const show = JSON.parse(showData);
        const fileSlug = show.fileSlug;

        let cart = getCart();
        const exists = cart.some(s => s.fileSlug === fileSlug);

        if (!exists && cart.length >= 5) {
            alert('You can only select up to 5 shows for a trade request.');
            return;
        }

        if (exists) {
            cart = cart.filter(s => s.fileSlug !== fileSlug);
            btn.innerHTML = '➕';
            btn.classList.remove('btn-outline-danger');
            btn.classList.add('btn-outline-success');
        } else {
            cart.push(show);
            btn.innerHTML = '❌';
            btn.classList.remove('btn-outline-success');
            btn.classList.add('btn-outline-danger');
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid Email address.');
        return;
    }

    if (!cart.length) {
        alert('No shows selected. Please add at least one show to your cart.');
        return;
    }

    if (cart.length > 5) {
        alert('You have more than 5 shows in your cart. Please remove some.');
        return;
    }

    const urlsContent = cart.map(show => {
        const artist = show.bands && show.bands.length ? show.bands.join(', ') : '—';
        const date = formatDate(show.startDateUnix || show.startDate);
        const location = show.location && show.location.city ? show.location.city : '—';

        let source = show.source || '—';
        if (show.fileSlug) {
            if (show.fileSlug.includes('show_1')) {
                source += ' 1';
            } else if (show.fileSlug.includes('show_2')) {
                source += ' 2';
            }
        }
        if (show.master === true || (show.tapers && show.tapers.length === 1 && show.tapers[0] === "Vortex")) {
            source += ' M';
        }

        let tapers = show.tapers && show.tapers.length ? show.tapers.join(', ') : '—';
        if (show.tradeLabel) {
            tapers += ` ${show.tradeLabel}`;
        }

        const link = `https://megavortex.github.io/tradelist/shows/${show.fileSlug}/index.html`;

        return `${artist} | ${date} | ${location} | ${source} | ${tapers} | ${link}`;
    }).join('\n');


    const body = {
		access_key: "5031a4e3-3ff8-42ff-9a6d-1d0770b7690d",
        name: formData.get('name'),
        website: formData.get('website'),
        email: formData.get('email'),
        comments: formData.get('comments'),
        urls: urlsContent
    };

    const getformEndpoint = 'https://api.web3forms.com/submit';

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
            document.getElementById('cart-form').reset();
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

document.addEventListener('DOMContentLoaded', () => {
    renderCartTable();
    updateCartCount();
});