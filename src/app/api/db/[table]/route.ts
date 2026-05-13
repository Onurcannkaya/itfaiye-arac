import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionFromRequest, AuthError } from '@/lib/auth';

// İzin verilen tablolar (SQL injection koruması)
const ALLOWED_TABLES = [
  'vehicles', 'personnel', 'maintenance_logs', 'fuel_logs', 'tasks',
  'task_templates', 'scba_cylinders', 'scba_fill_logs', 'incident_reports',
  'auth_logs', 'audit_logs', 'inventory_checks', 'personnel_details',
  'personnel_leaves', 'personnel_records', 'personnel_equipment',
  'incidents', 'incident_vehicles', 'incident_personnel', 'incident_media',
  'citizen_requests', 'activities_and_trainings', 'personnel_activities',
  'vehicle_maintenances', 'fire_hydrants', 'spatial_addresses',
  'staff_certifications', 'vw_expiring_certifications'
];

function parseFilters(searchParams: URLSearchParams): Array<{ column: string; op: string; value: string }> {
  const filters: Array<{ column: string; op: string; value: string }> = [];
  searchParams.getAll('filter').forEach(f => {
    const parts = f.split(':');
    if (parts.length >= 3) {
      filters.push({ column: parts[0], op: parts[1], value: parts.slice(2).join(':') });
    }
  });
  return filters;
}

function buildWhereClause(filters: Array<{ column: string; op: string; value: string }>, startIdx = 1): { clause: string; params: any[] } {
  if (filters.length === 0) return { clause: '', params: [] };
  
  const conditions: string[] = [];
  const params: any[] = [];
  
  filters.forEach((f, i) => {
    const idx = startIdx + i;
    // Column name sanitization
    const col = f.column.replace(/[^a-zA-Z0-9_"]/g, '');
    switch (f.op) {
      case 'eq': conditions.push(`"${col}" = $${idx}`); params.push(f.value); break;
      case 'neq': conditions.push(`"${col}" != $${idx}`); params.push(f.value); break;
      case 'gt': conditions.push(`"${col}" > $${idx}`); params.push(f.value); break;
      case 'gte': conditions.push(`"${col}" >= $${idx}`); params.push(f.value); break;
      case 'lt': conditions.push(`"${col}" < $${idx}`); params.push(f.value); break;
      case 'lte': conditions.push(`"${col}" <= $${idx}`); params.push(f.value); break;
      case 'like': conditions.push(`"${col}" LIKE $${idx}`); params.push(f.value); break;
      case 'ilike': conditions.push(`"${col}" ILIKE $${idx}`); params.push(f.value); break;
      default: conditions.push(`"${col}" = $${idx}`); params.push(f.value);
    }
  });

  return { clause: 'WHERE ' + conditions.join(' AND '), params };
}

/**
 * GET /api/db/[table] — SELECT
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Geçersiz tablo adı.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const select = searchParams.get('select') || '*';
    const filters = parseFilters(searchParams);
    const orderParam = searchParams.get('order');
    const limitParam = searchParams.get('limit');
    const countOnly = searchParams.get('count') === 'exact';

    const { clause, params: whereParams } = buildWhereClause(filters);

    let sql = '';
    if (countOnly) {
      sql = `SELECT COUNT(*) as count FROM ${table} ${clause}`;
    } else {
      // Select sanitization: allow * or comma-separated column names
      const safeCols = select === '*' ? '*' : select.split(',').map(c => `"${c.trim().replace(/[^a-zA-Z0-9_]/g, '')}"`).join(', ');
      sql = `SELECT ${safeCols} FROM ${table} ${clause}`;
    }

    if (orderParam) {
      const [col, dir] = orderParam.split(':');
      const safeCol = col.replace(/[^a-zA-Z0-9_"]/g, '');
      sql += ` ORDER BY "${safeCol}" ${dir === 'desc' ? 'DESC' : 'ASC'}`;
    }

    if (limitParam) {
      sql += ` LIMIT ${parseInt(limitParam, 10)}`;
    }

    const result = await query(sql, whereParams);

    if (countOnly) {
      return NextResponse.json({ count: parseInt(result.rows[0]?.count || '0', 10) });
    }

    return NextResponse.json({ data: result.rows, count: result.rowCount });
  } catch (error: any) {
    console.error(`[db/GET] Hata:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/db/[table] — INSERT / UPSERT
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    // JWT yetki kontrolü
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }

    const { table } = await params;
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Geçersiz tablo adı.' }, { status: 400 });
    }

    const body = await request.json();
    const rows = Array.isArray(body.data) ? body.data : [body.data];
    const upsert = body.upsert === true;
    const conflictColumn = body.conflictColumn;

    const insertedRows: any[] = [];

    for (const row of rows) {
      const keys = Object.keys(row);
      const safeCols = keys.map(k => `"${k.replace(/[^a-zA-Z0-9_]/g, '')}"`);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const values = keys.map(k => row[k]);

      let sql = `INSERT INTO ${table} (${safeCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
      
      if (upsert && conflictColumn) {
        const updateCols = safeCols.map((col, i) => `${col} = $${i + 1}`).join(', ');
        sql += ` ON CONFLICT ("${conflictColumn.replace(/[^a-zA-Z0-9_]/g, '')}") DO UPDATE SET ${updateCols}`;
      }

      sql += ' RETURNING *';

      const result = await query(sql, values);
      if (result.rows[0]) insertedRows.push(result.rows[0]);
    }

    return NextResponse.json({ data: insertedRows, error: null });
  } catch (error: any) {
    console.error(`[db/POST] Hata:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/db/[table] — UPDATE
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }

    const { table } = await params;
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Geçersiz tablo adı.' }, { status: 400 });
    }

    const body = await request.json();
    const { data, filters } = body;

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    Object.entries(data).forEach(([key, val]) => {
      setClauses.push(`"${key.replace(/[^a-zA-Z0-9_]/g, '')}" = $${idx}`);
      values.push(val);
      idx++;
    });

    const whereClauses: string[] = [];
    Object.entries(filters || {}).forEach(([key, val]) => {
      whereClauses.push(`"${key.replace(/[^a-zA-Z0-9_]/g, '')}" = $${idx}`);
      values.push(val);
      idx++;
    });

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const sql = `UPDATE ${table} SET ${setClauses.join(', ')} ${whereStr} RETURNING *`;

    const result = await query(sql, values);
    return NextResponse.json({ data: result.rows, error: null });
  } catch (error: any) {
    console.error(`[db/PATCH] Hata:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/db/[table] — DELETE
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }
    // Silme yetkisi sadece Admin ve Editor'da
    if (!['Admin', 'Editor'].includes(session.rol)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    const { table } = await params;
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Geçersiz tablo adı.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const filters = parseFilters(searchParams);
    
    if (filters.length === 0) {
      return NextResponse.json({ error: 'Filtre olmadan toplu silme yapılamaz.' }, { status: 400 });
    }

    const { clause, params: whereParams } = buildWhereClause(filters);
    const sql = `DELETE FROM ${table} ${clause} RETURNING *`;

    const result = await query(sql, whereParams);
    return NextResponse.json({ data: result.rows, error: null });
  } catch (error: any) {
    console.error(`[db/DELETE] Hata:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
