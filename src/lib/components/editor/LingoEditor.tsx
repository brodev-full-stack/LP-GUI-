import React, { useState, useEffect } from 'react';
import { LPModel } from '../../solver/types';
import { modelToLingo, parseLingoToModel } from '../../model/lingo';
import { useI18n } from '../../i18n';
import { Code2, Play, Copy, Check, AlertCircle, Sparkles, BookOpen } from 'lucide-react';

interface LingoEditorProps {
  model: LPModel;
  onModelChange: (model: LPModel) => void;
  onSolve?: () => void;
}

export const LingoEditor: React.FC<LingoEditorProps> = ({ model, onModelChange, onSolve }) => {
  const { t } = useI18n();
  const [code, setCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  // Sync from model to code when model changes externally
  useEffect(() => {
    setCode(modelToLingo(model));
    setParseErrors([]);
  }, [model.id, model.updatedAt]);

  const handleApply = () => {
    const result = parseLingoToModel(code);
    if (result.errors.length > 0) {
      setParseErrors(result.errors);
      setSyncSuccess(false);
    } else {
      setParseErrors([]);
      onModelChange(result.model);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2000);
      if (onSolve) {
        setTimeout(onSolve, 100);
      }
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertSnippet = (snippet: string) => {
    setCode((prev) => prev + '\n' + snippet);
  };

  return (
    <div id="lingo-editor-card" className="m3-card p-5 flex flex-col gap-4 bg-white border border-slate-200/90 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              Editor de Sintaxis LINGO / Matemática
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                LINGO v18+ Compatible
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Escribe ecuaciones directas como en LINGO, GAMS o simplex algebraico.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Copiar código LINGO"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="m3-gradient-btn flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sincronizar y Resolver</span>
          </button>
        </div>
      </div>

      {/* Syntax Quick Helper Pills */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
        <span className="text-slate-600 font-sans text-[11px] font-medium mr-1 flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-slate-500" /> Insertar:
        </span>
        <button
          type="button"
          onClick={() => insertSnippet('MAX = 10*x1 + 15*x2;')}
          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition cursor-pointer border border-slate-200"
        >
          MAX = ...
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('MIN = 5*x1 + 8*x2;')}
          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition cursor-pointer border border-slate-200"
        >
          MIN = ...
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('2*x1 + 3*x2 <= 100;')}
          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition cursor-pointer border border-slate-200"
        >
          LHS &lt;= RHS;
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('@GIN(x1);')}
          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition cursor-pointer border border-slate-200"
        >
          @GIN(var);
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('@BIN(x2);')}
          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition cursor-pointer border border-slate-200"
        >
          @BIN(var);
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('@BND(0, x1, 50);')}
          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition cursor-pointer border border-slate-200"
        >
          @BND(min, var, max);
        </button>
      </div>

      {/* Code Textarea with subtle editor background */}
      <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-950 text-slate-100 font-mono text-xs shadow-inner">
        <div className="bg-slate-900 px-3.5 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>lingo_model.lng</span>
          <span>Sintaxis LINGO estándar</span>
        </div>
        <textarea
          id="lingo-code-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full p-4 bg-transparent text-emerald-300 font-mono text-xs leading-relaxed focus:outline-hidden resize-y select-text"
          placeholder="! Escribe tu modelo LINGO aquí;
MAX = 3*x1 + 5*x2;
2*x1 + x2 <= 10;
x1 + 2*x2 <= 8;
@GIN(x1);
END"
        />
      </div>

      {/* Errors or Success Notification */}
      {parseErrors.length > 0 && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Errores de sintaxis LINGO:</span>
            <ul className="list-disc pl-4 space-y-0.5">
              {parseErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {syncSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>¡Modelo LINGO sincronizado y resuelto correctamente!</span>
        </div>
      )}
    </div>
  );
};
