const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const frontendDir = path.join(__dirname, '..', 'frontend');
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'articles.json');

let pool = null;
let usingMySQL = false;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(frontendDir));

function ensureDataStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '[]', 'utf8');
  }
}

function readArticlesFile() {
  ensureDataStore();
  const content = fs.readFileSync(dataFile, 'utf8');
  return JSON.parse(content);
}

function writeArticlesFile(articles) {
  ensureDataStore();
  fs.writeFileSync(dataFile, JSON.stringify(articles, null, 2), 'utf8');
}

function parseTags(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

function normalizeArticle(article) {
  let tags = [];

  if (Array.isArray(article.tags)) {
    tags = article.tags;
  } else if (typeof article.tags === 'string') {
    try {
      tags = JSON.parse(article.tags);
    } catch {
      tags = parseTags(article.tags);
    }
  }

  return {
    id: article.id,
    title: article.title,
    content: article.content,
    writer: article.writer,
    category: article.category,
    tags: Array.isArray(tags) ? tags : [],
    createdAt: article.created_at || article.createdAt || new Date().toISOString(),
    updatedAt: article.updated_at || article.updatedAt || new Date().toISOString(),
  };
}

async function initDatabase() {
  const connectionString = process.env.MYSQL_URL || process.env.DATABASE_URL;

  if (connectionString) {
    pool = mysql.createPool(connectionString);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id VARCHAR(36) PRIMARY KEY,
        title TEXT NOT NULL,
        content LONGTEXT NOT NULL,
        writer VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        tags JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    usingMySQL = true;
    return;
  }

  usingMySQL = false;
  ensureDataStore();
}

async function listArticles() {
  if (usingMySQL && pool) {
    const [rows] = await pool.query(
      'SELECT id, title, content, writer, category, tags, created_at, updated_at FROM articles ORDER BY created_at DESC'
    );
    return rows.map(normalizeArticle);
  }

  const articles = readArticlesFile();
  return articles.map(normalizeArticle);
}

async function createArticle(payload) {
  const article = {
    id: crypto.randomUUID(),
    title: payload.title || 'Judul belum diisi',
    content: payload.content || '',
    writer: payload.writer || 'Admin',
    category: payload.category || 'Lainnya',
    tags: parseTags(payload.tags),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (usingMySQL && pool) {
    await pool.query(
      'INSERT INTO articles (id, title, content, writer, category, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [article.id, article.title, article.content, article.writer, article.category, JSON.stringify(article.tags), article.createdAt, article.updatedAt]
    );
    return article;
  }

  const articles = readArticlesFile();
  articles.unshift(article);
  writeArticlesFile(articles);
  return article;
}

async function updateArticle(id, payload) {
  if (usingMySQL && pool) {
    const [result] = await pool.query(
      'UPDATE articles SET title = ?, content = ?, writer = ?, category = ?, tags = ?, updated_at = NOW() WHERE id = ?',
      [payload.title, payload.content, payload.writer, payload.category, JSON.stringify(parseTags(payload.tags)), id]
    );

    if (result.affectedRows === 0) {
      throw new Error('Artikel tidak ditemukan');
    }

    const [rows] = await pool.query('SELECT id, title, content, writer, category, tags, created_at, updated_at FROM articles WHERE id = ?', [id]);
    return normalizeArticle(rows[0]);
  }

  const articles = readArticlesFile();
  const index = articles.findIndex(item => item.id === id);
  if (index === -1) {
    throw new Error('Artikel tidak ditemukan');
  }

  articles[index] = {
    ...articles[index],
    title: payload.title || articles[index].title,
    content: payload.content || articles[index].content,
    writer: payload.writer || articles[index].writer,
    category: payload.category || articles[index].category,
    tags: parseTags(payload.tags),
    updatedAt: new Date().toISOString(),
  };

  writeArticlesFile(articles);
  return normalizeArticle(articles[index]);
}

async function deleteArticle(id) {
  if (usingMySQL && pool) {
    const [result] = await pool.query('DELETE FROM articles WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      throw new Error('Artikel tidak ditemukan');
    }
    return true;
  }

  const articles = readArticlesFile();
  const filtered = articles.filter(item => item.id !== id);
  if (filtered.length === articles.length) {
    throw new Error('Artikel tidak ditemukan');
  }

  writeArticlesFile(filtered);
  return true;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: usingMySQL ? 'mysql' : 'file' });
});

app.get('/api/articles', async (req, res) => {
  try {
    const articles = await listArticles();
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/articles', async (req, res) => {
  try {
    const article = await createArticle(req.body);
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/articles/:id', async (req, res) => {
  try {
    const article = await updateArticle(req.params.id, req.body);
    res.json(article);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

app.delete('/api/articles/:id', async (req, res) => {
  try {
    await deleteArticle(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'CMS.html'));
});

async function startServer(port = process.env.PORT || 3000) {
  await initDatabase();
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Server berjalan di port ${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Gagal menjalankan server:', error);
    process.exit(1);
  });
}

module.exports = { app, startServer, listArticles, createArticle, updateArticle, deleteArticle };
