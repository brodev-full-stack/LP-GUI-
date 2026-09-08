import React from 'react';
import { useI18n } from '../../i18n';
import { Info, X, Cpu, ShieldCheck, Keyboard, Sparkles, BookOpen } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {t('modal.aboutTitle')}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Plataforma de Optimización Matemática Progresiva (PWA)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content sections */}
        <div className="flex flex-col gap-4 text-xs text-slate-700 leading-relaxed">
          {/* Section 1: Theory */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 flex flex-col gap-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-blue-600" />
              ¿Qué es la Programación Lineal (LP)?
            </h4>
            <p>
              La Programación Lineal es una técnica matemática de optimización que busca maximizar
              o minimizar una función objetivo sujeta a un conjunto de restricciones lineales sobre
              variables de decisión.
            </p>
            <p className="text-slate-600">
              <strong>Teorema Fundamental:</strong> Si un problema lineal tiene una solución óptima y
              la región factible es acotada, al menos un vértice extremo (punto de esquina) de la
              región factible es óptimo.
            </p>
          </div>

          {/* Section 2: Architecture & HiGHS */}
          <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 flex flex-col gap-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Cpu className="w-4 h-4 text-blue-600" />
              Motor de Cálculo: HiGHS WASM
            </h4>
            <p>
              LP Studio ejecuta <strong>HiGHS</strong>, el solver de código abierto de clase mundial
              para problemas de optimización lineal y mixta entera (MILP), compilado a <strong>WebAssembly (WASM)</strong>.
            </p>
            <ul className="list-disc list-inside text-slate-600 flex flex-col gap-1">
              <li><strong>100% en el Navegador:</strong> Ningún dato sale de su dispositivo. Privacidad absoluta y zero telemetría.</li>
              <li><strong>Funciona Sin Conexión:</strong> Al ser una PWA completa, puede resolver modelos sin acceso a internet.</li>
              <li><strong>Soporte MILP y Binario:</strong> Capacidad para modelar variables enteras y problemas de mochila 0-1 con Branch-and-Bound.</li>
            </ul>
          </div>

          {/* Section 3: Keyboard Shortcuts */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 flex flex-col gap-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Keyboard className="w-4 h-4 text-slate-700" />
              Atajos de Teclado
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                <span className="font-sans text-slate-700">Resolver Modelo</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-semibold text-slate-800">
                  Ctrl + Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                <span className="font-sans text-slate-700">Guardar Modelo</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-semibold text-slate-800">
                  Ctrl + S
                </kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            {t('modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
