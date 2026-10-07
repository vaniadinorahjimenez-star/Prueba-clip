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
  maxAttempts: number = 60 // 60 * 1.5s = ~90 segundos
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

    try {
      // 1. Consultar vía proxy seguro (soporta POST y GET)
      let data: any = null;
      try {
        const proxyRes = await fetch('/.netlify/functions/mercadopago-point', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_status',
            payment_intent_id: paymentIntentId,
            access_token: token
          })
        });
        if (proxyRes.ok) {
          data = await proxyRes.json();
        }
      } catch {}

      // 1.1 Si falló POST, intentar GET con query params
      if (!data) {
        try {
          const getRes = await fetch(`/.netlify/functions/mercadopago-point?action=get_status&payment_intent_id=${paymentIntentId}&access_token=${encodeURIComponent(token)}`);
          if (getRes.ok) {
            const parsed = await getRes.json().catch(() => null);
            if (parsed && !parsed.error) data = parsed;
          }
        } catch {}
      }

      // 1.2 Verificación cruzada con events cada 3 intentos
      if (!data && attempts % 3 === 0) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const evRes = await fetch(`/.netlify/functions/mercadopago-point?action=get_events&startDate=${today}&endDate=${today}&access_token=${encodeURIComponent(token)}`);
          if (evRes.ok) {
            const evData = await evRes.json().catch(() => null);
            const foundEvent = (evData?.events || []).find((ev: any) => ev.payment_intent_id === paymentIntentId);
            if (foundEvent) {
              data = {
                id: foundEvent.payment_intent_id,
                state: foundEvent.status,
                status: foundEvent.status
              };
            }
          }
        } catch {}
      }

      // 2. Si no hubo proxy local, consulta directa a la API oficial (para entornos nativos)
      if (!data) {
        try {
          const res = await fetch(`https://api.mercadopago.com/point/integration-api/payment-intents/${paymentIntentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            data = await res.json().catch(() => null);
          }
        } catch {}
      }

      if (data) {
        // En Mercado Pago Point, el estado se devuelve principalmente en el campo "state" (ej: 'FINISHED', 'OPEN', 'CANCELED', 'ABANDONED')
        // y a veces en "status".
        const rawState = String(data.state || data.status || '').toUpperCase();

        // 1. ESTADO APROBADO / FINALIZADO
        // 'FINISHED' es el estado oficial devuelto por Point cuando el cliente pasa la tarjeta y se aprueba
        if (
          rawState === 'FINISHED' ||
          rawState === 'PROCESSED' ||
          rawState === 'APPROVED' ||
          rawState === 'SUCCESS' ||
          Boolean(data.payment && data.payment.id)
        ) {
          const p = data.payment || {};
          let authCode = p.authorization_code || (p.id ? `MP-${String(p.id).slice(-6)}` : `APROBADO`);
          let last4 = p.last_four_digits || p.last4 || '';

          // Intentar obtener authorization_code y last_four_digits reales de /v1/payments/{id}
          if (p.id) {
            try {
              let pData: any = null;
              try {
                const proxyP = await fetch(`/.netlify/functions/mercadopago-point?action=get_payment&payment_id=${p.id}&access_token=${encodeURIComponent(token)}`);
                if (proxyP.ok) pData = await proxyP.json();
              } catch {}

              if (!pData) {
                const dirP = await fetch(`https://api.mercadopago.com/v1/payments/${p.id}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (dirP.ok) pData = await dirP.json();
              }

              if (pData) {
                if (pData.authorization_code) authCode = String(pData.authorization_code);
                if (pData.card?.last_four_digits) last4 = String(pData.card.last_four_digits);
              }
            } catch (pErr) {
              console.warn('Detalle extendido de tarjeta omitido:', pErr);
            }
          }

          onStatusUpdate('¡Pago Aprobado en la terminal! Registrando venta...');
          return {
            success: true,
            paymentIntentId,
            paymentId: p.id ? String(p.id) : undefined,
            authCode,
            last4,
            amount: data.amount ? (data.amount > 1000 ? data.amount / 100 : data.amount) : undefined,
            status: 'approved',
            message: '¡Pago Aprobado con éxito en Mercado Pago Point!'
          };
        }

        // 2. CANCELADO
        if (rawState === 'CANCELED' || rawState === 'CANCELLED') {
          return {
            success: false,
            errorType: 'CANCELLED',
            message: 'La operación fue cancelada en la pantalla de la terminal Point.'
          };
        }

        // 3. ABANDONADO / TIMEOUT
        if (rawState === 'ABANDONED') {
          return {
            success: false,
            errorType: 'TIMEOUT',
            message: 'Tiempo de espera agotado en la terminal Point.'
          };
        }

        // 4. RECHAZADO / ERROR
        if (rawState === 'REJECTED' || rawState === 'FAILED' || rawState === 'ERROR') {
          return {
            success: false,
            errorType: 'REJECTED',
            message: 'Tarjeta declinada o rechazada en la terminal Point.'
          };
        }

        // 5. EN ESPERA / PROCESANDO
        if (rawState === 'PROCESSING' || rawState === 'ON_TERMINAL') {
          onStatusUpdate('Leyendo tarjeta y procesando NIP en la terminal Point Smart...');
        } else {
          onStatusUpdate(`Esperando tarjeta o NIP en terminal Point Smart... (${attempts}/${maxAttempts})`);
        }
      } else {
        onStatusUpdate(`Conectando con terminal Point Smart... (${attempts}/${maxAttempts})`);
      }
    } catch (e) {
      console.warn('Error en sondeo de estado Point:', e);
    }

    // Esperar 1.5 segundos antes del siguiente intento para detección ultra-rápida
    await new Promise(resolve => setTimeout(resolve, 1500));
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
