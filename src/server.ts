import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, initDB } from './db';
import { authenticateToken, AuthRequest } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pewallet_jwt_secure_key_2026_xyz';

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------------- AUTH ROUTES ----------------
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/verify', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ valid: true, user: req.user });
});

// ---------------- SITE SETTINGS (EDITABLE LANDING PAGE) ----------------
app.get('/api/settings', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM site_settings ORDER BY id ASC LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    hero_badge,
    hero_title_prefix,
    hero_title_highlight,
    hero_title_suffix,
    hero_description,
    hero_cta_primary,
    hero_cta_secondary,
    wallet_card_label,
    wallet_protocol_tag,
    footer_text
  } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM site_settings LIMIT 1');
    if (existing.rows.length === 0) {
      const inserted = await pool.query(
        `INSERT INTO site_settings (
          hero_badge, hero_title_prefix, hero_title_highlight, hero_title_suffix,
          hero_description, hero_cta_primary, hero_cta_secondary, wallet_card_label, wallet_protocol_tag, footer_text
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [hero_badge, hero_title_prefix, hero_title_highlight, hero_title_suffix, hero_description, hero_cta_primary, hero_cta_secondary, wallet_card_label, wallet_protocol_tag, footer_text]
      );
      res.json(inserted.rows[0]);
    } else {
      const updated = await pool.query(
        `UPDATE site_settings SET
          hero_badge = COALESCE($1, hero_badge),
          hero_title_prefix = COALESCE($2, hero_title_prefix),
          hero_title_highlight = COALESCE($3, hero_title_highlight),
          hero_title_suffix = COALESCE($4, hero_title_suffix),
          hero_description = COALESCE($5, hero_description),
          hero_cta_primary = COALESCE($6, hero_cta_primary),
          hero_cta_secondary = COALESCE($7, hero_cta_secondary),
          wallet_card_label = COALESCE($8, wallet_card_label),
          wallet_protocol_tag = COALESCE($9, wallet_protocol_tag),
          footer_text = COALESCE($10, footer_text),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $11 RETURNING *`,
        [hero_badge, hero_title_prefix, hero_title_highlight, hero_title_suffix, hero_description, hero_cta_primary, hero_cta_secondary, wallet_card_label, wallet_protocol_tag, footer_text, existing.rows[0].id]
      );
      res.json(updated.rows[0]);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PROFILE ROUTES ----------------
app.get('/api/profile', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM profile ORDER BY id ASC LIMIT 1');
    res.json(result.rows[0] || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, title, bio, avatar_url, email, github_url, linkedin_url, twitter_url, skills } = req.body;
  try {
    const existing = await pool.query('SELECT id FROM profile LIMIT 1');
    if (existing.rows.length === 0) {
      const inserted = await pool.query(
        `INSERT INTO profile (name, title, bio, avatar_url, email, github_url, linkedin_url, twitter_url, skills)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [name, title, bio, avatar_url, email, github_url, linkedin_url, twitter_url, JSON.stringify(skills || [])]
      );
      res.json(inserted.rows[0]);
    } else {
      const updated = await pool.query(
        `UPDATE profile SET 
          name = COALESCE($1, name),
          title = COALESCE($2, title),
          bio = COALESCE($3, bio),
          avatar_url = COALESCE($4, avatar_url),
          email = COALESCE($5, email),
          github_url = COALESCE($6, github_url),
          linkedin_url = COALESCE($7, linkedin_url),
          twitter_url = COALESCE($8, twitter_url),
          skills = COALESCE($9, skills),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $10 RETURNING *`,
        [name, title, bio, avatar_url, email, github_url, linkedin_url, twitter_url, skills ? JSON.stringify(skills) : null, existing.rows[0].id]
      );
      res.json(updated.rows[0]);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- WEBPAGES ROUTES ----------------
app.get('/api/webpages', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM webpages 
      ORDER BY pinned DESC, is_featured DESC, created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/webpages/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM webpages WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Webpage not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create webpage with optional image upload
app.post('/api/webpages', authenticateToken, upload.single('preview_image_file'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, url, description, category, icon, badge, preview_image, color_gradient, is_featured, pinned } = req.body;

  if (!title || !url) {
    res.status(400).json({ error: 'Title and URL are required' });
    return;
  }

  // File upload takes precedence if provided, otherwise use URL string
  let finalPreviewImage = preview_image || null;
  if (req.file) {
    finalPreviewImage = `/uploads/${req.file.filename}`;
  }

  try {
    const result = await pool.query(
      `INSERT INTO webpages (title, url, description, category, icon, badge, preview_image, color_gradient, is_featured, pinned)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        title,
        url,
        description || '',
        category || 'Web App',
        icon || 'globe',
        badge || 'Live',
        finalPreviewImage,
        color_gradient || 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
        is_featured === true || is_featured === 'true',
        pinned === true || pinned === 'true'
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update webpage with optional image upload
app.put('/api/webpages/:id', authenticateToken, upload.single('preview_image_file'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, url, description, category, icon, badge, preview_image, color_gradient, is_featured, pinned } = req.body;

  let finalPreviewImage = preview_image !== undefined ? preview_image : null;
  if (req.file) {
    finalPreviewImage = `/uploads/${req.file.filename}`;
  }

  try {
    const isFeaturedBool = is_featured !== undefined ? (is_featured === true || is_featured === 'true') : null;
    const pinnedBool = pinned !== undefined ? (pinned === true || pinned === 'true') : null;

    const result = await pool.query(
      `UPDATE webpages SET 
        title = COALESCE($1, title),
        url = COALESCE($2, url),
        description = COALESCE($3, description),
        category = COALESCE($4, category),
        icon = COALESCE($5, icon),
        badge = COALESCE($6, badge),
        preview_image = CASE WHEN $7::text IS NOT NULL THEN $7::text ELSE preview_image END,
        color_gradient = COALESCE($8, color_gradient),
        is_featured = COALESCE($9, is_featured),
        pinned = COALESCE($10, pinned),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [title, url, description, category, icon, badge, finalPreviewImage, color_gradient, isFeaturedBool, pinnedBool, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Webpage not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/webpages/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM webpages WHERE id = $1 RETURNING id, preview_image', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Webpage not found' });
      return;
    }
    
    // Clean up uploaded preview image if local
    const preview = result.rows[0].preview_image;
    if (preview && preview.startsWith('/uploads/')) {
      const p = path.join(uploadsDir, path.basename(preview));
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) {}
      }
    }

    res.json({ message: 'Webpage deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- FILES ROUTES ----------------
app.get('/api/files', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, title, original_name, filename, file_size, mime_type, category, description, downloads, created_at
      FROM files 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const { title, category, description } = req.body;
  const original_name = req.file.originalname;
  const filename = req.file.filename;
  const filepath = `/uploads/${filename}`;
  const file_size = req.file.size;
  const mime_type = req.file.mimetype;

  try {
    const result = await pool.query(
      `INSERT INTO files (title, original_name, filename, filepath, file_size, mime_type, category, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title || original_name,
        original_name,
        filename,
        filepath,
        file_size,
        mime_type,
        category || 'Document',
        description || ''
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/files/:id/download', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const file = result.rows[0];
    const physicalPath = path.join(uploadsDir, file.filename);

    if (!fs.existsSync(physicalPath)) {
      res.status(404).json({ error: 'File missing from storage' });
      return;
    }

    pool.query('UPDATE files SET downloads = downloads + 1 WHERE id = $1', [id]).catch(console.error);
    res.download(physicalPath, file.original_name);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/files/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM files WHERE id = $1 RETURNING filename', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const filename = result.rows[0].filename;
    const physicalPath = path.join(uploadsDir, filename);
    if (fs.existsSync(physicalPath)) {
      try {
        fs.unlinkSync(physicalPath);
      } catch (e) {}
    }

    res.json({ message: 'File deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- STATS ROUTE ----------------
app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const webpagesCount = await pool.query('SELECT COUNT(*) as count FROM webpages');
    const filesCount = await pool.query('SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size, COALESCE(SUM(downloads), 0) as total_downloads FROM files');
    
    res.json({
      totalWebpages: parseInt(webpagesCount.rows[0].count, 10),
      totalFiles: parseInt(filesCount.rows[0].count, 10),
      totalSize: parseInt(filesCount.rows[0].total_size, 10),
      totalDownloads: parseInt(filesCount.rows[0].total_downloads, 10)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// HTML routes
app.get('/about', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'about.html'));
});

app.get('/login', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.get('/admin', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Bootstrap
async function bootstrap() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
