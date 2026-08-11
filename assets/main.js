// ─── HELPERS ───
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SHIPPING_FREE_FROM = 60;
const SHIPPING_STANDARD = 8.90;

function chf(n) { return 'CHF ' + n.toFixed(2); }

// ─── MOBILE MENU ───
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  document.querySelectorAll('.mobile-link').forEach(l => {
    l.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ─── SCROLL REVEAL ───
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
setTimeout(() => {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => el.classList.add('visible'));
}, 2600);

// ─── COUNT-UP STATS ───
function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  if (isNaN(target)) return;
  if (prefersReducedMotion) { el.textContent = target; return; }

  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCount(e.target);
      countObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.6 });

document.querySelectorAll('.count-target').forEach(el => countObserver.observe(el));

// ─── CART STATE ───
// cart item: { id, name, price, img, meta, qty }
// id: 'small' | 'small:abo' | 'large' | 'large:abo'
let cart = JSON.parse(localStorage.getItem('of_cart') || '[]');

function saveCart() {
  localStorage.setItem('of_cart', JSON.stringify(cart));
}
function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}
function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}
function updateCartBadge() {
  const el = document.getElementById('cartCount');
  if (!el) return;
  el.textContent = getCartCount();
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 200);
}

function renderCart() {
  const itemsEl  = document.getElementById('cartItems');
  const emptyEl  = document.getElementById('cartEmpty');
  const footerEl = document.getElementById('cartFooter');
  const totalEl  = document.getElementById('cartTotal');
  const noteEl   = document.getElementById('cartShippingNote');
  const fillEl   = document.getElementById('freeShipFill');
  if (!itemsEl) return;

  Array.from(itemsEl.children).forEach(c => { if (c !== emptyEl) c.remove(); });

  if (cart.length === 0) {
    emptyEl.style.display = 'flex';
    footerEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  footerEl.style.display = 'block';

  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-line';
    div.dataset.id = item.id;
    div.innerHTML = `
      <div class="cart-line-thumb" style="background-image:url('${item.img}')"></div>
      <div>
        <div class="cart-line-name">${item.name}</div>
        <div class="cart-line-meta">${item.meta || ''}</div>
        <div class="cart-stepper">
          <button class="qty-minus" data-id="${item.id}" aria-label="Weniger">−</button>
          <span>${item.qty}</span>
          <button class="qty-plus" data-id="${item.id}" aria-label="Mehr">+</button>
        </div>
      </div>
      <div class="cart-line-sum">${chf(item.price * item.qty)}</div>
    `;
    itemsEl.appendChild(div);
  });

  const total = getCartTotal();
  totalEl.textContent = chf(total);

  if (total >= SHIPPING_FREE_FROM) {
    noteEl.innerHTML = '✓ Kostenlose Lieferung inklusive';
  } else {
    const diff = (SHIPPING_FREE_FROM - total).toFixed(2);
    noteEl.innerHTML = `Noch <strong>CHF ${diff}</strong> bis zur kostenlosen Lieferung.`;
  }
  if (fillEl) fillEl.style.width = Math.min(100, (total / SHIPPING_FREE_FROM) * 100) + '%';
}

const cartItemsEl = document.getElementById('cartItems');
if (cartItemsEl) {
  cartItemsEl.addEventListener('click', e => {
    const id = e.target.dataset.id;
    if (!id) return;
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (e.target.classList.contains('qty-plus')) {
      item.qty++;
    } else if (e.target.classList.contains('qty-minus')) {
      item.qty--;
      if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    }
    saveCart();
    updateCartBadge();
    renderCart();
  });
}

// ─── TOAST ───
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ─── CART DRAWER ───
function openCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (!drawer) return;
  drawer.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCart();
}
function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (!drawer) return;
  drawer.classList.remove('open');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

const cartToggle   = document.getElementById('cartToggle');
const cartClose    = document.getElementById('cartClose');
const cartOverlay  = document.getElementById('cartOverlay');
const cartContinue = document.getElementById('cartContinue');
const cartEmptyShop = document.getElementById('cartEmptyShop');

if (cartToggle)    cartToggle.addEventListener('click', openCart);
if (cartClose)     cartClose.addEventListener('click', closeCart);
if (cartOverlay)   cartOverlay.addEventListener('click', closeCart);
if (cartContinue)  cartContinue.addEventListener('click', closeCart);
if (cartEmptyShop) cartEmptyShop.addEventListener('click', closeCart);

function addToCart(id, name, price, img, isSub, qty) {
  qty = qty || 1;
  const finalId = isSub ? id + ':abo' : id;
  const finalPrice = isSub ? price * 0.9 : price;
  const meta = isSub ? 'Abo · −10 %' : 'Einmalig';
  const existing = cart.find(i => i.id === finalId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: finalId, name, price: finalPrice, img, meta, qty });
  }
  saveCart();
  updateCartBadge();
  renderCart();
  showToast(`${name} wurde hinzugefügt`);
  openCart();
}

// ─── SHOP PRODUCT CARDS: Abo-Umschalter + Warenkorb ───
document.querySelectorAll('.product-card').forEach(card => {
  const subBtns = card.querySelectorAll('.sub-btn');
  const noteEl  = card.querySelector('.sub-note');
  const unitId  = card.dataset.id;
  const isLarge = unitId === 'large';
  const notes = {
    '0': isLarge ? 'Einmalige Lieferung.' : 'Einmalige Lieferung.',
    '1': isLarge ? 'Lieferung alle 4 Monate. Jederzeit kündbar.' : 'Lieferung alle 3 Monate. Jederzeit kündbar.'
  };

  subBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      card.dataset.sub = btn.dataset.sub;
      if (noteEl) noteEl.textContent = notes[btn.dataset.sub];
    });
  });

  const addBtn = card.querySelector('.add-to-cart');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const isSub = card.dataset.sub === '1';
      addToCart(unitId, card.dataset.name, parseFloat(card.dataset.price), card.dataset.img, isSub);
    });
  }
});

// ─── STICKY BUY BAR ───
const stickyBar = document.getElementById('stickyBar');
const stickyAddBtn = document.getElementById('stickyAddBtn');
if (stickyAddBtn) {
  stickyAddBtn.addEventListener('click', () => {
    addToCart('small', 'Natives Olivenöl Extra · 500 ml', 15.00, 'assets/shop-500ml.webp', false);
  });
}

// ─── NEWSLETTER ───
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('newsletterEmail');
    const note = document.getElementById('newsletterNote');
    if (!input.value.includes('@')) {
      showToast('Bitte gültige E-Mail eingeben.');
      return;
    }
    note.textContent = 'Danke — wir melden uns zur nächsten Ernte.';
    note.style.color = 'var(--gold)';
    input.value = '';
  });
}

// ─── KONTAKTFORMULAR (kontakt.html) ───
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName  = document.getElementById('lastName').value.trim();
    const email     = document.getElementById('email').value.trim();
    const phone     = document.getElementById('phone').value.trim();
    const subjectEl = document.getElementById('subject');
    const message   = document.getElementById('message').value.trim();
    const status    = document.getElementById('formStatus');
    const submitBtn = contactForm.querySelector('button[type="submit"]');

    if (!firstName || !lastName || !email || !subjectEl.value || !message) {
      showToast('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }

    const subjectLabel = subjectEl.options[subjectEl.selectedIndex].text;

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Wird gesendet …'; }

    try {
      const res = await fetch('contact-handler.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone, subject: subjectLabel, message })
      });
      const result = await res.json();

      if (result.ok) {
        contactForm.reset();
        if (status) {
          status.textContent = 'Danke — Ihre Nachricht ist bei uns eingegangen. Wir melden uns bald.';
          status.style.color = 'var(--gold-dark)';
          status.style.display = 'block';
        }
      } else {
        throw new Error(result.error || 'unknown');
      }
    } catch (err) {
      if (status) {
        status.textContent = 'Senden fehlgeschlagen. Bitte kontaktieren Sie uns direkt per WhatsApp (078 811 16 39) oder info@kaleburcu.ch.';
        status.style.color = '#b0623c';
        status.style.display = 'block';
      }
      showToast('Senden fehlgeschlagen — bitte direkt anrufen/WhatsApp.');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Nachricht senden'; }
    }
  });
}

// ─── GENERIC OPTION TILES / ROWS (Produktdetailseite) ───
document.querySelectorAll('[data-option-group]').forEach(group => {
  const options = group.querySelectorAll('[data-option-value]');
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      group.dispatchEvent(new CustomEvent('optionchange', { detail: opt.dataset.optionValue }));
    });
  });
});

// ─── GENERIC QTY STEPPER (Produktdetailseite) ───
document.querySelectorAll('.qty-stepper[data-qty]').forEach(stepper => {
  const span = stepper.querySelector('span');
  const minus = stepper.querySelector('.qty-minus');
  const plus = stepper.querySelector('.qty-plus');
  let qty = 1;
  if (minus) minus.addEventListener('click', () => { qty = Math.max(1, qty - 1); span.textContent = qty; stepper.dispatchEvent(new CustomEvent('qtychange', { detail: qty })); });
  if (plus) plus.addEventListener('click', () => { qty++; span.textContent = qty; stepper.dispatchEvent(new CustomEvent('qtychange', { detail: qty })); });
});

// ─── SCROLL: Fortschrittsbalken, Parallax (5 Bilder), Kaufleiste ───
const progressFill = document.getElementById('progressBarFill');
const parallaxTargets = Array.from(document.querySelectorAll('#parallax1, #parallax2, #parallax3, #parallax4'))
  .map(img => ({ img, parent: img.closest('.hero-right, .familie-media, .imgband'), factor:
    img.id === 'parallax1' ? 0.08 : img.id === 'parallax2' ? 0.06 : img.id === 'parallax3' ? 0.1 : 0.08 }));

const shopSection = document.getElementById('produkte');
const siteFooter = document.querySelector('.site-footer');
const cartDrawerEl = document.getElementById('cartDrawer');

let scrollTicking = false;
function onScroll() {
  if (progressFill) {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    const pct = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
    progressFill.style.width = pct + '%';
  }

  if (!prefersReducedMotion) {
    parallaxTargets.forEach(({ img, parent, factor }) => {
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      img.style.transform = `translate3d(0, ${(-rect.top * factor).toFixed(1)}px, 0)`;
      img.style.willChange = 'transform';
    });
  }

  if (stickyBar && shopSection && siteFooter) {
    const shopBottom = shopSection.getBoundingClientRect().bottom;
    const footerTop = siteFooter.getBoundingClientRect().top;
    const cartOpen = cartDrawerEl && cartDrawerEl.classList.contains('open');
    const shouldShow = shopBottom < 60 && footerTop >= window.innerHeight - 80 && !cartOpen;
    stickyBar.classList.toggle('visible', shouldShow);
  }

  scrollTicking = false;
}

window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(onScroll);
    scrollTicking = true;
  }
}, { passive: true });

// ─── FILTERLEISTE (produkte.html) ───
const filterRow = document.querySelector('.filter-row');
if (filterRow) {
  const chips = filterRow.querySelectorAll('.filter-chip');
  const cards = document.querySelectorAll('[data-category]');
  const countEl = filterRow.querySelector('.filter-count');

  function applyFilter(filter) {
    let visible = 0;
    cards.forEach(card => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (countEl) countEl.textContent = visible + (visible === 1 ? ' Artikel' : ' Artikel');
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyFilter(chip.dataset.filter);
    });
  });

  applyFilter('all');
}

// ─── INIT ───
updateCartBadge();
onScroll();
