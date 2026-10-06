import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, X, Share2, Layers } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone mode (already installed), don't show prompt
  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        App Instalada
      </span>
    );
  }

  return (
    <>
      {/* Botón en el Navbar / Encabezado */}
      {isInstallable ? (
        <button
          type="button"
          onClick={install}
          className="flex items-center gap-1.5 bg-[#FF5A00] hover:bg-[#E04D00] text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
          title="Instalar como App en tu teléfono o tablet Android"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Instalar App Android</span>
          <span className="xs:hidden">App Android</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (isIOS) setShowIOSGuide(true);
            else setShowAndroidGuide(true);
          }}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 shadow-xs cursor-pointer transition-all active:scale-95"
          title="Ver cómo instalar como App en Android"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#FF5A00]" />
          <span className="hidden xs:inline">Instalar en Android</span>
          <span className="xs:hidden">App Android</span>
        </button>
      )}

      {/* Modal Guía de Instalación en Android */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-orange-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-orange-100 text-[#FF5A00] flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Instalar en Android</h3>
                  <p className="text-[11px] text-slate-500">Panadería Santa Fé POS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAndroidGuide(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <p className="leading-relaxed">
                Puedes instalar este sistema como una <strong>App nativa en Android</strong> directamente desde Google Chrome:
              </p>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2 text-[11px] text-slate-700">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FF5A00] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Abre esta página en <strong>Google Chrome</strong> en tu teléfono o terminal Android.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FF5A00] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Toca los <strong>3 puntos (⋮)</strong> en la esquina superior derecha del navegador.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FF5A00] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</span>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-2.5 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Se creará el icono de <strong>Santa Fé POS</strong> en tus apps y abrirá en pantalla completa sin barra de navegación.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAndroidGuide(false)}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Guía iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Instalar en iPhone / iPad</h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2">
              <p>1. Toca el botón <strong>Compartir (Share)</strong> en Safari.</p>
              <p>2. Desplázate hacia abajo y toca <strong>Agregar a la pantalla de inicio</strong>.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
