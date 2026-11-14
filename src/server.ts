import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, desc, sql, count } from 'drizzle-orm';
import { db, initDB } from './db/index';
import { users, profile, webpages, files, siteSettings } from './db/schema';
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
app.use(express.static(path.join(__dirname, '..', 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }
}));

// ---------------- AUTH ROUTES ----------------
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  try {
    const userList = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (userList.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = userList[0];
    const match = await bcrypt.compare(password, user.passwordHash);
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
    const result = await db.select().from(siteSettings).limit(1);
    const s = result[0];
    if (!s) {
      res.json({});
      return;
    }
    res.json({
      id: s.id,
      hero_badge: s.heroBadge,
      hero_title_prefix: s.heroTitlePrefix,
      hero_title_highlight: s.heroTitleHighlight,
      hero_title_suffix: s.heroTitleSuffix,
      hero_description: s.heroDescription,
      hero_cta_primary: s.heroCtaPrimary,
      hero_cta_secondary: s.heroCtaSecondary,
      wallet_card_label: s.walletCardLabel,
      wallet_protocol_tag: s.walletProtocolTag,
      footer_brand: s.footerBrand,
      footer_tagline: s.footerTagline,
      footer_links: s.footerLinks,
      footer_text: s.footerText,
      updated_at: s.updatedAt,
    });
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
    footer_brand,
    footer_tagline,
    footer_links,
    footer_text
  } = req.body;

  try {
    const existing = await db.select().from(siteSettings).limit(1);
    let updated;
    if (existing.length === 0) {
      const inserted = await db.insert(siteSettings).values({
        heroBadge: hero_badge,
        heroTitlePrefix: hero_title_prefix,
        heroTitleHighlight: hero_title_highlight,
        heroTitleSuffix: hero_title_suffix,
        heroDescription: hero_description,
        heroCtaPrimary: hero_cta_primary,
        heroCtaSecondary: hero_cta_secondary,
        walletCardLabel: wallet_card_label,
        walletProtocolTag: wallet_protocol_tag,
        footerBrand: footer_brand,
        footerTagline: footer_tagline,
        footerLinks: footer_links,
        footerText: footer_text,
      }).returning();
      updated = inserted[0];
    } else {
      const resUpdated = await db.update(siteSettings).set({
        heroBadge: hero_badge ?? existing[0].heroBadge,
        heroTitlePrefix: hero_title_prefix ?? existing[0].heroTitlePrefix,
        heroTitleHighlight: hero_title_highlight ?? existing[0].heroTitleHighlight,
        heroTitleSuffix: hero_title_suffix ?? existing[0].heroTitleSuffix,
        heroDescription: hero_description ?? existing[0].heroDescription,
        heroCtaPrimary: hero_cta_primary ?? existing[0].heroCtaPrimary,
        heroCtaSecondary: hero_cta_secondary ?? existing[0].heroCtaSecondary,
        walletCardLabel: wallet_card_label ?? existing[0].walletCardLabel,
        walletProtocolTag: wallet_protocol_tag ?? existing[0].walletProtocolTag,
        footerBrand: footer_brand ?? existing[0].footerBrand,
        footerTagline: footer_tagline ?? existing[0].footerTagline,
        footerLinks: footer_links ?? existing[0].footerLinks,
        footerText: footer_text ?? existing[0].footerText,
        updatedAt: new Date(),
      }).where(eq(siteSettings.id, existing[0].id)).returning();
      updated = resUpdated[0];
    }

    res.json({
      id: updated.id,
      hero_badge: updated.heroBadge,
      hero_title_prefix: updated.heroTitlePrefix,
      hero_title_highlight: updated.heroTitleHighlight,
      hero_title_suffix: updated.heroTitleSuffix,
      hero_description: updated.heroDescription,
      hero_cta_primary: updated.heroCtaPrimary,
      hero_cta_secondary: updated.heroCtaSecondary,
      wallet_card_label: updated.walletCardLabel,
      wallet_protocol_tag: updated.walletProtocolTag,
      footer_brand: updated.footerBrand,
      footer_tagline: updated.footerTagline,
      footer_links: updated.footerLinks,
      footer_text: updated.footerText,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PROFILE ROUTES ----------------
app.get('/api/profile', async (_req: Request, res: Response) => {
  try {
    const result = await db.select().from(profile).limit(1);
    const p = result[0];
    if (!p) {
      res.json(null);
      return;
    }
    res.json({
      id: p.id,
      name: p.name,
      title: p.title,
      bio: p.bio,
      avatar_url: p.avatarUrl,
      email: p.email,
      phone_number: p.phoneNumber,
      whatsapp_number: p.whatsappNumber,
      github_url: p.githubUrl,
      linkedin_url: p.linkedinUrl,
      twitter_url: p.twitterUrl,
      instagram_url: p.instagramUrl,
      telegram_url: p.telegramUrl,
      website_url: p.websiteUrl,
      skills: p.skills,
      updated_at: p.updatedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    name,
    title,
    bio,
    avatar_url,
    email,
    phone_number,
    whatsapp_number,
    github_url,
    linkedin_url,
    twitter_url,
    instagram_url,
    telegram_url,
    website_url,
    skills
  } = req.body;
  try {
    const existing = await db.select().from(profile).limit(1);
    let updated;
    if (existing.length === 0) {
      const inserted = await db.insert(profile).values({
        name,
        title,
        bio,
        avatarUrl: avatar_url,
        email,
        phoneNumber: phone_number,
        whatsappNumber: whatsapp_number,
        githubUrl: github_url,
        linkedinUrl: linkedin_url,
        twitterUrl: twitter_url,
        instagramUrl: instagram_url,
        telegramUrl: telegram_url,
        websiteUrl: website_url,
        skills: skills || [],
      }).returning();
      updated = inserted[0];
    } else {
      const resUpdated = await db.update(profile).set({
        name: name ?? existing[0].name,
        title: title ?? existing[0].title,
        bio: bio ?? existing[0].bio,
        avatarUrl: avatar_url ?? existing[0].avatarUrl,
        email: email ?? existing[0].email,
        phoneNumber: phone_number ?? existing[0].phoneNumber,
        whatsappNumber: whatsapp_number ?? existing[0].whatsappNumber,
        githubUrl: github_url ?? existing[0].githubUrl,
        linkedinUrl: linkedin_url ?? existing[0].linkedinUrl,
        twitterUrl: twitter_url ?? existing[0].twitterUrl,
        instagramUrl: instagram_url ?? existing[0].instagramUrl,
        telegramUrl: telegram_url ?? existing[0].telegramUrl,
        websiteUrl: website_url ?? existing[0].websiteUrl,
        skills: skills ?? existing[0].skills,
        updatedAt: new Date(),
      }).where(eq(profile.id, existing[0].id)).returning();
      updated = resUpdated[0];
    }

    res.json({
      id: updated.id,
      name: updated.name,
      title: updated.title,
      bio: updated.bio,
      avatar_url: updated.avatarUrl,
      email: updated.email,
      phone_number: updated.phoneNumber,
      whatsapp_number: updated.whatsappNumber,
      github_url: updated.githubUrl,
      linkedin_url: updated.linkedinUrl,
      twitter_url: updated.twitterUrl,
      instagram_url: updated.instagramUrl,
      telegram_url: updated.telegramUrl,
      website_url: updated.websiteUrl,
      skills: updated.skills,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- WEBPAGES ROUTES ----------------
app.get('/api/webpages', async (_req: Request, res: Response) => {
  try {
    const result = await db.select().from(webpages).orderBy(desc(webpages.pinned), desc(webpages.isFeatured), desc(webpages.createdAt));
    res.json(result.map(w => ({
      id: w.id,
      title: w.title,
      url: w.url,
      description: w.description,
      category: w.category,
      icon: w.icon,
      badge: w.badge,
      preview_image: w.previewImage,
      color_gradient: w.colorGradient,
      is_featured: w.isFeatured,
      pinned: w.pinned,
      created_at: w.createdAt,
      updated_at: w.updatedAt,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/webpages/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await db.select().from(webpages).where(eq(webpages.id, id)).limit(1);
    if (result.length === 0) {
      res.status(404).json({ error: 'Webpage not found' });
      return;
    }
    const w = result[0];
    res.json({
      id: w.id,
      title: w.title,
      url: w.url,
      description: w.description,
      category: w.category,
      icon: w.icon,
      badge: w.badge,
      preview_image: w.previewImage,
      color_gradient: w.colorGradient,
      is_featured: w.isFeatured,
      pinned: w.pinned,
      created_at: w.createdAt,
      updated_at: w.updatedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/webpages', authenticateToken, upload.single('preview_image_file'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, url, description, category, icon, badge, preview_image, color_gradient, is_featured, pinned } = req.body;

  if (!title || !url) {
    res.status(400).json({ error: 'Title and URL are required' });
    return;
  }

  let finalPreviewImage = preview_image || null;
  if (req.file) {
    finalPreviewImage = `/uploads/${req.file.filename}`;
  }

  try {
    const inserted = await db.insert(webpages).values({
      title,
      url,
      description: description || '',
      category: category || 'Web App',
      icon: icon || 'globe',
      badge: badge || 'Live',
      previewImage: finalPreviewImage,
      colorGradient: color_gradient || 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
      isFeatured: is_featured === true || is_featured === 'true',
      pinned: pinned === true || pinned === 'true',
    }).returning();

    const w = inserted[0];
    res.status(201).json({
      id: w.id,
      title: w.title,
      url: w.url,
      description: w.description,
      category: w.category,
      icon: w.icon,
      badge: w.badge,
      preview_image: w.previewImage,
      color_gradient: w.colorGradient,
      is_featured: w.isFeatured,
      pinned: w.pinned,
      created_at: w.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/webpages/:id', authenticateToken, upload.single('preview_image_file'), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { title, url, description, category, icon, badge, preview_image, color_gradient, is_featured, pinned } = req.body;

  let finalPreviewImage = preview_image !== undefined ? preview_image : null;
  if (req.file) {
    finalPreviewImage = `/uploads/${req.file.filename}`;
  }

  try {
    const existing = await db.select().from(webpages).where(eq(webpages.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: 'Webpage not found' });
      return;
    }

    const updated = await db.update(webpages).set({
      title: title ?? existing[0].title,
      url: url ?? existing[0].url,
      description: description ?? existing[0].description,
      category: category ?? existing[0].category,
      icon: icon ?? existing[0].icon,
      badge: badge ?? existing[0].badge,
      previewImage: finalPreviewImage !== null ? finalPreviewImage : existing[0].previewImage,
      colorGradient: color_gradient ?? existing[0].colorGradient,
      isFeatured: is_featured !== undefined ? (is_featured === true || is_featured === 'true') : existing[0].isFeatured,
      pinned: pinned !== undefined ? (pinned === true || pinned === 'true') : existing[0].pinned,
      updatedAt: new Date(),
    }).where(eq(webpages.id, id)).returning();

    const w = updated[0];
    res.json({
      id: w.id,
      title: w.title,
      url: w.url,
      description: w.description,
      category: w.category,
      icon: w.icon,
      badge: w.badge,
      preview_image: w.previewImage,
      color_gradient: w.colorGradient,
      is_featured: w.isFeatured,
      pinned: w.pinned,
      updated_at: w.updatedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/webpages/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    const deleted = await db.delete(webpages).where(eq(webpages.id, id)).returning({ id: webpages.id, previewImage: webpages.previewImage });
    if (deleted.length === 0) {
      res.status(404).json({ error: 'Webpage not found' });
      return;
    }

    const preview = deleted[0].previewImage;
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
    const result = await db.select().from(files).orderBy(desc(files.createdAt));
    res.json(result.map(f => ({
      id: f.id,
      title: f.title,
      original_name: f.originalName,
      filename: f.filename,
      file_size: f.fileSize,
      mime_type: f.mimeType,
      category: f.category,
      description: f.description,
      downloads: f.downloads,
      created_at: f.createdAt,
    })));
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
    const inserted = await db.insert(files).values({
      title: title || original_name,
      originalName: original_name,
      filename,
      filepath,
      fileSize: file_size,
      mimeType: mime_type,
      category: category || 'Document',
      description: description || '',
      downloads: 0,
    }).returning();

    const f = inserted[0];
    res.status(201).json({
      id: f.id,
      title: f.title,
      original_name: f.originalName,
      filename: f.filename,
      file_size: f.fileSize,
      mime_type: f.mimeType,
      category: f.category,
      description: f.description,
      created_at: f.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/files/:id/download', async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
    if (result.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const file = result[0];
    const physicalPath = path.join(uploadsDir, file.filename);

    if (!fs.existsSync(physicalPath)) {
      res.status(404).json({ error: 'File missing from storage' });
      return;
    }

    db.update(files).set({ downloads: sql`${files.downloads} + 1` }).where(eq(files.id, id)).catch(console.error);
    res.download(physicalPath, file.originalName);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/files/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    const deleted = await db.delete(files).where(eq(files.id, id)).returning({ filename: files.filename });
    if (deleted.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const filename = deleted[0].filename;
    const physicalPath = path.join(uploadsDir, filename);
    if (fs.existsSync(physicalPath)) {
      try { fs.unlinkSync(physicalPath); } catch (e) {}
    }

    res.json({ message: 'File deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- STATS ROUTE ----------------
app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const webCount = await db.select({ val: count() }).from(webpages);
    const fileStats = await db.select({
      count: count(),
      totalSize: sql<number>`coalesce(sum(${files.fileSize}), 0)`,
      totalDownloads: sql<number>`coalesce(sum(${files.downloads}), 0)`
    }).from(files);

    res.json({
      totalWebpages: Number(webCount[0].val),
      totalFiles: Number(fileStats[0].count),
      totalSize: Number(fileStats[0].totalSize),
      totalDownloads: Number(fileStats[0].totalDownloads),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// HTML routes
app.get('/about', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'public', 'about.html'));
});

app.get('/login', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.get('/admin', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Bootstrap
async function bootstrap() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`Server running with Drizzle ORM at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
