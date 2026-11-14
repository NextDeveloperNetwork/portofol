import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Profile table
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        title VARCHAR(200) NOT NULL,
        bio TEXT,
        avatar_url TEXT,
        email VARCHAR(200),
        github_url TEXT,
        linkedin_url TEXT,
        twitter_url TEXT,
        skills JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Webpages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS webpages (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'Web App',
        icon VARCHAR(100) DEFAULT 'globe',
        badge VARCHAR(50) DEFAULT 'Live',
        preview_image TEXT,
        color_gradient VARCHAR(100) DEFAULT 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
        is_featured BOOLEAN DEFAULT false,
        pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Files table
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        filepath TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100),
        category VARCHAR(100) DEFAULT 'Document',
        description TEXT,
        downloads INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Site settings table (Editable landing page info)
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        hero_badge VARCHAR(255) DEFAULT 'Personal Multi-Asset Web Vault',
        hero_title_prefix VARCHAR(255) DEFAULT 'All My',
        hero_title_highlight VARCHAR(255) DEFAULT 'Webpages & Files',
        hero_title_suffix VARCHAR(255) DEFAULT 'In One Clean Vault',
        hero_description TEXT DEFAULT 'An interactive, high-performance personal wallet holding my live web applications, digital tools, and downloadable documents. Built with TypeScript and PostgreSQL.',
        hero_cta_primary VARCHAR(100) DEFAULT 'Explore Vault',
        hero_cta_secondary VARCHAR(100) DEFAULT 'About Creator',
        wallet_card_label VARCHAR(100) DEFAULT 'TOTAL ASSET BALANCE',
        wallet_protocol_tag VARCHAR(100) DEFAULT 'PG-TS-V2',
        footer_text TEXT DEFAULT '© 2026 Adenisa • Personal Digital Asset Wallet • Powered by TypeScript & PostgreSQL',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Admin user initialization
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const existingAdmin = await client.query('SELECT id FROM users WHERE username = $1', [adminUser]);

    if (existingAdmin.rows.length === 0) {
      const hash = await bcrypt.hash(adminPass, 10);
      await client.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
        [adminUser, hash]
      );
    }

    // Default site settings
    const existingSettings = await client.query('SELECT id FROM site_settings LIMIT 1');
    if (existingSettings.rows.length === 0) {
      await client.query(`
        INSERT INTO site_settings (
          hero_badge, hero_title_prefix, hero_title_highlight, hero_title_suffix,
          hero_description, hero_cta_primary, hero_cta_secondary, wallet_card_label, wallet_protocol_tag, footer_text
        ) VALUES (
          'Personal Multi-Asset Web Vault',
          'All My',
          'Webpages & Files',
          'In One Clean Vault',
          'An interactive, high-performance personal wallet holding my live web applications, digital tools, and downloadable documents. Built with TypeScript and PostgreSQL.',
          'Explore Vault',
          'About Creator',
          'TOTAL ASSET BALANCE',
          'PG-TS-V2',
          '© 2026 Adenisa • Personal Digital Asset Wallet • Powered by TypeScript & PostgreSQL'
        );
      `);
    }

    // Initialize profile if none exists
    const existingProfile = await client.query('SELECT id FROM profile LIMIT 1');
    if (existingProfile.rows.length === 0) {
      const skills = [
        'TypeScript', 'Node.js', 'PostgreSQL', 'Modern UI/UX',
        'CSS Architecture', 'Full-Stack Engineering', 'API Design', 'DevOps'
      ];
      await client.query(
        `INSERT INTO profile (name, title, bio, email, github_url, linkedin_url, twitter_url, skills)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'Adenisa',
          'Full-Stack Developer & Software Architect',
          'Passionate software craftsman building resilient web ecosystems, modern user interfaces, and scalable backends. Welcome to my personal digital wallet - an interactive vault of my curated web applications, public tools, and digital documents.',
          'adenisa@example.com',
          'https://github.com',
          'https://linkedin.com',
          'https://x.com',
          JSON.stringify(skills)
        ]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
}
