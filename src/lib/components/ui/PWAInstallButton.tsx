import React, { useState } from 'react';
import { usePWAInstall } from '../../pwa/usePWAInstall';
import { useI18n } from '../../i18n';
import { Download, Check, Share2, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { t } = useI18n();

  // If already running in standalone PWA mode, don't show the prompt
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
        <Check className="w-3.5 h-3.5" />
        <span>{t('pwa.installed')}</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-button"
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{t('pwa.install')}</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not fired by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-ios-install-button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-blue-600" />
          <span>{t('pwa.install')}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-base font-semibold text-slate-900">Instalar en iOS / Safari</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-xs text-slate-600 flex flex-col gap-2 list-decimal list-inside leading-relaxed">
                <li>Abra esta página en el navegador <strong>Safari</strong> de iOS.</li>
                <li>Toque el botón de <strong>Compartir</strong> en la barra inferior.</li>
                <li>Desplácese hacia abajo y seleccione <strong>Agregar a pantalla de inicio</strong>.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-slate-100 py-2 text-xs font-medium text-slate-800 hover:bg-slate-200 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
