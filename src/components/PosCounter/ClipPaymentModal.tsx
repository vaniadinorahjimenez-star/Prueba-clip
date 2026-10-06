import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Sliders, 
  ArrowRight,
  ShieldCheck,
  Smartphone,
  KeyRound,
  Activity,
  Power,
  Check,
  ExternalLink,
  AlertCircle
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

interface ClipPaymentModalProps {
  isOpen: boolean;
  amount: number;
  folio: string;
  customerName?: string;
  onClose: () => void;
  onPaymentApproved: (details: {
    terminal: 'clip';
    authCode: string;
    last4?: string;
    reference?: string;
  }) => void;
}

type PaymentStep = 
  | 'INITIATING'             // Conectando con la terminal por Wi-Fi
  | 'AWAITING_CARD'          // Terminal activa esperando tarjeta o NIP
  | 'APPROVED'               // Cobro aprobado en la terminal
  | 'NETLIFY_REDEPLOY_ERROR' // Faltó hacer deploy en Netlify tras guardar variables
  | 'AUTH_ERROR'             // Error 401: API Key rechazada por Clip
  | 'SERIAL_NOT_FOUND'       // Serie no registrada en la cuenta Clip
  | 'OFFLINE_ERROR'          // Terminal apagada o sin internet Wi-Fi
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
  const [step, setStep] = useState<PaymentStep>('INITIATING');
  const [statusMessage, setStatusMessage] = useState<string>('Enviando orden a la terminal Clip por Wi-Fi...');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [authCode, setAuthCode] = useState<string>('');
  const [last4, setLast4] = useState<string>('');
  const [isEditingSerial, setIsEditingSerial] = useState<boolean>(false);
  const [isEditingCredentials, setIsEditingCredentials] = useState<boolean>(false);
  const [serialInput, setSerialInput] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [secretKeyInput, setSecretKeyInput] = useState<string>('');
  const [config, setConfig] = useState(getStoredClipConfig());

  // Fallback manual de respaldo
  const [manualAuthCode, setManualAuthCode] = useState<string>('');
  const [manualLast4, setManualLast4] = useState<string>('');

  // Verificación rápida en vivo de estado de terminal
  const [checkingDevice, setCheckingDevice] = useState<boolean>(false);
  const [deviceCheckFeedback, setDeviceCheckFeedback] = useState<{
    status: string;
    isReady: boolean;
    message: string;
    model?: string;
  } | null>(null);

  // Diagnóstico
  const [diagnosticLoading, setDiagnosticLoading] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const checkTerminalConnectionLive = async () => {
    setCheckingDevice(true);
    setDeviceCheckFeedback(null);
    try {
      const res = await checkClipDeviceStatus(config.serialNumber);
      if (res.status === 'expired') {
        setDeviceCheckFeedback({
          status: 'expired',
          isReady: false,
          model: res.model || 'P8',
          message: 'Clip detecta tu terminal registrada (P8), pero la app Clip PinPad en la pantalla física está cerrada o suspendida. Abre la app Clip PinPad para reactivarla.'
        });
      } else if (res.status === 'connected' || res.status === 'online' || res.status === 'active') {
        setDeviceCheckFeedback({
          status: res.status,
          isReady: true,
          model: res.model || 'P8',
          message: '¡Terminal conectada y activa! Haz clic en Reintentar Cobro para enviar la orden.'
        });
      } else if (res.registered) {
        setDeviceCheckFeedback({
          status: res.status,
          isReady: false,
          model: res.model || 'P8',
          message: `Estado en Clip: "${res.status}". Abre la app Clip PinPad en la pantalla física de la terminal.`
        });
      } else {
        setDeviceCheckFeedback({
          status: res.status,
          isReady: false,
          message: res.message || 'No se pudo contactar la terminal.'
        });
      }
    } catch (e: any) {
      setDeviceCheckFeedback({
        status: 'error',
        isReady: false,
        message: e.message || 'Error de conexión'
      });
    } finally {
      setCheckingDevice(false);
    }
  };

  // Inicializar y lanzar el cobro REAL al abrir el modal
  useEffect(() => {
    if (!isOpen) return;

    const stored = getStoredClipConfig();
    setConfig(stored);
    setSerialInput(stored.serialNumber || DEFAULT_CLIP_SERIAL);
    setApiKeyInput(stored.apiKey || '');
    setSecretKeyInput(stored.secretKey || '');
    startClipTransaction();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen]);

  const startClipTransaction = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStep('INITIATING');
    setStatusMessage(`Contactando a la terminal Clip ${config.serialNumber || DEFAULT_CLIP_SERIAL} vía Wi-Fi...`);
    setErrorMessage('');
    setErrorDetails(null);
    setHttpStatus(null);

    const sendRes = await sendPaymentToClipTerminal(amount, folio);

    if (!sendRes.success) {
      setErrorDetails(sendRes.details);
      setHttpStatus(sendRes.httpStatus || null);
      
      if (sendRes.errorType === 'NETLIFY_REDEPLOY_NEEDED') {
        setStep('NETLIFY_REDEPLOY_ERROR');
        setErrorMessage(
          sendRes.message || 'Se requiere desplegar nuevamente el sitio en Netlify para activar CLIP_API_KEY.'
        );
      } else if (sendRes.errorType === 'CLIP_AUTH_ERROR' || sendRes.httpStatus === 401) {
        setStep('AUTH_ERROR');
        setErrorMessage(
          sendRes.message || 'Clip no reconoció la clave de autorización (Error 401). Verifica tu API Key y Secret Key de developer.clip.mx.'
        );
      } else if (sendRes.errorType === 'DEVICE_NOT_FOUND' || sendRes.httpStatus === 404) {
        setStep('SERIAL_NOT_FOUND');
        setErrorMessage(
          sendRes.message || `La terminal con serie "${config.serialNumber}" no fue encontrada en tu cuenta de Clip.`
        );
      } else if (sendRes.errorType === 'PINPAD_APP_CLOSED' || sendRes.errorType === 'PINPAD_APP_NOT_LISTENING') {
        setStep('OFFLINE_ERROR');
        setErrorMessage(
          sendRes.message || 'La app Clip PinPad en la pantalla física está cerrada o no recibe órdenes (ERR10_03 / ERR10_04). Abre la app Clip PinPad en la terminal o usa Cobro Directo.'
        );
      } else if (sendRes.errorType === 'TERMINAL_OFFLINE' || sendRes.httpStatus === 503) {
        setStep('OFFLINE_ERROR');
        setErrorMessage(
          sendRes.message || 'La terminal Clip está apagada, en reposo o sin señal Wi-Fi.'
        );
      } else if (sendRes.errorType === 'TERMINAL_BUSY' || sendRes.httpStatus === 409) {
        setStep('BUSY_ERROR');
        setErrorMessage(
          sendRes.message || 'La terminal Clip está ocupada con otra transacción.'
        );
      } else {
        setStep('OFFLINE_ERROR');
        setErrorMessage(
          sendRes.message || 'No fue posible contactar a la terminal Clip. Revisa que esté encendida y conectada a Wi-Fi.'
        );
      }
      return;
    }

    setStep('AWAITING_CARD');
    setStatusMessage('Terminal conectada. Pasa, inserta o acerca la tarjeta en la pantalla Clip...');

    // Iniciar sondeo (polling) REAL en la terminal Clip
    const pollRes: ClipPaymentResult = await pollClipPaymentStatus(
      sendRes.pinpadRequestId || folio,
      (msg) => setStatusMessage(msg),
      controller.signal
    );

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
      }, 1400);
    } else {
      if (pollRes.errorType === 'CANCELLED') {
        return;
      }
      if (pollRes.errorType === 'TERMINAL_TIMEOUT' || pollRes.status === 'TIMEOUT') {
        setStep('TIMEOUT_ERROR');
        setErrorMessage(pollRes.message || 'Tiempo agotado sin pasar la tarjeta en la terminal.');
      } else {
        setStep('OFFLINE_ERROR');
        setErrorMessage(pollRes.message || 'La operación en la terminal no pudo completarse.');
      }
    }
  };

  const handleSaveSerial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialInput.trim()) return;
    const sanitized = cleanClipSerial(serialInput);
    const updated = { ...config, serialNumber: sanitized };
    setConfig(updated);
    saveClipConfig(updated);
    setSerialInput(sanitized);
    setIsEditingSerial(false);
    startClipTransaction();
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...config,
      apiKey: apiKeyInput.trim(),
      secretKey: secretKeyInput.trim()
    };
    setConfig(updated);
    saveClipConfig(updated);
    setIsEditingCredentials(false);
    startClipTransaction();
  };

  const handleManualAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = manualAuthCode.trim() 
      ? manualAuthCode.trim().toUpperCase() 
      : `CLIP-${Math.floor(100000 + Math.random() * 900000)}`;

    onPaymentApproved({
      terminal: 'clip',
      authCode: finalCode,
      last4: manualLast4.trim() || undefined,
      reference: folio
    });
  };

  const runDiagnostic = async () => {
    setStep('DIAGNOSTIC');
    setDiagnosticLoading(true);
    const result = await diagnoseClipConnection(config.serialNumber);
    setDiagnosticResult(result);
    setDiagnosticLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className={`p-5 text-white flex items-center justify-between relative shadow-xs transition-colors ${
          config.isTestMode
            ? 'bg-gradient-to-r from-amber-600 to-amber-700'
            : 'bg-gradient-to-r from-[#FF5A00] to-[#E04D00]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight leading-tight">Terminal Clip Wi-Fi</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                  config.isTestMode ? 'bg-amber-300 text-amber-950 shadow-xs' : 'bg-white/25 text-white'
                }`}>
                  {config.isTestMode ? '🧪 MODO TEST' : '🟢 EN VIVO'}
                </span>
              </div>
              <p className="text-xs text-orange-100 font-medium">
                Serie: {config.serialNumber || DEFAULT_CLIP_SERIAL}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextMode = !config.isTestMode;
                const updated = { ...config, isTestMode: nextMode };
                setConfig(updated);
                saveClipConfig(updated);
                startClipTransaction();
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border ${
                config.isTestMode
                  ? 'bg-white text-amber-900 border-white shadow-xs'
                  : 'bg-white/20 hover:bg-white/30 text-white border-white/30'
              }`}
              title="Cambiar entre cobros reales y simulador de pruebas"
            >
              <span>{config.isTestMode ? '🧪 Modo Test' : '🟢 Real'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resumen del cobro */}
        <div className="px-6 py-4 bg-orange-50/60 border-b border-orange-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider block">
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

        {/* Info de la Terminal y botón para cambiar serie */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>Serie: <strong>{config.serialNumber}</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingSerial(!isEditingSerial)}
            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            {isEditingSerial ? 'Cerrar' : 'Modificar serie'}
          </button>
        </div>

        {/* Edición rápida de número de serie */}
        {isEditingSerial && (
          <form onSubmit={handleSaveSerial} className="p-4 bg-slate-100 border-b border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Número de Serie de la Terminal Clip:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder={DEFAULT_CLIP_SERIAL}
                className="flex-1 px-3 py-1.5 bg-white rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="bg-[#FF5A00] text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer hover:bg-orange-600 shrink-0"
              >
                Guardar y Conectar
              </button>
            </div>
          </form>
        )}

        {/* Contenido Dinámico por Estado */}
        <div className="p-6 flex flex-col items-center justify-center min-h-[260px] text-center">

          {/* ESTADO 1: INICIANDO COBRO EN LA TERMINAL */}
          {step === 'INITIATING' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-[#FF5A00]">
                  <Wifi className="w-8 h-8 animate-pulse" />
                </div>
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#FF5A00] border-2 border-white animate-ping" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Enviando monto a la terminal...</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* ESTADO 2: ESPERANDO TARJETA REAL EN LA TERMINAL CLIP */}
          {step === 'AWAITING_CARD' && (
            <div className="flex flex-col items-center space-y-4 animate-in fade-in">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-orange-50 border-2 border-orange-300 flex items-center justify-center text-[#FF5A00] shadow-md">
                  <Smartphone className="w-10 h-10 animate-bounce" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Wifi className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-lg">Pasa la tarjeta en la terminal</h4>
                <p className="text-xs text-slate-600 font-medium max-w-xs">
                  {statusMessage}
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold mt-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Terminal {config.serialNumber} Conectada
                </div>
              </div>

              {/* Controles interactivos cuando está en Modo Test */}
              {config.isTestMode && (
                <div className="w-full bg-amber-50 border border-amber-300 rounded-2xl p-3 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-950 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                      Simulador de Tarjeta Test (Sin dinero real):
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                      Visa Test •• 4242
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        onPaymentApproved({
                          terminal: 'clip',
                          authCode: `TEST-${Math.floor(100000 + Math.random() * 900000)}`,
                          last4: '4242',
                          reference: folio
                        });
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aprobar Venta Test
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('BUSY_ERROR');
                        setErrorMessage('Simulación Test: Tarjeta rechazada por fondos insuficientes (Prueba)');
                      }}
                      className="bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-bold py-2 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                    >
                      <X className="w-3.5 h-3.5 text-rose-600" />
                      Simular Rechazo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ESTADO 3: PAGO APROBADO EXITOSAMENTE */}
          {step === 'APPROVED' && (
            <div className="flex flex-col items-center space-y-3 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-600/20">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="font-black text-emerald-700 text-xl">¡Pago Aprobado!</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Autorización: <strong className="font-mono">{authCode}</strong>
                </p>
                {last4 && (
                  <p className="text-xs text-slate-500">
                    Tarjeta terminación: <strong className="font-mono">**** {last4}</strong>
                  </p>
                )}
                <span className="text-[11px] text-emerald-600 font-bold block mt-2 animate-pulse">
                  Generando ticket e imprimiendo comprobante...
                </span>
              </div>
            </div>
          )}

          {/* ESTADO 4A: ERROR - FALTA TRIGGER DEPLOY EN NETLIFY */}
          {step === 'NETLIFY_REDEPLOY_ERROR' && (
            <div className="flex flex-col items-center space-y-3 w-full text-left">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 self-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center w-full">
                <h4 className="font-black text-slate-900 text-base">Falta Desplegar en Netlify</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Las variables fueron guardadas, pero los servidores de Netlify necesitan recargarlas.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-slate-700 space-y-1.5 w-full">
                <strong className="text-amber-900 font-bold block">Pasos en tu panel de Netlify:</strong>
                <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                  <li>Ve a la pestaña <strong>Deploys</strong> en tu panel de Netlify.</li>
                  <li>Haz clic en el botón <strong>Trigger deploy</strong> (arriba a la derecha).</li>
                  <li>Selecciona <strong>Clear cache and deploy site</strong>.</li>
                  <li>Espera 1 minuto a que termine el despliegue y presiona <strong>Reintentar</strong> aquí abajo.</li>
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <button
                  type="button"
                  onClick={startClipTransaction}
                  className="bg-[#FF5A00] hover:bg-[#E04D00] text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={runDiagnostic}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Diagnóstico
                </button>
              </div>
            </div>
          )}

          {/* ESTADO 4B: ERROR 401 DE AUTENTICACIÓN CLIP */}
          {step === 'AUTH_ERROR' && (
            <div className="flex flex-col items-center space-y-3 w-full text-left">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 self-center">
                <KeyRound className="w-6 h-6" />
              </div>

              <div className="text-center w-full">
                <h4 className="font-black text-red-700 text-base">Error 401: Credenciales Rechazadas por Clip</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  La API de terminales físicas de Clip requiere claves de <strong>PRODUCCIÓN</strong>.
                </p>
              </div>

              {/* AVISO DESTACADO SI TIENE CLAVE "test_" O TOKEN ENCODIFICADO CON "test_" */}
              {(apiKeyInput.trim().toLowerCase().startsWith('test_') || 
                apiKeyInput.includes('dGVzdF') || 
                (config.apiKey || '').toLowerCase().startsWith('test_') || 
                (config.apiKey || '').includes('dGVzdF')) && (
                <div className="w-full bg-amber-50 border-2 border-amber-400 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 font-black text-amber-950 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Estás usando un Token de "Modo Pruebas" (contiene "test_")</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Las terminales físicas Clip (serie <span className="font-mono font-bold">{config.serialNumber}</span>) operan en vivo con tarjetas reales y <strong>rechazan cualquier clave que provenga del ambiente de pruebas (Error 401)</strong>.
                  </p>
                  <div className="bg-white/90 rounded-xl p-3 border border-amber-200 text-[11px] text-slate-700 space-y-1.5 shadow-xs">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Cómo obtener tu Token o Claves de Producción:</span>
                      <a 
                        href="https://developer.clip.mx" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[#FF5A00] hover:underline font-bold flex items-center gap-1 text-[10px]"
                      >
                        developer.clip.mx <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                      <li>Inicia sesión en <strong>developer.clip.mx</strong>.</li>
                      <li>En la parte superior, cambia de <strong>"Pruebas"</strong> a <strong>"Producción"</strong>.</li>
                      <li>Ve a <strong>Credenciales API</strong> y copia tu <strong>API Key</strong> y <strong>Secret Key</strong> (o Token) de producción.</li>
                      <li>Pégalas en los campos de abajo y presiona <strong>Guardar y Reintentar</strong>.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* BOTÓN DIRECTO PARA ACTIVAR MODO PRUEBAS */}
              <div className="w-full bg-amber-50 border-2 border-amber-400 rounded-2xl p-3.5 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-700" />
                    ¿Quieres cobrar en MODO TEST / PRUEBAS?
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    Sin dinero real
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Puedes activar el <strong>Modo Test</strong> para realizar cobros simulados, probar el ticket, registrar ventas y capacitar personal usando tus claves de prueba sin necesidad de transferir dinero real.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...config, isTestMode: true };
                    setConfig(updated);
                    saveClipConfig(updated);
                    startClipTransaction();
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
                >
                  <CreditCard className="w-4 h-4 text-slate-950" />
                  <span>🧪 Activar Modo Test y Cobrar ${amount.toFixed(2)} Ahora</span>
                </button>
              </div>

              {/* BOTÓN RÁPIDO PARA COBRAR EN MOSTRADOR SI EL CLIENTE ESTÁ ESPERANDO */}
              <button
                type="button"
                onClick={() => setStep('MANUAL_AUTH')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>⚡ Cobrar ${amount.toFixed(2)} en la Pantalla de la Terminal y Registrar Aquí</span>
              </button>

              {/* Formulario rápido para corregir API Key y Secret Key */}
              <form onSubmit={handleSaveCredentials} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 text-xs">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Ingresar Credenciales de Producción:</span>
                  <a 
                    href="https://developer.clip.mx" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-[#FF5A00] font-bold hover:underline flex items-center gap-0.5"
                  >
                    developer.clip.mx <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Token de Acceso o API Key (Producción):
                  </label>
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Pega aquí tu API Key de Producción (sin test_)"
                    className={`w-full bg-white border rounded-xl px-2.5 py-1.5 font-mono text-xs focus:ring-2 focus:ring-[#FF5A00] ${
                      apiKeyInput.trim().toLowerCase().startsWith('test_') ? 'border-amber-400 bg-amber-50/40' : 'border-slate-300'
                    }`}
                  />
                  {apiKeyInput.trim().toLowerCase().startsWith('test_') && (
                    <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Esta clave contiene "test_". Requiere clave de producción.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Secret Key (Producción):
                  </label>
                  <input
                    type="password"
                    value={secretKeyInput}
                    onChange={(e) => setSecretKeyInput(e.target.value)}
                    placeholder="Clave secreta de producción"
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:ring-2 focus:ring-[#FF5A00]"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 bg-[#FF5A00] hover:bg-[#E04D00] text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Guardar y Reintentar Cobro
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-3 gap-1.5 w-full pt-1">
                <button
                  type="button"
                  onClick={runDiagnostic}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-orange-600" />
                  Diagnóstico
                </button>
                <button
                  type="button"
                  onClick={() => setStep('MANUAL_AUTH')}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Cobro Manual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPaymentApproved({
                      terminal: 'clip',
                      authCode: `TEST-${Math.floor(100000 + Math.random() * 900000)}`,
                      last4: '0000',
                      reference: folio
                    });
                  }}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-black py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1 shadow-xs cursor-pointer border border-amber-300"
                  title="Simula un pago aprobado para probar el punto de venta sin cobro bancario real"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  Simular Prueba
                </button>
              </div>
            </div>
          )}

          {/* ESTADO 4C: SERIE NO ENCONTRADA EN CLIP */}
          {step === 'SERIAL_NOT_FOUND' && (
            <div className="flex flex-col items-center space-y-3 w-full text-left">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 self-center">
                <Smartphone className="w-6 h-6" />
              </div>

              <div className="text-center w-full">
                <h4 className="font-black text-slate-900 text-base">Terminal no Registrada en Modo PinPad</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Clip no detectó la terminal <strong className="font-mono">{config.serialNumber}</strong> habilitada para recibir cobros remotos vía API.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-950 space-y-1.5 w-full text-left">
                <p className="text-[11px] font-semibold text-amber-900">
                  ⚠️ ¿Por qué ocurre esto?
                </p>
                <p className="text-[11px] text-slate-700">
                  Las terminales Clip de fábrica requieren que Clip les instale la aplicación <strong>PinPad</strong> para poder enlazarse a la API. Se solicita a Clip vía <strong>developers@payclip.com</strong> con el número de serie <span className="font-mono font-bold">{config.serialNumber}</span>.
                </p>
                <p className="text-[11px] text-blue-800 font-semibold pt-1 border-t border-amber-200/60">
                  💡 Para no detener la venta: Puedes cobrar tecleando el monto en la pantalla física de tu terminal y luego presionar "Autorizar Manual".
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <button
                  type="button"
                  onClick={() => runDiagnostic()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-orange-600" />
                  Ver Diagnóstico
                </button>
                <button
                  type="button"
                  onClick={() => setStep('MANUAL_AUTH')}
                  className="bg-[#FF5A00] hover:bg-[#E04D00] text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Autorizar Manual
                </button>
              </div>
            </div>
          )}

          {/* ESTADO 4D: TERMINAL APAGADA O APP PINPAD CERRADA */}
          {step === 'OFFLINE_ERROR' && (
            <div className="flex flex-col items-center space-y-3 w-full">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-inner">
                  <Smartphone className="w-7 h-7 stroke-[2]" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white">
                  <WifiOff className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-1 text-center">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Netlify y API Clip: Conectados con éxito</span>
                </div>
                <h4 className="font-black text-slate-800 text-base">Terminal en Reposo o App PinPad Cerrada</h4>
                <p className="text-xs text-slate-600 px-1 leading-relaxed">
                  Clip recibió la orden pero la terminal <span className="font-mono font-bold text-slate-800">{config.serialNumber}</span> tiene la app Clip PinPad cerrada o en reposo (Código <span className="font-mono font-bold text-amber-700">ERR10_04</span>).
                </p>
              </div>

              <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 text-left text-xs text-amber-950 w-full space-y-2 shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                  <Power className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Cómo activar tu terminal en 30 segundos:</span>
                </div>
                <ol className="space-y-1.5 text-[11px] text-slate-700 list-decimal pl-4">
                  <li>
                    <strong>Desbloquea la terminal Clip</strong> {config.serialNumber} presionando el botón lateral de encendido.
                  </li>
                  <li>
                    Abre la aplicación <strong>"Clip PinPad"</strong> para que quede activa y visible en la pantalla.
                  </li>
                  <li>
                    Si la pantalla no responde o estuvo inactiva, mantén presionado el botón de encendido y elige <strong>"Reiniciar"</strong>. Al encender, abre la app PinPad.
                  </li>
                </ol>
              </div>

              {/* Comprobación en vivo del estado en Clip */}
              <div className="w-full space-y-1.5">
                <button
                  type="button"
                  onClick={checkTerminalConnectionLive}
                  disabled={checkingDevice}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer transition-colors active:scale-98 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingDevice ? 'animate-spin text-[#FF5A00]' : ''}`} />
                  {checkingDevice ? 'Consultando servidores de Clip...' : '📡 Comprobar si ya despertó la terminal'}
                </button>

                {deviceCheckFeedback && (
                  <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 animate-in fade-in duration-200 ${
                    deviceCheckFeedback.isReady 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    {deviceCheckFeedback.isReady ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold block">
                        {deviceCheckFeedback.isReady ? '¡Terminal Lista!' : `Estado actual en Clip: ${deviceCheckFeedback.status}`}
                      </span>
                      <span>{deviceCheckFeedback.message}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={startClipTransaction}
                  className="bg-[#FF5A00] hover:bg-[#E04D00] text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
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
                  Cobro Directo / Voucher
                </button>
              </div>

              <button
                type="button"
                onClick={runDiagnostic}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline font-semibold mt-1 cursor-pointer flex items-center gap-1"
              >
                <Activity className="w-3 h-3" />
                Ver diagnóstico completo de API
              </button>
            </div>
          )}

          {/* ESTADO 5: TIMEOUT */}
          {step === 'TIMEOUT_ERROR' && (
            <div className="flex flex-col items-center space-y-3 w-full">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-8 h-8 stroke-[2]" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">Tiempo de Espera Agotado</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">{errorMessage}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <button
                  type="button"
                  onClick={startClipTransaction}
                  className="bg-[#FF5A00] hover:bg-[#E04D00] text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar Cobro
                </button>
                <button
                  type="button"
                  onClick={() => setStep('MANUAL_AUTH')}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  Autorizar Manual
                </button>
              </div>
            </div>
          )}

          {/* ESTADO 6: DIAGNÓSTICO EN VIVO */}
          {step === 'DIAGNOSTIC' && (
            <div className="flex flex-col items-center space-y-3 w-full text-left">
              <div className="flex items-center justify-between w-full border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-600" />
                  <h4 className="font-black text-slate-900 text-sm">Diagnóstico de Terminal Clip</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('OFFLINE_ERROR')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {diagnosticLoading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
                  <span className="text-xs text-slate-500 font-bold">Consultando conexión con Clip...</span>
                </div>
              ) : diagnosticResult ? (
                <div className="space-y-2 w-full text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-medium">CLIP_API_KEY:</span>
                      <strong className={diagnosticResult.diagnosis?.has_api_key ? 'text-emerald-700' : 'text-red-600'}>
                        {diagnosticResult.diagnosis?.has_api_key ? '✅ Activa' : '❌ No detectada (Haz Trigger Deploy)'}
                      </strong>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600 font-medium">Serie de Terminal:</span>
                      <span className="font-mono text-[11px] text-slate-800 font-bold">
                        {diagnosticResult.diagnosis?.env_serial_value || config.serialNumber}
                      </span>
                    </div>

                    {diagnosticResult.clip_http_status && (
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-600 font-medium">Respuesta Servidor Clip:</span>
                        <span className={`font-mono font-bold ${diagnosticResult.clip_http_status === 200 ? 'text-emerald-600' : 'text-orange-600'}`}>
                          HTTP {diagnosticResult.clip_http_status}
                        </span>
                      </div>
                    )}
                  </div>

                  {diagnosticResult.message && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                      {diagnosticResult.message}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={runDiagnostic}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Volver a diagnosticar
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ESTADO 7: AUTORIZACIÓN MANUAL DE RESPALDO */}
          {step === 'MANUAL_AUTH' && (
            <form onSubmit={handleManualAuthSubmit} className="w-full text-left space-y-3">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950">
                <span className="font-bold text-emerald-900 block mb-1">
                  ⚡ Cobro Directo en Terminal Clip (Respaldo Inmediato)
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Si tecleaste el monto (${amount.toFixed(2)}) en la terminal Clip y se imprimió el comprobante, puedes registrar la venta aprobada sin hacer esperar al cliente.
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
                  placeholder="Ej. 123456 (O déjalo vacío para generar uno auto)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
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
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
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
                  onClick={() => setStep('OFFLINE_ERROR')}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs cursor-pointer text-center"
                >
                  Volver a intentar por Wi-Fi
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px] font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Terminal Clip {config.serialNumber || DEFAULT_CLIP_SERIAL} • Wi-Fi Activo
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer hover:underline"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};
