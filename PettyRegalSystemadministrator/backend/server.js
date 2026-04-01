require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const bcrypt = require('bcryptjs');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000; // 🔥 مهم في Render

// 🔥 Migrations
async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL DEFAULT 'unisex',
        image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address TEXT NOT NULL,
        wilaya VARCHAR(100) NOT NULL,
        commune VARCHAR(100) NOT NULL,
        items JSONB NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'`);

    // 🔥 Admin user
    const newHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || '123456', 12);

    const existing = await client.query(
      'SELECT id FROM admin_users WHERE username = $1',
      ['admin']
    );

    if (existing.rows.length === 0) {
      await client.query(
        'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
        ['admin', newHash]
      );
    } else {
      await client.query(
        'UPDATE admin_users SET password_hash = $1 WHERE username = $2',
        [newHash, 'admin']
      );
    }

    await client.query('COMMIT');
    console.log('✅ Database ready');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration error:', err.message);
  } finally {
    client.release();
  }
}

// 🔥 CORS (محسّن)
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    const patterns = [
      /\.onrender\.com$/,
      /\.vercel\.app$/,
      /\.replit\.dev$/,
      /\.repl\.co$/
    ];

    if (!origin || allowed.includes(origin) || patterns.some(p => p.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('❌ Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
}));

// 🔥 Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔥 Health check (مهم لـ Render)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// 🔥 Routes
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);

// 🔥 Error handler (مهم بزاف)
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 🔥 Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Rym SHOES API running on port ${PORT}`);
  await runMigrations();
});
