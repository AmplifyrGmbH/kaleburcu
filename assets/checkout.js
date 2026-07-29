// ─── CHECKOUT PAGE (kasse.html) ───
// Relies on `cart`, `saveCart()`, `getCartTotal()`, `updateCartBadge()`, `showToast()`, `chf()` from main.js

function getShippingMethod() {
  const el = document.querySelector('input[name="shipping"]:checked');
  return el ? el.value : 'b-post';
}

function computeShipping(subtotal) {
  const method = getShippingMethod();
  if (method === 'abholung') return 0;
  if (method === 'a-post') return 12.90;
  return subtotal >= 60 ? 0 : 8.90;
}

function renderCheckout() {
  const itemsEl    = document.getElementById('checkoutItems');
  const emptyEl    = document.getElementById('checkoutEmpty');
  const footerEl   = document.getElementById('checkoutFooter');
  const subtotalEl = document.getElementById('checkoutSubtotal');
  const shippingEl = document.getElementById('checkoutShipping');
  const mwstEl     = document.getElementById('checkoutMwst');
  const totalEl    = document.getElementById('checkoutTotal');
  const submitBtn  = document.getElementById('checkoutSubmit');
  const fillEl     = document.getElementById('freeShipFillCheckout');

  if (!itemsEl) return;

  if (!cart.length) {
    itemsEl.innerHTML = '';
    emptyEl.style.display = 'block';
    footerEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  footerEl.style.display = 'block';

  itemsEl.innerHTML = cart.map(item => `
    <div class="summary-line">
      <div class="summary-line-thumb" style="background-image:url('${item.img}')"></div>
      <div>
        <div class="summary-line-name">${item.name}</div>
        <div class="summary-line-meta">${item.qty} × ${item.meta || ''}</div>
      </div>
      <div class="summary-line-sum">${chf(item.price * item.qty)}</div>
    </div>
  `).join('');

  const subtotal = getCartTotal();
  const shipping = computeShipping(subtotal);
  const total = subtotal + shipping;
  const mwst = total - total / 1.026;

  subtotalEl.textContent = chf(subtotal);
  shippingEl.textContent = shipping === 0 ? 'Kostenlos' : chf(shipping);
  mwstEl.textContent = chf(mwst);
  totalEl.textContent = chf(total);
  if (fillEl) fillEl.style.width = Math.min(100, (subtotal / 60) * 100) + '%';

  if (submitBtn) {
    submitBtn.dataset.total = total.toFixed(2);
    submitBtn.textContent = `Bestellung abschliessen · ${chf(total)}`;
  }
}

document.querySelectorAll('input[name="shipping"]').forEach(input => {
  input.addEventListener('change', () => {
    document.querySelectorAll('#panel2 .option-row').forEach(row => row.classList.remove('active'));
    input.closest('.option-row').classList.add('active');
    renderCheckout();
  });
});
document.querySelectorAll('input[name="payment"]').forEach(input => {
  input.addEventListener('change', () => {
    document.querySelectorAll('#panel3 .option-row').forEach(row => row.classList.remove('active'));
    input.closest('.option-row').classList.add('active');
  });
});

// ─── SCHRITT-NAVIGATION ───
const steps = ['panel1', 'panel2', 'panel3'];
const stepInds = ['stepInd1', 'stepInd2', 'stepInd3'];

function goToStep(n) {
  steps.forEach((id, i) => {
    document.getElementById(id).classList.toggle('active', i === n - 1);
  });
  stepInds.forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
    if (i < n - 1) el.classList.add('done');
    if (i === n - 1) el.classList.add('active');
  });
  window.scrollTo({ top: document.getElementById('checkoutFormWrap').offsetTop - 130, behavior: 'smooth' });
}

const toStep2 = document.getElementById('toStep2');
if (toStep2) toStep2.addEventListener('click', () => {
  const email = document.getElementById('coEmail').value.trim();
  const firstName = document.getElementById('coFirstName').value.trim();
  const lastName = document.getElementById('coLastName').value.trim();
  const street = document.getElementById('coStreet').value.trim();
  const plz = document.getElementById('coPlz').value.trim();
  const phone = document.getElementById('coPhone').value.trim();
  if (!email || !firstName || !lastName || !street || !plz || !phone) {
    showToast('Bitte alle Pflichtfelder ausfüllen.');
    return;
  }
  goToStep(2);
});

const backToStep1 = document.getElementById('backToStep1');
if (backToStep1) backToStep1.addEventListener('click', () => goToStep(1));

const toStep3 = document.getElementById('toStep3');
if (toStep3) toStep3.addEventListener('click', () => { renderCheckout(); goToStep(3); });

const backToStep2 = document.getElementById('backToStep2');
if (backToStep2) backToStep2.addEventListener('click', () => goToStep(2));

const promoBtn = document.getElementById('promoBtn');
if (promoBtn) promoBtn.addEventListener('click', () => showToast('Dieser Rabattcode ist nicht gültig.'));

const checkoutForm = document.getElementById('checkoutForm');
if (checkoutForm) {
  renderCheckout();

  checkoutForm.addEventListener('submit', async e => {
    e.preventDefault();

    if (!cart.length) {
      showToast('Ihr Warenkorb ist leer.');
      return;
    }

    const agb = document.getElementById('coAgb');
    if (!agb.checked) {
      showToast('Bitte AGB, Widerrufsbelehrung und Datenschutz akzeptieren.');
      return;
    }

    const firstName = document.getElementById('coFirstName').value.trim();
    const lastName  = document.getElementById('coLastName').value.trim();
    const email     = document.getElementById('coEmail').value.trim();
    const phone     = document.getElementById('coPhone').value.trim();
    const street    = document.getElementById('coStreet').value.trim();
    const plz       = document.getElementById('coPlz').value.trim();
    const notes     = document.getElementById('coNotes').value.trim();
    const shippingMethod = getShippingMethod();
    const shippingLabel = { 'b-post': 'B-Post (2–4 Werktage)', 'a-post': 'A-Post Priority', 'abholung': 'Abholung in Meilen' }[shippingMethod];
    const payment = document.querySelector('input[name="payment"]:checked').value;

    const subtotal = getCartTotal();
    const shipping = computeShipping(subtotal);
    const total = subtotal + shipping;
    const mwst = total - total / 1.026;

    const items = cart.map(i => ({
      name: i.name, meta: i.meta, qty: i.qty, sum: chf(i.price * i.qty)
    }));

    const submitBtn = document.getElementById('checkoutSubmit');
    const submitBtnOriginalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Wird gesendet …'; }

    try {
      const res = await fetch('order-handler.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName, email, phone, street, plz, notes,
          shippingLabel, payment, items,
          subtotal: chf(subtotal),
          shipping: shipping === 0 ? 'Kostenlos' : chf(shipping),
          mwst: chf(mwst),
          total: chf(total)
        })
      });
      const result = await res.json();

      if (!result.ok) throw new Error(result.error || 'unknown');

      document.getElementById('orderNumber').textContent = 'Bestellnummer ' + result.orderNumber;
      document.getElementById('checkoutFormWrap').style.display = 'none';
      document.getElementById('checkoutSuccess').style.display = 'block';

      cart = [];
      saveCart();
      updateCartBadge();
    } catch (err) {
      showToast('Bestellung konnte nicht gesendet werden. Bitte per WhatsApp (078 811 16 39) oder info@kaleburcu.ch bestellen.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtnOriginalText; }
    }
  });
}
