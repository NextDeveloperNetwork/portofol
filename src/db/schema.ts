import { pgTable, serial, varchar, text, boolean, timestamp, bigint, integer, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const profile = pgTable('profile', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  email: varchar('email', { length: 200 }),
  githubUrl: text('github_url'),
  linkedinUrl: text('linkedin_url'),
  twitterUrl: text('twitter_url'),
  skills: jsonb('skills').default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const webpages = pgTable('webpages', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  url: text('url').notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).default('Web App'),
  icon: varchar('icon', { length: 100 }).default('globe'),
  badge: varchar('badge', { length: 50 }).default('Live'),
  previewImage: text('preview_image'),
  colorGradient: varchar('color_gradient', { length: 100 }).default('linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)'),
  isFeatured: boolean('is_featured').default(false),
  pinned: boolean('pinned').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  filepath: text('filepath').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  category: varchar('category', { length: 100 }).default('Document'),
  description: text('description'),
  downloads: integer('downloads').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  heroBadge: varchar('hero_badge', { length: 255 }).default('Personal Multi-Asset Web Vault'),
  heroTitlePrefix: varchar('hero_title_prefix', { length: 255 }).default('All My'),
  heroTitleHighlight: varchar('hero_title_highlight', { length: 255 }).default('Webpages & Files'),
  heroTitleSuffix: varchar('hero_title_suffix', { length: 255 }).default('In One Clean Vault'),
  heroDescription: text('hero_description').default('An interactive, high-performance personal wallet holding my live web applications, digital tools, and downloadable documents. Built with TypeScript and PostgreSQL.'),
  heroCtaPrimary: varchar('hero_cta_primary', { length: 100 }).default('Explore Vault'),
  heroCtaSecondary: varchar('hero_cta_secondary', { length: 100 }).default('About Creator'),
  walletCardLabel: varchar('wallet_card_label', { length: 100 }).default('TOTAL ASSET BALANCE'),
  walletProtocolTag: varchar('wallet_protocol_tag', { length: 100 }).default('PG-TS-V2'),
  footerText: text('footer_text').default('© 2026 Adenisa • Personal Digital Asset Wallet • Powered by TypeScript & PostgreSQL'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

