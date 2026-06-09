const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadsDir); },
  filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'_')); }
});
const upload = multer({ storage });

const dbFile = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    type TEXT,
    price REAL,
    description TEXT,
    image TEXT
  )`);

  // seed if empty
  db.get('SELECT COUNT(*) as c FROM products', (err, row) => {
    if (!err && row.c === 0) {
      const stmt = db.prepare('INSERT INTO products (title,type,price,description,image) VALUES (?,?,?,?,?)');
      stmt.run('MacBook Air M1', 'macbook', 799, 'Lightweight Apple laptop with M1 chip', null);
      stmt.run('MacBook Pro 14"', 'macbook', 1999, 'Powerful MacBook Pro with M1 Pro', null);
      stmt.run('Dell XPS 13', 'laptop', 999, 'Compact Windows ultrabook', null);
      stmt.run('HP Pavilion', 'laptop', 599, 'Affordable everyday laptop', null);
      stmt.finalize();
      console.log('Seeded products');
    }
  });
});

// List with optional search, type filter, pagination
app.get('/api/products', (req, res) => {
  const q = (req.query.q || '').trim();
  const type = req.query.type || '';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const params = [];
  let where = '';
  if (q) {
    where += "(title LIKE ? OR description LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (type) {
    if (where) where += ' AND ';
    where += 'type = ?';
    params.push(type);
  }
  const whereSql = where ? `WHERE ${where}` : '';

  db.all(`SELECT COUNT(*) as total FROM products ${whereSql}`, params, (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = countRow[0] ? countRow[0].total : countRow.total;
    db.all(`SELECT * FROM products ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`, params.concat([limit, offset]), (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ total, page, limit, products: rows });
    });
  });
});

// Product detail
app.get('/api/products/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM products WHERE id = ?', id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

// Create product — supports multipart/form-data (image) or JSON
app.post('/api/products', upload.single('image'), (req, res) => {
  const payload = req.body || {};
  const title = payload.title;
  const type = payload.type;
  const price = parseFloat(payload.price);
  const description = payload.description || '';
  if (!title || !type || !price) return res.status(400).json({ error: 'Missing fields' });
  const imagePath = req.file ? `/uploads/${req.file.filename}` : (payload.image || null);
  const stmt = db.prepare('INSERT INTO products (title,type,price,description,image) VALUES (?,?,?,?,?)');
  stmt.run(title, type, price, description, imagePath, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
  stmt.finalize();
});

app.delete('/api/products/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM products WHERE id = ?', id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
