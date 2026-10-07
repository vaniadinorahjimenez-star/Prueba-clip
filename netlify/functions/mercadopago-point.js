/**
 * Netlify Function: Mercado Pago Point Integration Proxy
 * Maneja llamadas a la API de Mercado Pago Point (devices, payment-intents, status)
 * de forma segura y sin problemas de CORS en navegador.
 */

const DEFAULT_PUBLIC_KEY = 'APP_USR-654131db-9891-45e9-a75e-86bc7d22f5ae';
const DEFAULT_ACCESS_TOKEN = 'APP_USR-1851444305390229-100618-87c98c73cf6f06ebc4d3108482bb5e53-264153036';
const DEFAULT_DEVICE_ID = 'NEWLAND_N950__N950NCD300176970';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  let payload = {};
  if (event.body) {
    try {
      payload = JSON.parse(event.body);
    } catch (e) {}
  }

  const token = payload.access_token || event.queryStringParameters?.access_token || process.env.MERCADO_PAGO_ACCESS_TOKEN || DEFAULT_ACCESS_TOKEN;
  const action = payload.action || event.queryStringParameters?.action || 'create_payment_intent';

  const authHeader = `Bearer ${token.trim()}`;

  // 1. ACCIÓN: LISTAR DISPOSITIVOS REGISTRADOS
  if (action === 'list_devices') {
    try {
      const res = await fetch('https://api.mercadopago.com/point/integration-api/devices', {
        headers: { 'Authorization': authHeader }
      });
      const data = await res.json().catch(() => ({}));
      return {
        statusCode: res.status,
        headers: CORS_HEADERS,
        body: JSON.stringify(data)
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  // 2. ACCIÓN: CAMBIAR MODO DE OPERACIÓN (PDV o STANDALONE)
  if (action === 'change_mode') {
    const deviceId = payload.device_id || DEFAULT_DEVICE_ID;
    const mode = payload.operating_mode || 'PDV';
    try {
      const res = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operating_mode: mode })
      });
      const data = await res.json().catch(() => ({}));
      return {
        statusCode: res.status,
        headers: CORS_HEADERS,
        body: JSON.stringify(data)
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  // 3. ACCIÓN: CREAR ORDEN DE COBRO (PAYMENT INTENT)
  if (action === 'create_payment_intent') {
    const deviceId = payload.device_id || DEFAULT_DEVICE_ID;
    const amount = Number(payload.amount); // en centavos
    const reference = payload.reference || `PAN-${Date.now()}`;

    if (!amount || isNaN(amount) || amount <= 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'INVALID_AMOUNT', message: 'El monto en centavos debe ser mayor a 0' })
      };
    }

    try {
      const res = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          additional_info: {
            external_reference: reference,
            print_on_terminal: true
          }
        })
      });

      const data = await res.json().catch(() => ({}));
      return {
        statusCode: res.status,
        headers: CORS_HEADERS,
        body: JSON.stringify(data)
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'SERVER_ERROR', message: err.message })
      };
    }
  }

  // 4. ACCIÓN: CONSULTAR ESTADO DE LA ORDEN DE COBRO
  if (action === 'get_status') {
    const paymentIntentId = payload.payment_intent_id || event.queryStringParameters?.payment_intent_id;
    if (!paymentIntentId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'MISSING_ID', message: 'Falta el payment_intent_id' })
      };
    }

    try {
      const res = await fetch(`https://api.mercadopago.com/point/integration-api/payment-intents/${paymentIntentId}`, {
        headers: { 'Authorization': authHeader }
      });
      const data = await res.json().catch(() => ({}));
      return {
        statusCode: res.status,
        headers: CORS_HEADERS,
        body: JSON.stringify(data)
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  // ACCIÓN: OBTENER DETALLE DEL PAGO (AUTHORIZATION CODE, LAST 4)
  if (action === 'get_payment') {
    const paymentId = payload.payment_id || event.queryStringParameters?.payment_id;
    if (!paymentId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'MISSING_PAYMENT_ID' })
      };
    }

    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': authHeader }
      });
      const data = await res.json().catch(() => ({}));
      return {
        statusCode: res.status,
        headers: CORS_HEADERS,
        body: JSON.stringify(data)
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  // ACCIÓN: OBTENER EVENTOS DE INTENTS
  if (action === 'get_events') {
    const startDate = event.queryStringParameters?.startDate || payload.startDate || new Date().toISOString().split('T')[0];
    const endDate = event.queryStringParameters?.endDate || payload.endDate || startDate;
    try {
      const res = await fetch(`https://api.mercadopago.com/point/integration-api/payment-intents/events?startDate=${startDate}&endDate=${endDate}`, {
        headers: { 'Authorization': authHeader }
      });
      const data = await res.json().catch(() => ({}));
      return {
        statusCode: res.status,
        headers: CORS_HEADERS,
        body: JSON.stringify(data)
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  // 5. ACCIÓN: CANCELAR ORDEN DE COBRO
  if (action === 'cancel_payment_intent') {
    const deviceId = payload.device_id || DEFAULT_DEVICE_ID;
    const paymentIntentId = payload.payment_intent_id;
    if (!paymentIntentId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'MISSING_ID', message: 'Falta payment_intent_id' })
      };
    }

    try {
      const res = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents/${paymentIntentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
      const data = await res.json().catch(() => ({}));
      return {
        statusCode: res.status,
        headers: CORS_HEADERS,
        body: JSON.stringify(data)
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  return {
    statusCode: 400,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'UNKNOWN_ACTION', message: `Acción no reconocida: ${action}` })
  };
};
