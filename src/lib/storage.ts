import * as Minio from "minio";

/**
 * MinIO nesne depolama entegrasyonu.
 *
 * Tüm dosya yüklemeleri MinIO'ya (assets.sivas.bel.tr) `<bucket>/itfaiye/<klasör>/`
 * altına yapılır. Erişim: https://assets.sivas.bel.tr/<bucket>/itfaiye/<klasör>/<dosya>
 *
 * Yapılandırma ortam değişkenleriyle (varsayılanlar üretim değerleridir):
 *   MINIO_ENDPOINT     (varsayılan: assets.sivas.bel.tr)
 *   MINIO_PORT         (varsayılan: 443)
 *   MINIO_USE_SSL      (varsayılan: true)
 *   MINIO_BUCKET       (varsayılan: public)
 *   MINIO_PUBLIC_URL   (varsayılan: https://<endpoint>)
 *   MINIO_ACCESS_KEY   (zorunlu)
 *   MINIO_SECRET_KEY   (zorunlu)
 */

const ENDPOINT = process.env.MINIO_ENDPOINT || "assets.sivas.bel.tr";
const USE_SSL = (process.env.MINIO_USE_SSL || "true") !== "false";
const PORT = parseInt(process.env.MINIO_PORT || (USE_SSL ? "443" : "80"), 10);
export const MINIO_BUCKET = process.env.MINIO_BUCKET || "public";
const PUBLIC_BASE = (process.env.MINIO_PUBLIC_URL || `https://${ENDPOINT}`).replace(/\/$/, "");
const KOK_PREFIX = "itfaiye"; // tüm dosyalar bu önek altına

let _client: Minio.Client | null = null;

function getClient(): Minio.Client {
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error("MinIO kimlik bilgileri (MINIO_ACCESS_KEY / MINIO_SECRET_KEY) tanımlı değil.");
  }
  if (!_client) {
    _client = new Minio.Client({ endPoint: ENDPOINT, port: PORT, useSSL: USE_SSL, accessKey, secretKey });
  }
  return _client;
}

/**
 * Bir dosyayı MinIO'ya yükler ve herkese açık URL'sini döndürür.
 * @param folder mantıksal klasör (incidents, certificates, arizalar, telsiz-ses, ...)
 * @param fileName benzersiz dosya adı (uzantı dahil)
 */
export async function uploadToMinio(
  folder: string,
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const safeFolder = (folder || "general").replace(/[^a-zA-Z0-9_-]/g, "") || "general";
  const key = `${KOK_PREFIX}/${safeFolder}/${fileName}`;
  await getClient().putObject(MINIO_BUCKET, key, buffer, buffer.length, {
    "Content-Type": contentType || "application/octet-stream",
  });
  return `${PUBLIC_BASE}/${MINIO_BUCKET}/${key}`;
}
