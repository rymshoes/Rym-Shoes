const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM products ORDER BY created_at DESC';
    let params = [];
    if (category && category !== 'all') {
      query = 'SELECT * FROM products WHERE category = $1 ORDER BY created_at DESC';
      params = [category];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, upload.array('images', 10), async (req, res) => {
  const { name, price, description, category, sizes, colors, existingImages } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }

  const newImagePaths = (req.files || []).map(f => `/uploads/${f.filename}`);
  const kept = existingImages ? JSON.parse(existingImages) : [];
  const allImages = [...kept, ...newImagePaths];
  const image_url = allImages[0] || null;

  const parsedSizes = sizes ? JSON.parse(sizes) : [];
  const parsedColors = colors ? JSON.parse(colors) : [];

  try {
    const result = await pool.query(
      'INSERT INTO products (name, price, description, category, image_url, sizes, colors, images) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, parseFloat(price), description, category, image_url, JSON.stringify(parsedSizes), JSON.stringify(parsedColors), JSON.stringify(allImages)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticateToken, upload.array('images', 10), async (req, res) => {
  const { name, price, description, category, sizes, colors, existingImages } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const newImagePaths = (req.files || []).map(f => `/uploads/${f.filename}`);
    let kept = existingImages ? JSON.parse(existingImages) : (existing.rows[0].images || []);
    const allImages = [...kept, ...newImagePaths];
    const image_url = allImages[0] || existing.rows[0].image_url || null;

    const parsedSizes = sizes ? JSON.parse(sizes) : (existing.rows[0].sizes || []);
    const parsedColors = colors ? JSON.parse(colors) : (existing.rows[0].colors || []);

    const result = await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        description = COALESCE($3, description),
        category = COALESCE($4, category),
        image_url = $5,
        sizes = $6,
        colors = $7,
        images = $8
       WHERE id = $9 RETURNING *`,
      [name, price ? parseFloat(price) : null, description, category, image_url,
       JSON.stringify(parsedSizes), JSON.stringify(parsedColors), JSON.stringify(allImages),
       req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted', product: result.rows[0] });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
