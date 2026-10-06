/**
 * Servicio de Integración Oficial para Mercado Pago Point
 * Permite enviar cobros automáticos a terminales físicas Point Smart / Point Plus / Blue
 * utilizando el Access Token de producción del comercio.
 */

export interface MercadoPagoConfig {
  accessToken: string;
  publicKey?: string;
  clientId?: string;
  clientSecret?: string;
  deviceId: string;
  deviceName: string;
  autoPrintReceipt?: boolean;
}

export interface MercadoPagoDevice {
  id: string;
  pos_id: number;
  store_id: string;
  external_pos_id: string;
  operating_mode: 'STANDALONE' | 'PDV';
}

export interface MercadoPagoPaymentResult {
  success: boolean;
  paymentIntentId?: string;
  paymentId?: string;
  authCode?: string;
  last4?: string;
  amount?: number;
  status?: string;
  message?: string;
  errorType?: 'AUTH_ERROR' | 'DEVICE_BUSY' | 'TIMEOUT' | 'CANCELLED' | 'REJECTED' | 'UNKNOWN';
}

const STORAGE_KEY = 'bakery_mercadopago_config';

export const DEFAULT_MP_PUBLIC_KEY = 'APP_USR-654131db-9891-45e9-a75e-86bc7d22f5ae';
export const DEFAULT_MP_ACCESS_TOKEN = 'APP_USR-1851444305390229-100618-87c98c73cf6f06ebc4d3108482bb5e53-264153036';
export const DEFAULT_MP_CLIENT_ID = '1851444305390229';
export const DEFAULT_MP_CLIENT_SECRET = '4h0AmjhNE15mEit9OfzL9JLPlmOBqTfM';
export const DEFAULT_MP_DEVICE_ID = 'NEWLAND_N950__N950NCD300176970';
export const DEFAULT_MP_DEVICE_NAME = 'Point Smart N950';

export function getStoredMercadoPagoConfig(): MercadoPagoConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        let hasChanges = false;
        if (!parsed.accessToken || parsed.accessToken.startsWith('TEST-')) {
          parsed.accessToken = DEFAULT_MP_ACCESS_TOKEN;
          hasChanges = true;
        }
        if (!parsed.publicKey) {
          parsed.publicKey = DEFAULT_MP_PUBLIC_KEY;
          hasChanges = true;
        }
        if (!parsed.clientId) {
          parsed.clientId = DEFAULT_MP_CLIENT_ID;
          hasChanges = true;
        }
        if (!parsed.clientSecret) {
          parsed.clientSecret = DEFAULT_MP_CLIENT_SECRET;
          hasChanges = true;
        }
        if (!parsed.deviceId) {
          parsed.deviceId = DEFAULT_MP_DEVICE_ID;
          hasChanges = true;
        }
        if (!parsed.deviceName) {
          parsed.deviceName = DEFAULT_MP_DEVICE_NAME;
          hasChanges = true;
        }
        if (hasChanges) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error al leer configuración de Mercado Pago:', e);
  }

  const initial: MercadoPagoConfig = {
    accessToken: DEFAULT_MP_ACCESS_TOKEN,
    publicKey: DEFAULT_MP_PUBLIC_KEY,
    clientId: DEFAULT_MP_CLIENT_ID,
    clientSecret: DEFAULT_MP_CLIENT_SECRET,
    deviceId: DEFAULT_MP_DEVICE_ID,
    deviceName: DEFAULT_MP_DEVICE_NAME,
    autoPrintReceipt: true
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

export function saveMercadoPagoConfig(config: Partial<MercadoPagoConfig>): void {
  try {
    const current = getStoredMercadoPagoConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error al guardar configuración de Mercado Pago:', e);
  }
}

/**
 * Obtener lista de terminales Point registradas en la cuenta
 */
export async function listMercadoPagoDevices(): Promise<{
  success: boolean;
  devices: MercadoPagoDevice[];
  message?: string;
}> {
  const config = getStoredMercadoPagoConfig();
  const token = config.accessToken || DEFAULT_MP_ACCESS_TOKEN;

  try {
    // 1. Probar llamada vía función de Netlify / proxy local
    const proxyRes = await fetch('/.netlify/functions/mercadopago-point', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_devices', access_token: token })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return { success: true, devices: data.devices || [] };
    }
  } catch (e) {
    console.warn('Proxy list_devices falló, intentando llamada directa:', e);
  }

  // 2. Fallback a llamada directa
  try {
    const res = await fetch('https://api.mercadopago.com/point/integration-api/devices', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      return { success: false, devices: [], message: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { success: true, devices: data.devices || [] };
  } catch (err: any) {
    return { success: false, devices: [], message: err.message };
  }
}

/**
 * Cambiar el modo de operación de la terminal (PDV para cobros automáticos, STANDALONE para manual)
 */
export async function setMercadoPagoDeviceMode(
  deviceId: string,
  mode: 'PDV' | 'STANDALONE'
): Promise<boolean> {
  const config = getStoredMercadoPagoConfig();
  const token = config.accessToken || DEFAULT_MP_ACCESS_TOKEN;

  try {
    const proxyRes = await fetch('/.netlify/functions/mercadopago-point', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_mode', device_id: deviceId, operating_mode: mode, access_token: token })
    });
    if (proxyRes.ok) return true;
  } catch {}

  try {
    const res = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ operating_mode: mode })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Enviar orden de cobro a la terminal Point de Mercado Pago
 */
export async function sendPaymentToMercadoPagoPoint(
  amount: number,
  reference: string
): Promise<{
  success: boolean;
  paymentIntentId?: string;
  errorType?: string;
  message?: string;
  details?: any;
}> {
  const config = getStoredMercadoPagoConfig();
  const token = config.accessToken || DEFAULT_MP_ACCESS_TOKEN;
  const deviceId = config.deviceId || DEFAULT_MP_DEVICE_ID;

  // Mercado Pago Point requiere el monto en centavos (ej: $50.00 MXN -> 5000 centavos)
  const amountInCents = Math.round(amount * 100);

  // 1. Intentar mediante proxy seguro
  try {
    const proxyRes = await fetch('/.netlify/functions/mercadopago-point', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_payment_intent',
        amount: amountInCents,
        device_id: deviceId,
        reference,
        access_token: token
      })
    });

    const data = await proxyRes.json().catch(() => ({}));

    if (!proxyRes.ok) {
      return {
        success: false,
        errorType: data.error || `HTTP_${proxyRes.status}`,
        message: data.message || `Error al enviar a terminal Point (${proxyRes.status})`,
        details: data
      };
    }

    return {
      success: true,
      paymentIntentId: data.id,
      details: data
    };
  } catch (proxyErr) {
    console.warn('Proxy Mercado Pago falló, intentando directo:', proxyErr);
  }

  // 2. Intentar llamada directa a la API de Mercado Pago
  try {
    const res = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountInCents,
        additional_info: {
          external_reference: reference,
          print_on_terminal: true
        }
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        errorType: `HTTP_${res.status}`,
        message: data.message || 'Error al enviar orden a la terminal Mercado Pago Point',
        details: data
      };
    }

    return {
      success: true,
      paymentIntentId: data.id,
      details: data
    };
  } catch (err: any) {
    return {
      success: false,
      errorType: 'NETWORK_ERROR',
      message: 'No se pudo contactar la terminal Mercado Pago. Verifica la conexión Wi-Fi de tu terminal Point.'
    };
  }
}

/**
 * Consultar el estado del cobro en la terminal Point (Polling)
 */
export async function pollMercadoPagoPaymentStatus(
  paymentIntentId: string,
  onStatusUpdate: (statusText: string) => void,
  signal?: AbortSignal,
  maxAttempts: number = 36 // 36 * 2.5s = ~90 segundos
): Promise<MercadoPagoPaymentResult> {
  const config = getStoredMercadoPagoConfig();
  const token = config.accessToken || DEFAULT_MP_ACCESS_TOKEN;
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (signal?.aborted) {
      return {
        success: false,
        errorType: 'CANCELLED',
        message: 'Operación cancelada por el cajero.'
      };
    }

    attempts++;
    onStatusUpdate(`Esperando tarjeta o NIP en terminal Point... (${attempts}/${maxAttempts})`);

    try {
      // 1. Consultar vía proxy
      let data: any = null;
      try {
        const proxyRes = await fetch(`/.netlify/functions/mercadopago-point?action=get_status&payment_intent_id=${paymentIntentId}&access_token=${encodeURIComponent(token)}`);
        if (proxyRes.ok) {
          data = await proxyRes.json();
        }
      } catch {}

      // 2. Si no hubo proxy, consulta directa
      if (!data) {
        const res = await fetch(`https://api.mercadopago.com/point/integration-api/payment-intents/${paymentIntentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          data = await res.json();
        }
      }

      if (data) {
        const intentStatus = (data.status || '').toUpperCase();

        if (intentStatus === 'PROCESSED') {
          // Cobro aprobado exitosamente
          const p = data.payment || {};
          const authCode = p.authorization_code || p.id ? String(p.id) : `MP-${Math.floor(100000 + Math.random() * 900000)}`;
          return {
            success: true,
            paymentIntentId,
            paymentId: p.id ? String(p.id) : undefined,
            authCode,
            last4: p.last_four_digits,
            amount: data.amount ? data.amount / 100 : undefined,
            status: 'approved',
            message: '¡Pago Aprobado con éxito en Mercado Pago Point!'
          };
        }

        if (intentStatus === 'CANCELED' || intentStatus === 'CANCELLED') {
          return {
            success: false,
            errorType: 'CANCELLED',
            message: 'La operación fue cancelada en la pantalla de la terminal Point.'
          };
        }

        if (intentStatus === 'ABANDONED') {
          return {
            success: false,
            errorType: 'TIMEOUT',
            message: 'Tiempo de espera agotado en la terminal Point.'
          };
        }
      }
    } catch (e) {
      console.warn('Error en sondeo de estado Point:', e);
    }

    // Esperar 2.5 segundos antes del siguiente intento
    await new Promise(resolve => setTimeout(resolve, 2500));
  }

  return {
    success: false,
    errorType: 'TIMEOUT',
    message: 'Tiempo límite de espera agotado. Verifica la terminal Point.'
  };
}

/**
 * Cancelar cobro abierto en la pantalla de la terminal Point
 */
export async function cancelMercadoPagoPaymentIntent(
  paymentIntentId: string
): Promise<boolean> {
  const config = getStoredMercadoPagoConfig();
  const token = config.accessToken || DEFAULT_MP_ACCESS_TOKEN;
  const deviceId = config.deviceId || DEFAULT_MP_DEVICE_ID;

  try {
    await fetch('/.netlify/functions/mercadopago-point', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cancel_payment_intent',
        device_id: deviceId,
        payment_intent_id: paymentIntentId,
        access_token: token
      })
    });
    return true;
  } catch {}

  try {
    const res = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents/${paymentIntentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}
