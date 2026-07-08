let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getN2MobilToken(): Promise<string | null> {
  // If we have a valid token, return it
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  // Clear expired token
  cachedToken = null;

  const username = process.env.N2_USERNAME;
  const password = process.env.N2_PASSWORD;
  
  // If no credentials, try to fallback to the static token for backwards compatibility
  if (!username || !password) {
    console.warn('[N2Mobil Auth] N2_USERNAME or N2_PASSWORD missing in .env, falling back to static N2MOBIL_TOKEN');
    return process.env.N2MOBIL_TOKEN || null;
  }

  try {
    const res = await fetch('https://api.wetrack.tech/auth/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      throw new Error(`Auth API returned status: ${res.status}`);
    }

    const data = await res.json();
    if (data && data.token) {
      cachedToken = data.token;
      
      // Decode JWT to get expiration, or just assume a safe default
      try {
        const payloadBase64 = data.token.split('.')[1];
        if (payloadBase64) {
          const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf-8');
          const payload = JSON.parse(payloadStr);
          if (payload.exp) {
             // exp is usually in seconds
             tokenExpiresAt = (payload.exp * 1000) - 300000; // 5 minutes before expiration
          } else {
             tokenExpiresAt = Date.now() + 12 * 60 * 60 * 1000; // default 12 hours
          }
        }
      } catch (e) {
         tokenExpiresAt = Date.now() + 12 * 60 * 60 * 1000; // default 12 hours
      }

      console.log('[N2Mobil Auth] Yeni JWT token basariyla alindi.');
      return cachedToken;
    } else {
      console.error('[N2Mobil Auth] Login API yanitinda token bulunamadi.');
      return process.env.N2MOBIL_TOKEN || null;
    }
  } catch (error: any) {
    console.error('[N2Mobil Auth] Token alma hatasi:', error.message);
    return process.env.N2MOBIL_TOKEN || null; // Fallback
  }
}
