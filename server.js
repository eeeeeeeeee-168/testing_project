const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbFile = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    type TEXT,
    price REAL,
    description TEXT
  )`);

  // seed if empty
  db.get('SELECT COUNT(*) as c FROM products', (err, row) => {
    if (!err && row.c === 0) {
      const stmt = db.prepare('INSERT INTO products (title,type,price,description) VALUES (?,?,?,?)');
      stmt.run('MacBook Air M1', 'macbook', 799, 'Lightweight Apple laptop with M1 chip');
      stmt.run('MacBook Pro 14"', 'macbook', 1999, 'Powerful MacBook Pro with M1 Pro');
      stmt.run('Dell XPS 13', 'laptop', 999, 'Compact Windows ultrabook');
      stmt.run('HP Pavilion', 'laptop', 599, 'Affordable everyday laptop');
      stmt.finalize();
      console.log('Seeded products');
    }
  });
});

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const { title, type, price, description } = req.body;
  if (!title || !type || !price) return res.status(400).json({ error: 'Missing fields' });
  const stmt = db.prepare('INSERT INTO products (title,type,price,description) VALUES (?,?,?,?)');
  stmt.run(title, type, price, description || '', function (err) {
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
