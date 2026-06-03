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
  'staff_certifications', 'vw_expiring_certifications', 'unified_system_logs', 'daily_vehicle_checks',
  'role_permissions', 'duty_logs', 'arac_bakim_gecmisi'
];

async function ensureRolePermissionsTableExists() {
  try {
    // Tablo oluştur
    await query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        rol TEXT NOT NULL,
        sayfa_id TEXT NOT NULL,
        izinli BOOLEAN NOT NULL DEFAULT true,
        UNIQUE(rol, sayfa_id)
      )
    `);

    // Tabloda veri var mı kontrol et ve seed/eksik kayıtları tamamla
    // 5 rol: 'Müdür', 'Amir', 'Çavuş', 'Santral', 'Er'
    // 5 sayfa_id: 'harita', 'personel_yonetimi', 'arac_bakim', 'envanter', 'raporlar'
    const defaultPermissions = [
      // Müdür (Her şeye izinli)
      { rol: 'Müdür', sayfa_id: 'harita', izinli: true },
      { rol: 'Müdür', sayfa_id: 'personel_yonetimi', izinli: true },
      { rol: 'Müdür', sayfa_id: 'arac_bakim', izinli: true },
      { rol: 'Müdür', sayfa_id: 'envanter', izinli: true },
      { rol: 'Müdür', sayfa_id: 'raporlar', izinli: true },
      { rol: 'Müdür', sayfa_id: 'egitimler', izinli: true },
      { rol: 'Müdür', sayfa_id: 'hizmet_basvurulari', izinli: true },
      { rol: 'Müdür', sayfa_id: 'gorevler', izinli: true },

      // Amir
      { rol: 'Amir', sayfa_id: 'harita', izinli: true },
      { rol: 'Amir', sayfa_id: 'personel_yonetimi', izinli: true },
      { rol: 'Amir', sayfa_id: 'arac_bakim', izinli: true },
      { rol: 'Amir', sayfa_id: 'envanter', izinli: true },
      { rol: 'Amir', sayfa_id: 'raporlar', izinli: true },
      { rol: 'Amir', sayfa_id: 'egitimler', izinli: true },
      { rol: 'Amir', sayfa_id: 'hizmet_basvurulari', izinli: true },
      { rol: 'Amir', sayfa_id: 'gorevler', izinli: true },

      // Çavuş
      { rol: 'Çavuş', sayfa_id: 'harita', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'personel_yonetimi', izinli: false },
      { rol: 'Çavuş', sayfa_id: 'arac_bakim', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'envanter', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'raporlar', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'egitimler', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'hizmet_basvurulari', izinli: true },
      { rol: 'Çavuş', sayfa_id: 'gorevler', izinli: true },

      // Santral
      { rol: 'Santral', sayfa_id: 'harita', izinli: true },
      { rol: 'Santral', sayfa_id: 'personel_yonetimi', izinli: false },
      { rol: 'Santral', sayfa_id: 'arac_bakim', izinli: false },
      { rol: 'Santral', sayfa_id: 'envanter', izinli: false },
      { rol: 'Santral', sayfa_id: 'raporlar', izinli: true },
      { rol: 'Santral', sayfa_id: 'egitimler', izinli: false },
      { rol: 'Santral', sayfa_id: 'hizmet_basvurulari', izinli: true },
      { rol: 'Santral', sayfa_id: 'gorevler', izinli: true },

      // Er
      { rol: 'Er', sayfa_id: 'harita', izinli: true },
      { rol: 'Er', sayfa_id: 'personel_yonetimi', izinli: false },
      { rol: 'Er', sayfa_id: 'arac_bakim', izinli: false },
      { rol: 'Er', sayfa_id: 'envanter', izinli: true },
      { rol: 'Er', sayfa_id: 'raporlar', izinli: false },
      { rol: 'Er', sayfa_id: 'egitimler', izinli: false },
      { rol: 'Er', sayfa_id: 'hizmet_basvurulari', izinli: true },
      { rol: 'Er', sayfa_id: 'gorevler', izinli: true }
    ];

    for (const p of defaultPermissions) {
      await query(
        'INSERT INTO role_permissions (rol, sayfa_id, izinli) VALUES ($1, $2, $3) ON CONFLICT (rol, sayfa_id) DO NOTHING',
        [p.rol, p.sayfa_id, p.izinli]
      );
    }
  } catch (err) {
    console.error('ensureRolePermissionsTableExists hatası:', err);
  }
}

async function ensureDutyLogsTableExists() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS duty_logs (
        id SERIAL PRIMARY KEY,
        sicil_no TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION
      )
    `);
  } catch (err) {
    console.error('ensureDutyLogsTableExists hatası:', err);
  }
}

async function ensureVehicleColumnsExist() {
  try {
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS marka VARCHAR;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS istasyon TEXT;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS yil INTEGER;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS model TEXT;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS su_kapasite INTEGER DEFAULT 0;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS kopuk_kapasite INTEGER DEFAULT 0;`);
    await query(`ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS next_inspection_date DATE;`);
    await query(`UPDATE public.vehicles SET next_inspection_date = "muayeneBitis" WHERE next_inspection_date IS NULL AND "muayeneBitis" IS NOT NULL;`);
  } catch (err) {
    console.error('ensureVehicleColumnsExist hatası:', err);
  }
}

async function ensureAracBakimGecmisiTableExists() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS public.arac_bakim_gecmisi (
        id SERIAL PRIMARY KEY,
        plaka VARCHAR(15) NOT NULL,
        tarih DATE NOT NULL,
        tip VARCHAR(50) NOT NULL, -- 'tamir' veya 'yag_bakimi'
        aciklama TEXT NOT NULL,
        maliyet NUMERIC(10, 2) DEFAULT 0,
        durum VARCHAR(20) DEFAULT 'Onaylandı',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE public.arac_bakim_gecmisi ADD COLUMN IF NOT EXISTS durum VARCHAR(20) DEFAULT 'Onaylandı'`);
    await query(`CREATE INDEX IF NOT EXISTS idx_arac_bakim_gecmisi_plaka ON public.arac_bakim_gecmisi(plaka)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_arac_bakim_gecmisi_tarih ON public.arac_bakim_gecmisi(tarih DESC)`);
  } catch (err: unknown) {
    console.error('ensureAracBakimGecmisiTableExists hatası:', err);
  }
}

async function ensureUnifiedSystemLogsViewExists() {
  try {
    await query(`
      CREATE OR REPLACE VIEW public.unified_system_logs AS
      SELECT 
        id, 
        created_at AS tarih, 
        plaka, 
        'Günlük Kontrol' AS islem_tipi, 
        kontrol_eden_sicil AS sicil, 
        kontrol_eden_ad AS ad_soyad,
        (CASE 
          WHEN yakit_durumu IN ('Boş', 'Az') 
            OR su_durumu IN ('Boş', 'Az') 
            OR kopuk_durumu IN ('Boş', 'Az') 
            OR pompa_durumu = 'Arızalı' 
            OR lastik_durumu = 'Kötü' 
            OR far_durumu = 'Arızalı' 
            OR genel_temizlik = 'Kötü'
          THEN 'Sorunlu' 
          ELSE 'Kusursuz' 
        END) AS durum, 
        notlar AS detaylar
      FROM public.daily_vehicle_checks
      
      UNION ALL
      
      SELECT 
        id, 
        created_at AS tarih, 
        plaka, 
        'Envanter Sayımı' AS islem_tipi, 
        kontrol_eden AS sicil, 
        kontrol_eden AS ad_soyad,
        (CASE WHEN yeni_durum IN ('Eksik', 'Arızalı') THEN 'Sorunlu' ELSE 'Kusursuz' END) AS durum, 
        CONCAT(bolme, ' - ', malzeme, ' (', yeni_durum, ')', COALESCE(' - Not: ' || notlar, '')) AS detaylar
      FROM public.inventory_checks

      UNION ALL

      SELECT 
        id, 
        created_at AS tarih, 
        '-' AS plaka, 
        (CASE WHEN action_type = 'nobet_baslangic' THEN 'Nöbet Başlangıcı' ELSE 'Nöbet Bitişi' END) AS islem_tipi, 
        actor_sicil_no AS sicil, 
        actor_name AS ad_soyad, 
        'Kusursuz' AS durum, 
        CONCAT(target, COALESCE(' - Cihaz: ' || (details->>'cihaz'), ''), COALESCE(' - Geofence: ' || (details->>'geofence'), '')) AS detaylar
      FROM public.audit_logs
      WHERE action_type IN ('nobet_baslangic', 'nobet_bitis')
    `);
  } catch (err: unknown) {
    console.error('ensureUnifiedSystemLogsViewExists hatası:', err);
  }
}

async function autoSeedVehiclesIfEmpty() {
  try {
    const countRes = await query('SELECT COUNT(*) FROM vehicles');
    const count = parseInt(countRes.rows[0]?.count || '0', 10);
    if (count === 0) {
      const { mockVehicles } = await import('@/lib/data');
      for (const v of mockVehicles) {
        await query(
          'INSERT INTO vehicles (plaka, arac_tipi, marka, durum, bolmeler, km, "motorSaatiPTO", "sigortaBitis", "muayeneBitis", next_inspection_date, istasyon, yil, model) ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ' +
          'ON CONFLICT (plaka) DO NOTHING',
          [
            v.plaka,
            v.arac_tipi || v.aracTipi,
            v.marka || null,
            v.durum || 'aktif',
            JSON.stringify(v.bolmeler),
            v.km || 0,
            v.motorSaatiPTO || 0,
            v.sigortaBitis || null,
            v.muayeneBitis || null,
            v.muayeneBitis || null,
            v.istasyon || null,
            v.yil || null,
            v.model || null
          ]
        );
      }
      console.log('✓ 18 taktik araç başarıyla seed edildi.');
    }
  } catch (err) {
    console.error('autoSeedVehiclesIfEmpty hatası:', err);
  }
}



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
  let currentIdx = startIdx;
  
  filters.forEach((f) => {
    // Column name sanitization
    const col = f.column.replace(/[^a-zA-Z0-9_"]/g, '');
    switch (f.op) {
      case 'in':
        const vals = f.value.split(',');
        const placeholders = vals.map(() => `$${currentIdx++}`).join(', ');
        conditions.push(`"${col}" IN (${placeholders})`);
        params.push(...vals);
        break;
      case 'eq':
        if (f.value === 'null') { conditions.push(`"${col}" IS NULL`); }
        else { conditions.push(`"${col}" = $${currentIdx++}`); params.push(f.value); }
        break;
      case 'neq':
        if (f.value === 'null') { conditions.push(`"${col}" IS NOT NULL`); }
        else { conditions.push(`"${col}" != $${currentIdx++}`); params.push(f.value); }
        break;
      case 'gt': conditions.push(`"${col}" > $${currentIdx++}`); params.push(f.value); break;
      case 'gte': conditions.push(`"${col}" >= $${currentIdx++}`); params.push(f.value); break;
      case 'lt': conditions.push(`"${col}" < $${currentIdx++}`); params.push(f.value); break;
      case 'lte': conditions.push(`"${col}" <= $${currentIdx++}`); params.push(f.value); break;
      case 'like': conditions.push(`"${col}" LIKE $${currentIdx++}`); params.push(f.value); break;
      case 'ilike': conditions.push(`"${col}" ILIKE $${currentIdx++}`); params.push(f.value); break;
      default: conditions.push(`"${col}" = $${currentIdx++}`); params.push(f.value);
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
    if (table === 'role_permissions') {
      await ensureRolePermissionsTableExists();
    }
    if (table === 'duty_logs') {
      await ensureDutyLogsTableExists();
    }
    if (table === 'vehicles') {
      await ensureVehicleColumnsExist();
      await autoSeedVehiclesIfEmpty();
    }
    if (table === 'arac_bakim_gecmisi') {
      await ensureAracBakimGecmisiTableExists();
    }
    if (table === 'unified_system_logs') {
      await ensureUnifiedSystemLogsViewExists();
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
    if (table === 'role_permissions') {
      await ensureRolePermissionsTableExists();
    }
    if (table === 'duty_logs') {
      await ensureDutyLogsTableExists();
    }
    if (table === 'vehicles') {
      await ensureVehicleColumnsExist();
    }
    if (table === 'arac_bakim_gecmisi') {
      await ensureAracBakimGecmisiTableExists();
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

    if (table === 'duty_logs') {
      for (const row of insertedRows) {
        const actionType = row.action === 'START_DUTY' ? 'nobet_baslangic' : 'nobet_bitis';
        const details = row.action === 'START_DUTY' 
          ? { cihaz: 'Mobil/Web', tarih: new Date().toISOString(), geofence: '50m_ici' }
          : { cihaz: 'Mobil/Web', tarih: new Date().toISOString() };
        
        await query(
          `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            actionType,
            session.sicilNo,
            `${session.ad} ${session.soyad}`,
            'Merkez İstasyonu',
            JSON.stringify(details)
          ]
        ).catch((err: unknown) => console.error('[Server AuditLog] Nöbet log yazma hatası:', err));
      }
    }

    return NextResponse.json({ data: insertedRows, error: null });
  } catch (error: unknown) {
    console.error(`[db/POST] Hata:`, error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
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
    if (table === 'role_permissions') {
      await ensureRolePermissionsTableExists();
    }
    if (table === 'duty_logs') {
      await ensureDutyLogsTableExists();
    }
    if (table === 'vehicles') {
      await ensureVehicleColumnsExist();
    }
    if (table === 'arac_bakim_gecmisi') {
      await ensureAracBakimGecmisiTableExists();
    }

    const body = await request.json();
    const { data, filters } = body;

    // Fetch previous inspection date if updating next_inspection_date in vehicles table
    let oldInspectionDate: string | null = null;
    if (table === 'vehicles' && data && data.next_inspection_date !== undefined) {
      const plaka = filters?.plaka;
      if (plaka) {
        try {
          const oldRowRes = await query('SELECT next_inspection_date, "muayeneBitis" FROM vehicles WHERE plaka = $1', [plaka]);
          if (oldRowRes.rows[0]) {
            oldInspectionDate = oldRowRes.rows[0].next_inspection_date || oldRowRes.rows[0].muayeneBitis || null;
          }
        } catch (e) {
          console.error('[Server AuditLog] Eski muayene tarihi okuma hatası:', e);
        }
      }
    }

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

    // Dynamic Server-Side Audit Log hooks for vehicles next_inspection_date update
    if (table === 'vehicles' && result.rows[0] && data && data.next_inspection_date !== undefined) {
      const row = result.rows[0];
      const formatToISO = (d: any) => {
        if (!d) return 'Tarih Girilmedi';
        try {
          return new Date(d).toISOString().split('T')[0];
        } catch {
          return 'Tarih Girilmedi';
        }
      };
      const eski_tarih = formatToISO(oldInspectionDate);
      const yeni_tarih = formatToISO(row.next_inspection_date);
      
      await query(
        `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'arac_muayene_guncelleme',
          session.sicilNo || 'SYSTEM',
          `${session.ad || ''} ${session.soyad || ''}`.trim() || 'Sistem',
          row.plaka,
          JSON.stringify({ eski_tarih, yeni_tarih })
        ]
      ).catch(err => console.error('[Server AuditLog] Araç muayene log yazma hatası:', err));
    }

    // 6. Dynamic Server-Side Audit Log hooks for fire_hydrants status update
    if (table === 'fire_hydrants' && result.rows[0]) {
      const row = result.rows[0];
      await query(
        `INSERT INTO audit_logs (action_type, actor_sicil_no, actor_name, target, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'hydrant_status_change',
          session.sicilNo,
          `${session.ad} ${session.soyad}`,
          String(row.id || row.no || ''),
          JSON.stringify({ id: row.id, no: row.no, newStatus: row.durum, tarih: new Date().toISOString() })
        ]
      ).catch(err => console.error('[Server AuditLog] Hidrant log yazma hatası:', err));
    }

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
    if (table === 'role_permissions') {
      await ensureRolePermissionsTableExists();
    }
    if (table === 'duty_logs') {
      await ensureDutyLogsTableExists();
    }
    if (table === 'arac_bakim_gecmisi') {
      await ensureAracBakimGecmisiTableExists();
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
