/* ============================================================
   RAMMPROJECT SHOP — сервер
   Node.js + Express + SQLite
   - отдаёт статику (index.html, css, js, images)
   - API каталога:  GET  /api/products
   - оформление:    POST /api/orders   (пишет заказ в БД)
   - просмотр:      GET  /api/orders    (демо/«админка»)
   ============================================================ */
'use strict';

const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, 'shop.db'));
db.pragma('journal_mode = WAL');

/* ---------- СХЕМА ---------- */
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT UNIQUE NOT NULL,
    category    TEXT NOT NULL,
    name        TEXT NOT NULL,
    price       INTEGER NOT NULL,
    image       TEXT NOT NULL,
    description TEXT,
    sizes       TEXT NOT NULL DEFAULT '[]',   -- JSON-массив размеров
    sold_out    TEXT NOT NULL DEFAULT '[]',   -- JSON-массив распроданных размеров
    size_chart  TEXT,                          -- 'tee' | 'tank'
    tag         TEXT,
    sort        INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no   TEXT UNIQUE NOT NULL,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL,
    email      TEXT NOT NULL,
    city       TEXT NOT NULL,
    address    TEXT NOT NULL,
    comment    TEXT,
    total      INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    size       TEXT,
    qty        INTEGER NOT NULL,
    price      INTEGER NOT NULL
  );
`);

/* ---------- НАЧАЛЬНЫЕ ДАННЫЕ (seed каталога) ---------- */
const TEE_SIZES  = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'];
const TANK_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const SEED = [
  { slug: 'tee-folk', category: 'tee', name: 'RAMM ПРОЕКТ · ФОЛК', price: 2490,
    image: 'images/tee-folk.jpg',
    description: 'Чёрная футболка с фирменным логотипом в стиле вышиванки. Красный орнамент, шелкография, плотный хлопок 240 гр/м².',
    sizes: TEE_SIZES, sold_out: ['XXS'], size_chart: 'tee', tag: 'ХИТ' },
  { slug: 'tank-nakazyvat', category: 'tank', name: 'НАКАЗЫВАТЬ', price: 2290,
    image: 'images/tank-nakazyvat.jpg',
    description: 'Безрукавка из серии «Мерч для слэма». Принт с маской и надписью «Готовься, я буду наказывать». Винтажная стирка.',
    sizes: TANK_SIZES, sold_out: [], size_chart: 'tank', tag: 'СЛЭМ' },
  { slug: 'tank-butterfly', category: 'tank', name: 'ПОРХАЙ КАК БАБОЧКА', price: 2290,
    image: 'images/tank-butterfly.jpg',
    description: 'Безрукавка «Мерч для слэма» с гитаристом. Для тех, кто живёт в первом ряду и пите.',
    sizes: TANK_SIZES, sold_out: ['XXL'], size_chart: 'tank', tag: 'СЛЭМ' },
  { slug: 'tank-able', category: 'tank', name: 'И ЭТО ВСЁ?', price: 2290,
    image: 'images/tank-able.jpg',
    description: 'Безрукавка «Мерч для слэма»: «И это всё, на что ты способен?». Вызов для танцпола.',
    sizes: TANK_SIZES, sold_out: ['S'], size_chart: 'tank', tag: 'СЛЭМ' },
  { slug: 'tour-vladimir', category: 'tour', name: 'ТУР · VLADIMIR', price: 2690,
    image: 'images/tour-vladimir.jpg',
    description: 'Туровая футболка RAMMSTEIN TRIBUTE SHOW. Оранжевый принт-треугольник, всадник, город Владимир.',
    sizes: TEE_SIZES, sold_out: [], size_chart: 'tee', tag: 'ЛИМИТ' },
  { slug: 'tour-spb', category: 'tour', name: 'ТУР · ST. PETERSBURG', price: 2690,
    image: 'images/tour-spb.jpg',
    description: 'Туровая футболка трибьют-шоу. Синий принт с Медным всадником, город Санкт-Петербург.',
    sizes: TEE_SIZES, sold_out: ['XXS', '6XL'], size_chart: 'tee', tag: 'ЛИМИТ' },
  { slug: 'tour-orel', category: 'tour', name: 'ТУР · OREL', price: 2690,
    image: 'images/tour-orel.jpg',
    description: 'Туровая футболка трибьют-шоу. Красный принт-треугольник, город Орёл.',
    sizes: TEE_SIZES, sold_out: [], size_chart: 'tee', tag: 'ЛИМИТ' },
];

const productCount = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
if (productCount === 0) {
  const insert = db.prepare(`
    INSERT INTO products (slug, category, name, price, image, description, sizes, sold_out, size_chart, tag, sort)
    VALUES (@slug, @category, @name, @price, @image, @description, @sizes, @sold_out, @size_chart, @tag, @sort)
  `);
  const seedTx = db.transaction(rows => {
    rows.forEach((r, i) => insert.run({
      ...r,
      sizes: JSON.stringify(r.sizes),
      sold_out: JSON.stringify(r.sold_out),
      sort: i,
    }));
  });
  seedTx(SEED);
  console.log(`Каталог засеян: ${SEED.length} товаров.`);
}

/* ---------- ПРИЛОЖЕНИЕ ---------- */
const app = express();
app.use(express.json());
app.use(express.static(__dirname));   // index.html, style.css, script.js, images/

// привести строку БД к форме, которую ждёт фронтенд
function mapProduct(row) {
  return {
    id: row.slug,
    cat: row.category,
    name: row.name,
    price: row.price,
    img: row.image,
    desc: row.description,
    sizes: JSON.parse(row.sizes),
    soldOut: JSON.parse(row.sold_out),
    sizeChart: row.size_chart,
    tag: row.tag,
  };
}

/* ---------- API: КАТАЛОГ ---------- */
app.get('/api/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY sort').all();
  res.json(rows.map(mapProduct));
});

app.get('/api/products/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Товар не найден' });
  res.json(mapProduct(row));
});

/* ---------- API: ОФОРМЛЕНИЕ ЗАКАЗА ---------- */
const getProductBySlug = db.prepare('SELECT * FROM products WHERE slug = ?');
const insertOrder = db.prepare(`
  INSERT INTO orders (order_no, name, phone, email, city, address, comment, total)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertItem = db.prepare(`
  INSERT INTO order_items (order_id, product_id, size, qty, price)
  VALUES (?, ?, ?, ?, ?)
`);

function makeOrderNo() {
  return 'RP-' + String(Date.now()).slice(-6);
}

app.post('/api/orders', (req, res) => {
  const { customer = {}, items = [] } = req.body || {};

  // серверная валидация покупателя
  const required = ['name', 'phone', 'email', 'city', 'address'];
  for (const f of required) {
    if (!customer[f] || String(customer[f]).trim().length < 2) {
      return res.status(400).json({ error: `Поле «${f}» заполнено некорректно` });
    }
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Корзина пуста' });
  }

  // сумму считаем по ценам из БД (не доверяем клиенту)
  const lines = [];
  let total = 0;
  for (const it of items) {
    const p = getProductBySlug.get(it.id);
    if (!p) continue;
    const qty = Math.max(1, parseInt(it.qty, 10) || 1);
    total += p.price * qty;
    lines.push({ product_id: p.id, size: it.size || null, qty, price: p.price });
  }
  if (lines.length === 0) {
    return res.status(400).json({ error: 'В корзине нет существующих товаров' });
  }

  const orderNo = makeOrderNo();
  const tx = db.transaction(() => {
    const result = insertOrder.run(
      orderNo,
      String(customer.name).trim(),
      String(customer.phone).trim(),
      String(customer.email).trim(),
      String(customer.city).trim(),
      String(customer.address).trim(),
      customer.comment ? String(customer.comment).trim() : null,
      total
    );
    const orderId = result.lastInsertRowid;
    lines.forEach(l => insertItem.run(orderId, l.product_id, l.size, l.qty, l.price));
    return orderId;
  });

  const orderId = tx();
  res.status(201).json({ ok: true, order_no: orderNo, total, order_id: orderId });
});

/* ---------- API: ПРОСМОТР ЗАКАЗОВ (демо) ---------- */
app.get('/api/orders', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  const itemsStmt = db.prepare(`
    SELECT oi.size, oi.qty, oi.price, p.name, p.slug
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `);
  res.json(orders.map(o => ({ ...o, items: itemsStmt.all(o.id) })));
});

app.listen(PORT, () => {
  console.log(`RAMMPROJECT SHOP запущен:  http://localhost:${PORT}`);
});
