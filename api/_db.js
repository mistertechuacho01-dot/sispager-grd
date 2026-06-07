/**
 * SISPAGER-GRD — Neon Postgres Database Connection
 * Creates tables on first run (idempotent).
 */
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

let sql = null;

function getDB() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set. Configure Neon Postgres in Vercel Storage.');
  }
  if (!sql) {
    sql = neon(process.env.POSTGRES_URL);
  }
  return sql;
}

let dbInitialized = false;

/**
 * Initializes all database tables and seeds the default ADMIN user.
 * Safe to call multiple times (uses CREATE TABLE IF NOT EXISTS).
 */
export async function initDB() {
  if (dbInitialized) return;
  const db = getDB();

  // Users table
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      username    VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name   VARCHAR(255),
      role        VARCHAR(50)  NOT NULL DEFAULT 'collaborator',
      region      VARCHAR(100),
      email       VARCHAR(255),
      active      BOOLEAN      NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;

  // Records table
  await db`
    CREATE TABLE IF NOT EXISTS records (
      id                    SERIAL PRIMARY KEY,
      user_id               INTEGER REFERENCES users(id) ON DELETE SET NULL,
      author_name           VARCHAR(255),
      user_name             VARCHAR(255),
      date                  DATE,
      region                VARCHAR(100),
      province              VARCHAR(100),
      district              VARCHAR(100),
      subprocess            VARCHAR(255),
      problem               TEXT,
      impact                TEXT,
      lesson                TEXT,
      lesson_learned        TEXT,
      recommendations       TEXT,
      check_procedure       BOOLEAN DEFAULT false,
      check_normative       BOOLEAN DEFAULT false,
      check_diffusion       BOOLEAN DEFAULT false,
      check_instructive     BOOLEAN DEFAULT false,
      check_coordinate      BOOLEAN DEFAULT false,
      coordinate_with       TEXT,
      check_convene         BOOLEAN DEFAULT false,
      convene_entities      TEXT,
      other_recommendation  TEXT,
      approved_by           VARCHAR(255),
      electronic_signature  VARCHAR(255),
      audit_trail           JSONB    NOT NULL DEFAULT '[]'::jsonb,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Login attempts table (for rate limiting persistence)
  await db`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id           SERIAL PRIMARY KEY,
      username     VARCHAR(100),
      ip           VARCHAR(100),
      attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Auto-clean old login attempts
  await db`
    DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour'
  `.catch(() => {});

  // Seed default ADMIN user if not exists
  const admins = await db`
    SELECT id FROM users WHERE username = 'ADMIN' LIMIT 1
  `;
  if (admins.length === 0) {
    const hash = await bcrypt.hash('ADMIN123', 12);
    await db`
      INSERT INTO users (username, password_hash, full_name, role, region, email, active)
      VALUES ('ADMIN', ${hash}, 'ADMINISTRADOR', 'admin', 'LIMA', 'ADMIN@SISPAGER.GOB.PE', true)
    `;
    console.log('[SISPAGER-GRD] Default ADMIN user created in Postgres.');
  }

  dbInitialized = true;
  console.log('[SISPAGER-GRD] Database initialized.');
}

export { getDB as sql };
export default getDB;
