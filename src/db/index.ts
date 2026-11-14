import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import * as schema from './schema';
import { users, profile, webpages, siteSettings } from './schema';
import { eq, count } from 'drizzle-orm';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export async function initDB() {
  const client = await pool.connect();
  try {
    // Ensure base tables exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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

    // Verify if default admin user exists in DB; if empty, seed initial user without reading .env
    const userCount = await db.select({ value: count() }).from(users);
    if (userCount[0].value === 0) {
      const defaultHash = await bcrypt.hash('admin123', 10);
      await db.insert(users).values({
        username: 'admin',
        passwordHash: defaultHash,
      });
      console.log('Drizzle: Seeded initial admin user (admin) in PostgreSQL');
    }

    // Verify site settings
    const settingsCount = await db.select({ value: count() }).from(siteSettings);
    if (settingsCount[0].value === 0) {
      await db.insert(siteSettings).values({
        heroBadge: 'Personal Multi-Asset Web Vault',
        heroTitlePrefix: 'All My',
        heroTitleHighlight: 'Webpages & Files',
        heroTitleSuffix: 'In One Clean Vault',
        heroDescription: 'An interactive, high-performance personal wallet holding my live web applications, digital tools, and downloadable documents. Built with TypeScript and PostgreSQL.',
        heroCtaPrimary: 'Explore Vault',
        heroCtaSecondary: 'About Creator',
        walletCardLabel: 'TOTAL ASSET BALANCE',
        walletProtocolTag: 'PG-TS-V2',
        footerText: '© 2026 Adenisa • Personal Digital Asset Wallet • Powered by TypeScript & PostgreSQL',
      });
    }

    // Verify profile
    const profileCount = await db.select({ value: count() }).from(profile);
    if (profileCount[0].value === 0) {
      const skills = [
        'TypeScript', 'Node.js', 'PostgreSQL', 'Drizzle ORM',
        'CSS Architecture', 'Full-Stack Engineering', 'API Design', 'DevOps'
      ];
      await db.insert(profile).values({
        name: 'Adenisa',
        title: 'Full-Stack Developer & Software Architect',
        bio: 'Passionate software craftsman building resilient web ecosystems, modern user interfaces, and scalable backends. Welcome to my personal digital wallet - an interactive vault of my curated web applications, public tools, and digital documents.',
        email: 'adenisa@example.com',
        githubUrl: 'https://github.com',
        linkedinUrl: 'https://linkedin.com',
        twitterUrl: 'https://x.com',
        skills: skills,
      });
    }

    console.log('Drizzle ORM & PostgreSQL connected successfully');
  } finally {
    client.release();
  }
}

