import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema.js';

let connection: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getPostgresConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (!connection) {
    connection = postgres(process.env.DATABASE_URL, {
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  if (!db) {
    db = drizzle(connection, { schema });
  }

  return db;
}

export async function initializePostgresDatabase() {
  try {
    console.log('🔄 Initializing PostgreSQL database...');
    
    const db = getPostgresConnection();
    
    // Test connection
    await db.execute(sql`SELECT 1`);
    
    console.log('✅ PostgreSQL database connected successfully');
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL database:', error);
    throw error;
  }
}

export async function closePostgresConnection() {
  if (connection) {
    await connection.end();
    connection = null;
    db = null;
  }
}