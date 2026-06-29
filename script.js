/* ============================================================
   RAMMPROJECT — магазин мерча · логика
   ============================================================ */
'use strict';

/* ---------- ДАННЫЕ ТОВАРОВ ---------- */
const CATEGORY_LABELS = {
  tee:  'Футболка',
  tank: 'Майка',
  tour: 'Тур-мерч',
};

// таблица размеров, которая показывается в карточке товара
const SIZE_CHARTS = {
  tee:  'images/size-tee.jpg',
  tank: 'images/size-tank.jpg',
};

/* Статическая копия каталога нужна для демо на Vercel.
   Локально, при запуске через npm start, данные по-прежнему читаются из SQLite. */
const TEE_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'];
const TANK_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const STATIC_PRODUCTS = [
  {
    id: 'tee-folk', cat: 'tee', name: 'RAMM ПРОЕКТ · ФОЛК', price: 2490,
    img: 'images/tee-folk.jpg',
    desc: 'Чёрная футболка с фирменным логотипом в стиле вышиванки. Красный орнамент, шелкография, плотный хлопок 240 гр/м².',
    sizes: TEE_SIZES, soldOut: ['XXS'], sizeChart: 'tee', tag: 'ХИТ',
  },
  {
    id: 'tank-nakazyvat', cat: 'tank', name: 'НАКАЗЫВАТЬ', price: 2290,
    img: 'images/tank-nakazyvat.jpg',
    desc: 'Безрукавка из серии «Мерч для слэма». Принт с маской и надписью «Готовься, я буду наказывать». Винтажная стирка.',
    sizes: TANK_SIZES, soldOut: [], sizeChart: 'tank', tag: 'СЛЭМ',
  },
  {
    id: 'tank-butterfly', cat: 'tank', name: 'ПОРХАЙ КАК БАБОЧКА', price: 2290,
    img: 'images/tank-butterfly.jpg',
    desc: 'Безрукавка «Мерч для слэма» с гитаристом. Для тех, кто живёт в первом ряду и пите.',
    sizes: TANK_SIZES, soldOut: ['XXL'], sizeChart: 'tank', tag: 'СЛЭМ',
  },
  {
    id: 'tank-able', cat: 'tank', name: 'И ЭТО ВСЁ?', price: 2290,
    img: 'images/tank-able.jpg',
    desc: 'Безрукавка «Мерч для слэма»: «И это всё, на что ты способен?». Вызов для танцпола.',
    sizes: TANK_SIZES, soldOut: ['S'], sizeChart: 'tank', tag: 'СЛЭМ',
  },
  {
    id: 'tour-vladimir', cat: 'tour', name: 'ТУР · VLADIMIR', price: 2690,
    img: 'images/tour-vladimir.jpg',
    desc: 'Туровая футболка RAMMSTEIN TRIBUTE SHOW. Оранжевый принт-треугольник, всадник, город Владимир.',
    sizes: TEE_SIZES, soldOut: [], sizeChart: 'tee', tag: 'ЛИМИТ',
  },
  {
    id: 'tour-spb', cat: 'tour', name: 'ТУР · ST. PETERSBURG', price: 2690,
    img: 'images/tour-spb.jpg',
    desc: 'Туровая футболка трибьют-шоу. Синий принт с Медным всадником, город Санкт-Петербург.',
    sizes: TEE_SIZES, soldOut: ['XXS', '6XL'], sizeChart: 'tee', tag: 'ЛИМИТ',
  },
  {
    id: 'tour-orel', cat: 'tour', name: 'ТУР · OREL', price: 2690,
    img: 'images/tour-orel.jpg',
    desc: 'Туровая футболка трибьют-шоу. Красный принт-треугольник, город Орёл.',
    sizes: TEE_SIZES, soldOut: [], sizeChart: 'tee', tag: 'ЛИМИТ',
  },
];

// ?demo=1 принудительно включает статический режим и удобен для локальной проверки.
const FORCE_STATIC_DEMO = new URLSearchParams(location.search).has('demo');

// API включён только для локального npm start. На Vercel сайт полностью статический.
const API_ENABLED = ['localhost', '127.0.0.1', '::1'].includes(location.hostname)
  && location.protocol !== 'file:'
  && !FORCE_STATIC_DEMO;

let PRODUCTS = STATIC_PRODUCTS;

/* ---------- КАРТИНКА ТОВАРА (реальное фото) ---------- */
function productArt(p) {
  return `<img src="${p.img}" alt="${p.name}" loading="lazy" decoding="async">`;
}

/* ---------- ХРАНИЛИЩЕ КОРЗИНЫ ---------- */
const STORAGE_KEY = 'rammproject_cart_v1';

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) {}
}

let cart = loadCart(); // [{id, size, qty}]

/* ---------- ХЕЛПЕРЫ ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const byId = id => PRODUCTS.find(p => p.id === id);
const rub = n => n.toLocaleString('ru-RU') + ' ₽';
const lineKey = (id, size) => id + '::' + (size || '-');

function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }
function cartTotal() {
  return cart.reduce((s, i) => {
    const p = byId(i.id);
    return p ? s + p.price * i.qty : s;
  }, 0);
}

/* ============================================================
   РЕНДЕР КАТАЛОГА
   ============================================================ */
const grid = $('#grid');
const gridEmpty = $('#gridEmpty');
let activeCat = 'all';

function renderGrid() {
  const list = PRODUCTS.filter(p => activeCat === 'all' || p.cat === activeCat);
  gridEmpty.hidden = list.length > 0;

  grid.innerHTML = list.map((p, i) => {
    const tag = p.soon
      ? `<span class="card__tag card__tag--soon">СКОРО</span>`
      : (p.tag ? `<span class="card__tag">${p.tag}</span>` : '');
    const addLabel = p.soon ? 'СКОРО' : (p.sizes ? 'ВЫБРАТЬ' : '+ В КОРЗИНУ');
    return `
      <article class="card" data-id="${p.id}" style="animation-delay:${i * 45}ms">
        <div class="card__media">${tag}${productArt(p)}</div>
        <div class="card__body">
          <span class="card__cat">${CATEGORY_LABELS[p.cat]}</span>
          <h3 class="card__name">${p.name}</h3>
          <div class="card__foot">
            <span class="card__price">${rub(p.price)}</span>
            <button class="card__add" data-add="${p.id}" ${p.soon ? 'disabled' : ''}>${addLabel}</button>
          </div>
        </div>
      </article>`;
  }).join('');
}

/* фильтры */
$('#filters').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  $$('.chip').forEach(c => c.classList.remove('is-active'));
  chip.classList.add('is-active');
  activeCat = chip.dataset.cat;
  renderGrid();
});

/* клики по сетке: открыть товар или быстро добавить */
grid.addEventListener('click', e => {
  const addBtn = e.target.closest('[data-add]');
  if (addBtn) {
    e.stopPropagation();
    const p = byId(addBtn.dataset.add);
    if (p.soon) return;
    if (p.sizes) { openProduct(p.id); }       // одежда — нужен размер
    else { addToCart(p.id, null); }           // без размера — сразу в корзину
    return;
  }
  const card = e.target.closest('.card');
  if (card) openProduct(card.dataset.id);
});

/* ============================================================
   МОДАЛКА ТОВАРА
   ============================================================ */
const productModal = $('#productModal');
let pmCurrent = null;
let pmSize = null;

function openProduct(id) {
  const p = byId(id);
  if (!p) return;
  pmCurrent = p;
  pmSize = null;

  $('#pmMedia').innerHTML = productArt(p);
  $('#pmCat').textContent = CATEGORY_LABELS[p.cat];
  $('#pmTitle').textContent = p.name;
  $('#pmPrice').textContent = rub(p.price);
  $('#pmDesc').textContent = p.desc;
  $('#pmSizeError').hidden = true;

  const sizesWrap = $('#pmSizes');
  if (p.sizes) {
    sizesWrap.style.display = '';
    sizesWrap.innerHTML = p.sizes.map(s => {
      const off = p.soldOut.includes(s);
      return `<button class="size" data-size="${s}" ${off ? 'disabled' : ''} role="radio" aria-checked="false">${s}</button>`;
    }).join('');
  } else {
    sizesWrap.style.display = 'none';
    sizesWrap.innerHTML = '';
  }

  // таблица размеров
  const guide = $('#pmGuide');
  const chart = $('#pmSizeChart');
  if (p.sizeChart && SIZE_CHARTS[p.sizeChart]) {
    guide.hidden = false;
    guide.open = false;
    chart.src = SIZE_CHARTS[p.sizeChart];
    chart.alt = 'Таблица размеров — ' + p.name;
  } else {
    guide.hidden = true;
    chart.removeAttribute('src');
  }

  $('#pmAdd').disabled = p.soon;
  $('#pmAdd').textContent = p.soon ? 'СКОРО В ПРОДАЖЕ' : 'В КОРЗИНУ';

  openOverlay(productModal);
}

$('#pmSizes').addEventListener('click', e => {
  const b = e.target.closest('.size');
  if (!b || b.disabled) return;
  $$('.size', $('#pmSizes')).forEach(s => { s.classList.remove('is-active'); s.setAttribute('aria-checked', 'false'); });
  b.classList.add('is-active');
  b.setAttribute('aria-checked', 'true');
  pmSize = b.dataset.size;
  $('#pmSizeError').hidden = true;
});

$('#pmAdd').addEventListener('click', () => {
  if (!pmCurrent) return;
  if (pmCurrent.sizes && !pmSize) {
    $('#pmSizeError').hidden = false;
    return;
  }
  addToCart(pmCurrent.id, pmSize);
  closeOverlay(productModal);
});

/* ============================================================
   КОРЗИНА
   ============================================================ */
const cartDrawer = $('#cartDrawer');

function addToCart(id, size) {
  const key = lineKey(id, size);
  const found = cart.find(i => lineKey(i.id, i.size) === key);
  if (found) found.qty += 1;
  else cart.push({ id, size, qty: 1 });
  saveCart();
  updateCartUI(true);
  const p = byId(id);
  toast(`«${p.name}»${size ? ' · ' + size : ''} в корзине`);
}

function changeQty(id, size, delta) {
  const key = lineKey(id, size);
  const item = cart.find(i => lineKey(i.id, i.size) === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => lineKey(i.id, i.size) !== key);
  saveCart();
  updateCartUI();
}

function removeItem(id, size) {
  const key = lineKey(id, size);
  cart = cart.filter(i => lineKey(i.id, i.size) !== key);
  saveCart();
  updateCartUI();
}

function renderCartItems() {
  const wrap = $('#cartItems');
  const empty = $('#cartEmpty');
  if (cart.length === 0) {
    wrap.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  wrap.innerHTML = cart.map(i => {
    const p = byId(i.id);
    if (!p) return '';
    return `
      <div class="cart-item">
        <div class="cart-item__media">${productArt(p)}</div>
        <div class="cart-item__info">
          <div class="cart-item__name">${p.name}</div>
          <div class="cart-item__meta">${CATEGORY_LABELS[p.cat]}${i.size ? ' · ' + i.size : ''}</div>
          <div class="cart-item__qty">
            <button data-q="-" data-id="${p.id}" data-size="${i.size || ''}" aria-label="Меньше">−</button>
            <span>${i.qty}</span>
            <button data-q="+" data-id="${p.id}" data-size="${i.size || ''}" aria-label="Больше">+</button>
          </div>
        </div>
        <div class="cart-item__right">
          <span class="cart-item__price">${rub(p.price * i.qty)}</span>
          <button class="cart-item__remove" data-rm data-id="${p.id}" data-size="${i.size || ''}">убрать</button>
        </div>
      </div>`;
  }).join('');
}

$('#cartItems').addEventListener('click', e => {
  const q = e.target.closest('[data-q]');
  if (q) { changeQty(q.dataset.id, q.dataset.size || null, q.dataset.q === '+' ? 1 : -1); return; }
  const rm = e.target.closest('[data-rm]');
  if (rm) { removeItem(rm.dataset.id, rm.dataset.size || null); }
});

function updateCartUI(bump) {
  const count = cartCount();
  const countEl = $('#cartCount');
  countEl.textContent = count;
  if (bump) {
    countEl.classList.remove('bump');
    void countEl.offsetWidth;       // перезапуск анимации
    countEl.classList.add('bump');
  }
  $('#cartTotal').textContent = rub(cartTotal());
  $('#goCheckout').disabled = count === 0;
  renderCartItems();
}

$('#cartOpen').addEventListener('click', () => openOverlay(cartDrawer));

/* ============================================================
   МОБИЛЬНОЕ МЕНЮ (бургер)
   ============================================================ */
const navToggle = $('#navToggle');
const primaryNav = $('#primaryNav');
function closeNav() {
  primaryNav.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
}
if (navToggle && primaryNav) {
  navToggle.addEventListener('click', () => {
    const open = primaryNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // закрыть после выбора пункта
  primaryNav.addEventListener('click', e => { if (e.target.closest('a')) closeNav(); });
  // закрыть, если ушли на десктопную ширину
  matchMedia('(min-width: 721px)').addEventListener('change', e => { if (e.matches) closeNav(); });
}

/* ============================================================
   СВАЙП ВПРАВО ЗАКРЫВАЕТ КОРЗИНУ (тач)
   ============================================================ */
(function () {
  const panel = $('#cartDrawer .drawer__panel');
  if (!panel) return;
  let x0 = null, y0 = null, t0 = 0;
  panel.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  panel.addEventListener('touchend', e => {
    if (x0 === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0, dt = Date.now() - t0;
    // быстрый горизонтальный свайп вправо
    if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) closeOverlay(cartDrawer);
    x0 = y0 = null;
  }, { passive: true });
})();

/* ============================================================
   ОФОРМЛЕНИЕ ЗАКАЗА
   ============================================================ */
const checkoutModal = $('#checkoutModal');
const successModal = $('#successModal');
const form = $('#checkoutForm');

$('#goCheckout').addEventListener('click', () => {
  if (cart.length === 0) return;
  closeOverlay(cartDrawer);
  $('#coTotal').textContent = rub(cartTotal());
  openOverlay(checkoutModal);
});

const VALIDATORS = {
  name:    v => v.trim().length >= 2            || 'Введи имя',
  phone:   v => /^[\d\s()+\-]{10,18}$/.test(v.trim()) || 'Проверь номер',
  email:   v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Проверь e-mail',
  city:    v => v.trim().length >= 2            || 'Укажи город',
  address: v => v.trim().length >= 5            || 'Укажи адрес',
};

function validateField(input) {
  const rule = VALIDATORS[input.name];
  if (!rule) return true;
  const res = rule(input.value);
  const field = input.closest('.field');
  const err = $('.field__err', field);
  if (res === true) {
    field.classList.remove('is-invalid');
    if (err) err.textContent = '';
    return true;
  } else {
    field.classList.add('is-invalid');
    if (err) err.textContent = res;
    return false;
  }
}

form.addEventListener('input', e => {
  if (e.target.name in VALIDATORS) validateField(e.target);
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  let ok = true;
  Object.keys(VALIDATORS).forEach(name => {
    const input = form.elements[name];
    if (!validateField(input)) ok = false;
  });
  if (!ok) {
    $('.is-invalid input, .is-invalid textarea', form)?.focus();
    return;
  }

  // Локально заказ пишется в SQLite; на Vercel показывается безопасная демо-имитация.
  const submitBtn = form.querySelector('.checkout__submit');
  const prevText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'ОТПРАВЛЯЕМ…';
  try {
    const payload = {
      customer: {
        name:    form.elements.name.value,
        phone:   form.elements.phone.value,
        email:   form.elements.email.value,
        city:    form.elements.city.value,
        address: form.elements.address.value,
        comment: form.elements.comment.value,
      },
      items: cart.map(i => ({ id: i.id, size: i.size, qty: i.qty })),
    };
    let data;
    if (API_ENABLED) {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();
    } else {
      data = {
        ok: true,
        order_no: 'DEMO-' + String(Date.now()).slice(-6),
        total: cartTotal(),
        demo: true,
      };
    }

    $('#orderNo').textContent = '#' + data.order_no;
    $('#successMessage').textContent = data.demo
      ? 'Это демонстрационный заказ — данные никуда не отправлялись.'
      : 'Спасибо! Заказ сохранён в базе данных.';
    cart = [];
    saveCart();
    updateCartUI();
    form.reset();
    closeOverlay(checkoutModal);
    openOverlay(successModal);
  } catch (err) {
    toast('Не удалось оформить заказ. Попробуй ещё раз.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = prevText;
  }
});

/* ============================================================
   УПРАВЛЕНИЕ ОВЕРЛЕЯМИ
   ============================================================ */
let lastFocused = null;

function openOverlay(el) {
  lastFocused = document.activeElement;
  el.setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');
  const focusable = el.querySelector('button, input, [tabindex]');
  if (focusable) setTimeout(() => focusable.focus(), 40);
}

function closeOverlay(el) {
  el.setAttribute('aria-hidden', 'true');
  if (!$$('.modal[aria-hidden="false"], .drawer[aria-hidden="false"]').length) {
    document.body.classList.remove('locked');
  }
  if (lastFocused) lastFocused.focus();
}

/* закрытие по фону, крестику, Esc */
document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) {
    const overlay = e.target.closest('.modal, .drawer');
    if (overlay) closeOverlay(overlay);
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const open = $('.modal[aria-hidden="false"], .drawer[aria-hidden="false"]');
    if (open) closeOverlay(open);
  }
});

/* ============================================================
   ТОСТ
   ============================================================ */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============================================================
   СТАРТ — статический каталог + локальная SQLite при npm start
   ============================================================ */
async function init() {
  PRODUCTS = STATIC_PRODUCTS;

  if (API_ENABLED) {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const apiProducts = await res.json();
      if (Array.isArray(apiProducts) && apiProducts.length) PRODUCTS = apiProducts;
    } catch (e) {
      console.warn('API недоступен, используется статический каталог.', e);
    }
  }
  renderGrid();
  updateCartUI();
}
init();

/* ============================================================
   АНИМИРОВАННЫЙ ФОН (canvas: частицы — ноты + кресты + «дыхание» свечения)
   ============================================================ */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, DPR = 1, running = true, rafId = null, last = 0;
  let scrollY = window.scrollY || 0;
  const mouse = { x: 0, y: 0, has: false };
  const COL = { paper: '243,237,225', accent: '226,42,27', accent2: '233,195,74' };

  /* силуэты (Path2D, строятся один раз) */
  function crossPath() {
    const p = new Path2D();
    p.roundRect(-4.5, -18, 9, 36, 2);   // вертикаль
    p.roundRect(-18, -4.5, 36, 9, 2);   // горизонталь
    return p;
  }
  function notePath() {
    const p = new Path2D();
    p.ellipse(0, 0, 9, 6.6, -0.35, 0, Math.PI * 2);       // головка
    p.moveTo(7.6, -3); p.lineTo(10.6, -3.6);              // штиль
    p.lineTo(10.6, -40); p.lineTo(7.6, -40); p.closePath();
    p.moveTo(10.6, -40);                                   // флажок
    p.quadraticCurveTo(22, -36, 19, -22);
    p.quadraticCurveTo(19, -30, 10.6, -31); p.closePath();
    return p;
  }
  const SHAPES = { cross: crossPath(), note: notePath() };

  let particles = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  function build() {
    const mobile = W < 760;
    const n = reduce ? (mobile ? 5 : 9) : (mobile ? 9 : 18);
    particles = [];
    for (let i = 0; i < n; i++) {
      const isNote = Math.random() < 0.5;
      const depth = rnd(0.35, 1);
      const tint = Math.random() < 0.72 ? COL.paper : (isNote ? COL.accent2 : COL.accent);
      particles.push({
        type: isNote ? 'note' : 'cross',
        x: rnd(0, W), y: rnd(0, H),
        size: (isNote ? rnd(0.35, 0.7) : rnd(0.4, 0.8)) * (0.7 + depth * 0.6),
        depth,
        vx: rnd(0.05, 0.18) * (0.4 + depth),
        vy: -rnd(0.04, 0.12) * (0.4 + depth),
        rot: rnd(-0.5, 0.5), vr: rnd(-0.05, 0.05),
        sway: rnd(0, Math.PI * 2),
        alpha: (isNote ? rnd(0.05, 0.10) : rnd(0.05, 0.09)) * (0.6 + depth * 0.5),
        tint
      });
    }
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  function draw(now) {
    const dt = Math.min(50, now - last) / 16.67; last = now;
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);

    // «дыхание» + редкий «тук» свечения --accent
    const breath = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 4.6));
    const beat = Math.pow(0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 1.15)), 6);
    const glowA = 0.05 + breath * 0.05 + beat * 0.04;
    const gx = W * 0.5, gy = H * 0.74, gr = Math.max(W, H) * 0.6;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(${COL.accent},${glowA})`);
    g.addColorStop(1, `rgba(${COL.accent},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const mdx = mouse.has ? (mouse.x - W / 2) : 0;
    const mdy = mouse.has ? (mouse.y - H / 2) : 0;

    for (const p of particles) {
      if (!reduce) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * 0.02 * dt; p.sway += 0.01 * dt;
        const m = 70;
        if (p.x > W + m) p.x = -m; if (p.x < -m) p.x = W + m;
        if (p.y < -m) p.y = H + m; if (p.y > H + m) p.y = -m;
      }
      const px = p.x + mdx * 0.018 * p.depth + Math.sin(p.sway) * 6 * p.depth;
      const py = p.y + mdy * 0.018 * p.depth - (scrollY * 0.12 * p.depth) % (H + 140);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.rot);
      ctx.scale(p.size, p.size);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `rgb(${p.tint})`;
      ctx.fill(SHAPES[p.type]);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (running && !reduce) rafId = requestAnimationFrame(draw);
  }

  function still() { last = performance.now(); draw(performance.now()); }

  window.addEventListener('resize', () => { resize(); if (reduce) still(); }, { passive: true });
  window.addEventListener('scroll', () => { scrollY = window.scrollY || 0; if (reduce) still(); }, { passive: true });
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.has = true; }, { passive: true });
  window.addEventListener('mouseout', () => { mouse.has = false; }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; if (rafId) cancelAnimationFrame(rafId); }
    else if (!reduce) { running = true; last = performance.now(); rafId = requestAnimationFrame(draw); }
  });

  resize();
  if (reduce) still();
  else { last = performance.now(); rafId = requestAnimationFrame(draw); }
})();
