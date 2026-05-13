import { Pool, QueryResult } from 'pg';

// Singleton bağlantı havuzu
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Beklenmeyen bağlantı hatası:', err);
    });
  }
  return pool;
}

/**
 * Doğrudan SQL sorgusu çalıştır.
 */
export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`[DB] Yavaş sorgu (${duration}ms): ${text.substring(0, 80)}...`);
  }
  return result;
}

/**
 * Tek satır dönen sorgular için yardımcı.
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

/**
 * Çoklu satır dönen sorgular için yardımcı.
 */
export async function queryMany<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

export default { query, queryOne, queryMany };
