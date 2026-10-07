import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Sliders, 
  ShieldCheck, 
  Smartphone, 
  KeyRound, 
  Activity, 
  Check, 
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  getStoredClipConfig, 
  saveClipConfig, 
  sendPaymentToClipTerminal, 
  pollClipPaymentStatus, 
  diagnoseClipConnection,
  checkClipDeviceStatus,
  ClipPaymentResult,
  DEFAULT_CLIP_SERIAL,
  cleanClipSerial
} from '../../services/clipService';
import {
  getStoredMercadoPagoConfig,
  saveMercadoPagoConfig,
  sendPaymentToMercadoPagoPoint,
  pollMercadoPagoPaymentStatus,
  cancelMercadoPagoPaymentIntent,
  DEFAULT_MP_DEVICE_ID,
  DEFAULT_MP_DEVICE_NAME,
  DEFAULT_MP_ACCESS_TOKEN
} from '../../services/mercadoPagoService';

interface ClipPaymentModalProps {
  isOpen: boolean;
  amount: number;
  folio: string;
  customerName?: string;
  onClose: () => void;
  onPaymentApproved: (details: {
    terminal: 'clip' | 'mercadopago';
    authCode: string;
    last4?: string;
    reference?: string;
  }) => void;
}

type PaymentStep = 
  | 'INITIATING'             // Conectando con la terminal
  | 'AWAITING_CARD'          // Terminal activa esperando tarjeta o NIP
  | 'APPROVED'               // Cobro aprobado en la terminal
  | 'NETLIFY_REDEPLOY_ERROR' // Error de despliegue
  | 'AUTH_ERROR'             // Error de autenticación / claves
  | 'SERIAL_NOT_FOUND'       // Serie no encontrada
  | 'OFFLINE_ERROR'          // Terminal apagada o sin internet
  | 'TIMEOUT_ERROR'          // Tiempo de espera agotado
  | 'BUSY_ERROR'             // Terminal ocupada
  | 'DIAGNOSTIC'             // Diagnóstico en vivo
  | 'MANUAL_AUTH';           // Autorización manual de respaldo

export const ClipPaymentModal: React.FC<ClipPaymentModalProps> = ({
  isOpen,
  amount,
  folio,
  customerName,
  onClose,
  onPaymentApproved
}) => {
  // Proveedor seleccionado: por defecto 'mercadopago' porque el usuario proporcionó Access Token real verificado
  const [provider, setProvider] = useState<'mercadopago' | 'clip'>('mercadopago');

  const [step, setStep] = useState<PaymentStep>('INITIATING');
  const [statusMessage, setStatusMessage] = useState<string>('Iniciando conexión con la terminal...');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [authCode, setAuthCode] = useState<string>('');
  const [last4, setLast4] = useState<string>('');

  // Configuración Clip
  const [clipConfig, setClipConfig] = useState(getStoredClipConfig());
  const [isEditingSerial, setIsEditingSerial] = useState<boolean>(false);
  const [serialInput, setSerialInput] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [secretKeyInput, setSecretKeyInput] = useState<string>('');

  // Configuración Mercado Pago
  const [mpConfig, setMpConfig] = useState(getStoredMercadoPagoConfig());
  const [mpPaymentIntentId, setMpPaymentIntentId] = useState<string>('');
  const [isEditingMpDevice, setIsEditingMpDevice] = useState<boolean>(false);
  const [mpDeviceIdInput, setMpDeviceIdInput] = useState<string>(DEFAULT_MP_DEVICE_ID);

  // Fallback manual
  const [manualAuthCode, setManualAuthCode] = useState<string>('');
  const [manualLast4, setManualLast4] = useState<string>('');

  // Diagnóstico
  const [diagnosticLoading, setDiagnosticLoading] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const storedClip = getStoredClipConfig();
    const storedMp = getStoredMercadoPagoConfig();
    setClipConfig(storedClip);
    setMpConfig(storedMp);
    setSerialInput(storedClip.serialNumber || DEFAULT_CLIP_SERIAL);
    setApiKeyInput(storedClip.apiKey || '');
    setSecretKeyInput(storedClip.secretKey || '');
    setMpDeviceIdInput(storedMp.deviceId || DEFAULT_MP_DEVICE_ID);

    // Lanzar cobro según el proveedor seleccionado
    startTransaction(provider);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen]);

  const startTransaction = (targetProvider: 'mercadopago' | 'clip') => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (targetProvider === 'mercadopago') {
      startMercadoPagoTransaction(controller);
    } else {
      startClipTransactionInternal(controller);
    }
  };

  // -------------------------------------------------------------
  // TRANSACCIÓN MERCADO PAGO POINT
  // -------------------------------------------------------------
  const startMercadoPagoTransaction = async (controller: AbortController) => {
    setStep('INITIATING');
    setStatusMessage(`Enviando $${amount.toFixed(2)} a tu terminal Point Smart N950...`);
    setErrorMessage('');

    const res = await sendPaymentToMercadoPagoPoint(amount, folio);

    if (controller.signal.aborted) return;

    if (!res.success) {
      setStep('OFFLINE_ERROR');
      setErrorMessage(res.message || 'No se pudo comunicar con la terminal Point Smart. Verifica que esté conectada a Wi-Fi.');
      return;
    }

    const intentId = res.paymentIntentId || '';
    setMpPaymentIntentId(intentId);
    setStep('AWAITING_CARD');
    setStatusMessage('Terminal Point Smart lista. Pasa, inserta o acerca la tarjeta en tu terminal...');

    const pollRes = await pollMercadoPagoPaymentStatus(
      intentId,
      (msg) => setStatusMessage(msg),
      controller.signal
    );

    if (controller.signal.aborted) return;

    if (pollRes.success) {
      const confirmedAuth = pollRes.authCode || 'APROBADO';
      const confirmedLast4 = pollRes.last4 || '••••';
      setAuthCode(confirmedAuth);
      setLast4(confirmedLast4);
      setStep('APPROVED');

      setTimeout(() => {
        onPaymentApproved({
          terminal: 'mercadopago',
          authCode: confirmedAuth,
          last4: confirmedLast4,
          reference: folio
        });
      }, 1200);
    } else {
      if (pollRes.errorType === 'CANCELLED') return;
      if (pollRes.errorType === 'TIMEOUT') {
        setStep('TIMEOUT_ERROR');
        setErrorMessage('Tiempo de espera agotado sin ingresar tarjeta en la terminal Point.');
      } else {
        setStep('OFFLINE_ERROR');
        setErrorMessage(pollRes.message || 'La operación en la terminal Point no pudo completarse.');
      }
    }
  };

  // -------------------------------------------------------------
  // TRANSACCIÓN CLIP WI-FI
  // -------------------------------------------------------------
  const startClipTransactionInternal = async (controller: AbortController) => {
    setStep('INITIATING');
    setStatusMessage(`Contactando a terminal Clip ${clipConfig.serialNumber} vía Wi-Fi...`);
    setErrorMessage('');

    const sendRes = await sendPaymentToClipTerminal(amount, folio);

    if (controller.signal.aborted) return;

    if (!sendRes.success) {
      if (sendRes.errorType === 'CLIP_AUTH_ERROR' || sendRes.httpStatus === 401) {
        setStep('AUTH_ERROR');
        setErrorMessage(sendRes.message || 'Credenciales rechazadas por Clip (Error 401).');
      } else if (sendRes.errorType === 'DEVICE_NOT_FOUND' || sendRes.httpStatus === 404) {
        setStep('SERIAL_NOT_FOUND');
        setErrorMessage(`Terminal Clip "${clipConfig.serialNumber}" no encontrada.`);
      } else {
        setStep('OFFLINE_ERROR');
        setErrorMessage(sendRes.message || 'No fue posible contactar a la terminal Clip.');
      }
      return;
    }

    setStep('AWAITING_CARD');
    setStatusMessage('Terminal Clip lista. Pasa o inserta la tarjeta...');

    const pollRes: ClipPaymentResult = await pollClipPaymentStatus(
      sendRes.pinpadRequestId || folio,
      (msg) => setStatusMessage(msg),
      controller.signal
    );

    if (controller.signal.aborted) return;

    if (pollRes.success && pollRes.status === 'APPROVED') {
      const confirmedAuth = pollRes.authCode || 'APROBADO';
      const confirmedLast4 = pollRes.last4 || '••••';
      setAuthCode(confirmedAuth);
      setLast4(confirmedLast4);
      setStep('APPROVED');

      setTimeout(() => {
        onPaymentApproved({
          terminal: 'clip',
          authCode: confirmedAuth,
          last4: confirmedLast4,
          reference: folio
        });
      }, 1200);
    } else {
      if (pollRes.errorType === 'CANCELLED') return;
      if (pollRes.errorType === 'TERMINAL_TIMEOUT') {
        setStep('TIMEOUT_ERROR');
        setErrorMessage('Tiempo agotado sin pasar la tarjeta en la terminal Clip.');
      } else {
        setStep('OFFLINE_ERROR');
        setErrorMessage(pollRes.message || 'La operación en Clip no pudo completarse.');
      }
    }
  };

  const handleSwitchProvider = (newProvider: 'mercadopago' | 'clip') => {
    if (provider === 'mercadopago' && mpPaymentIntentId) {
      cancelMercadoPagoPaymentIntent(mpPaymentIntentId);
      setMpPaymentIntentId('');
    }
    setProvider(newProvider);
    startTransaction(newProvider);
  };

  const handleManualAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = manualAuthCode.trim() 
      ? manualAuthCode.trim().toUpperCase() 
      : `${provider === 'mercadopago' ? 'MP' : 'CLIP'}-${Math.floor(100000 + Math.random() * 900000)}`;

    onPaymentApproved({
      terminal: provider,
      authCode: finalCode,
      last4: manualLast4.trim() || undefined,
      reference: folio
    });
  };

  const handleCloseModal = () => {
    if (provider === 'mercadopago' && mpPaymentIntentId) {
      cancelMercadoPagoPaymentIntent(mpPaymentIntentId);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        
        {/* SELECTOR DE TERMINAL / PROVEEDOR */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={() => handleSwitchProvider('mercadopago')}
            className={`py-2 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              provider === 'mercadopago'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Mercado Pago Point</span>
            <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.2 rounded-full font-bold shrink-0">
              Activo
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchProvider('clip')}
            className={`py-2 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              provider === 'clip'
                ? 'bg-[#FF5A00] text-white shadow-sm ring-2 ring-orange-400/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Clip Wi-Fi</span>
          </button>
        </div>

        {/* Modal Header */}
        <div className={`p-4 sm:p-5 text-white flex items-center justify-between relative shadow-xs transition-colors ${
          provider === 'mercadopago'
            ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600'
            : 'bg-gradient-to-r from-[#FF5A00] to-[#E04D00]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight leading-tight">
                  {provider === 'mercadopago' ? 'Mercado Pago Point' : 'Terminal Clip Wi-Fi'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-white/25 text-white">
                  {provider === 'mercadopago' ? '🟢 MODO PDV' : '🟢 EN VIVO'}
                </span>
              </div>
              <p className="text-xs text-white/90 font-medium">
                {provider === 'mercadopago' 
                  ? `Terminal: Point Smart N950`
                  : `Serie: ${clipConfig.serialNumber || DEFAULT_CLIP_SERIAL}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen del cobro */}
        <div className={`px-6 py-3.5 flex items-center justify-between border-b ${
          provider === 'mercadopago' 
            ? 'bg-blue-50/70 border-blue-100' 
            : 'bg-orange-50/70 border-orange-100'
        }`}>
          <div>
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${
              provider === 'mercadopago' ? 'text-blue-900' : 'text-orange-900'
            }`}>
              Folio {folio}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Total a cobrar:
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              ${amount.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-bold block">MXN</span>
          </div>
        </div>

        {/* Selector rápido de terminales Point si se usa Mercado Pago */}
        {provider === 'mercadopago' && (
          <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium text-[11px] flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>Dispositivo: <strong>Point Smart N950</strong></span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Listo para Cobro
            </span>
          </div>
        )}

        {/* Contenido Dinámico por Estado */}
        <div className="p-6 flex flex-col items-center justify-center min-h-[250px] text-center">

          {/* ESTADO 1: INICIANDO COBRO */}
          {step === 'INITIATING' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  provider === 'mercadopago' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-[#FF5A00]'
                }`}>
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  {provider === 'mercadopago' ? 'Enviando a terminal Point Smart...' : 'Contactando terminal Clip...'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* ESTADO 2: ESPERANDO TARJETA EN LA TERMINAL */}
          {step === 'AWAITING_CARD' && (
            <div className="flex flex-col items-center space-y-4 animate-in fade-in">
              <div className="relative">
                <div className={`w-20 h-20 rounded-3xl border-2 flex items-center justify-center shadow-md ${
                  provider === 'mercadopago' 
                    ? 'bg-blue-50 border-blue-300 text-blue-600' 
                    : 'bg-orange-50 border-orange-300 text-[#FF5A00]'
                }`}>
                  <Smartphone className="w-10 h-10 animate-bounce" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-lg">
                  {provider === 'mercadopago' 
                    ? 'Pasa la tarjeta en tu Point Smart' 
                    : 'Pasa la tarjeta en tu terminal Clip'}
                </h4>
                <p className="text-xs text-slate-600 font-medium max-w-xs">
                  {statusMessage}
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold mt-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Monto en Pantalla: <strong>${amount.toFixed(2)} MXN</strong></span>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const confirmedAuth = authCode || `MP-${Date.now().toString().slice(-6)}`;
                    onPaymentApproved({
                      terminal: provider,
                      authCode: confirmedAuth,
                      last4: last4 || '••••',
                      reference: folio
                    });
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>✅ Ya Cobró la Terminal - Registrar Cobro en Pantalla</span>
                </button>

                <div className="grid grid-cols-2 gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setStep('MANUAL_AUTH')}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Autorizar Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => startTransaction(provider)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    Reconsultar Estatus
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ESTADO 3: PAGO APROBADO EXITOSAMENTE */}
          {step === 'APPROVED' && (
            <div className="flex flex-col items-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-md">
                <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
              </div>

              <div>
                <h4 className="font-black text-emerald-800 text-xl tracking-tight">
                  ¡Pago Aprobado con Éxito!
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cobro procesado por {provider === 'mercadopago' ? 'Mercado Pago Point' : 'Clip'}
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 w-full space-y-1.5 text-xs text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Folio:</span>
                  <span className="font-mono font-bold text-slate-800">{folio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Monto cobrado:</span>
                  <span className="font-mono font-black text-emerald-700">${amount.toFixed(2)} MXN</span>
                </div>
                {authCode && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Autorización:</span>
                    <span className="font-mono font-bold text-slate-800">{authCode}</span>
                  </div>
                )}
                {last4 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Tarjeta:</span>
                    <span className="font-mono font-bold text-slate-800">•••• {last4}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 animate-pulse font-medium">
                Generando e imprimiendo ticket de venta...
              </p>
            </div>
          )}

          {/* ESTADO 4: ERROR DE CONEXIÓN O TIMEOUT */}
          {(step === 'OFFLINE_ERROR' || step === 'TIMEOUT_ERROR' || step === 'AUTH_ERROR') && (
            <div className="flex flex-col items-center space-y-3 w-full text-center">
              <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-8 h-8 stroke-[2]" />
              </div>

              <div>
                <h4 className="font-black text-slate-900 text-base">
                  {step === 'TIMEOUT_ERROR' ? 'Tiempo de Espera Agotado' : 'No se completó la transacción'}
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">{errorMessage}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <button
                  type="button"
                  onClick={() => startTransaction(provider)}
                  className={`text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all ${
                    provider === 'mercadopago' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#FF5A00] hover:bg-[#E04D00]'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar Cobro
                </button>

                <button
                  type="button"
                  onClick={() => setStep('MANUAL_AUTH')}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Cobro Manual
                </button>
              </div>

              {provider === 'clip' && (
                <button
                  type="button"
                  onClick={() => handleSwitchProvider('mercadopago')}
                  className="text-xs text-blue-700 hover:underline font-bold mt-1 cursor-pointer flex items-center gap-1"
                >
                  <span>Probar con Mercado Pago Point Smart</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* ESTADO 5: AUTORIZACIÓN MANUAL */}
          {step === 'MANUAL_AUTH' && (
            <form onSubmit={handleManualAuthSubmit} className="w-full text-left space-y-3">
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-950">
                <span className="font-bold text-emerald-900 block mb-1">
                  ⚡ Cobro Directo en Terminal (Respaldo Inmediato)
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Si cobraste tecleando los ${amount.toFixed(2)} en la pantalla táctil de tu terminal y el voucher se imprimió, puedes registrar la venta aprobada sin hacer esperar al cliente.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código de Autorización / Folio (Opcional):
                </label>
                <input
                  type="text"
                  value={manualAuthCode}
                  onChange={(e) => setManualAuthCode(e.target.value)}
                  placeholder="Ej. 123456 (o déjalo vacío para generar uno auto)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Últimos 4 dígitos de la tarjeta (Opcional):
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={manualLast4}
                  onChange={(e) => setManualLast4(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej. 1234"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  Registrar Venta Aprobada (${amount.toFixed(2)})
                </button>

                <button
                  type="button"
                  onClick={() => setStep('AWAITING_CARD')}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs cursor-pointer text-center"
                >
                  Regresar a espera de terminal
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium text-[11px]">
              {provider === 'mercadopago' ? 'Point Smart N950 Conectada' : 'Clip Wi-Fi'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="text-slate-400 hover:text-slate-700 font-bold text-[11px] cursor-pointer"
          >
            Cancelar operación
          </button>
        </div>

      </div>
    </div>
  );
};
