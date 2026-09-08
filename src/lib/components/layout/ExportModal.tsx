import React, { useState, useRef } from 'react';
import { LPModel, SolveResult } from '../../solver/types';
import { modelToCSV, resultsToCSV, parseCSVToModel } from '../../export/csv';
import { exportModelToJSON, importModelFromJSON } from '../../export/json';
import { printReport } from '../../export/report';
import { useI18n } from '../../i18n';
import { Download, Upload, FileText, Printer, FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: LPModel;
  solution?: SolveResult | null;
  onImport: (importedModel: LPModel) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  model,
  solution,
  onImport,
}) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportModelCSV = () => {
    const csv = modelToCSV(model);
    downloadFile(csv, `${model.name.replace(/\s+/g, '_')}_modelo.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportResultsCSV = () => {
    if (!solution) return;
    const csv = resultsToCSV(solution);
    downloadFile(csv, `${model.name.replace(/\s+/g, '_')}_resultados.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportJSON = () => {
    const json = exportModelToJSON(model, solution);
    downloadFile(json, `${model.name.replace(/\s+/g, '_')}.json`, 'application/json;charset=utf-8;');
  };

  const handleProcessFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        let imported: LPModel;
        if (file.name.endsWith('.json') || text.trim().startsWith('{')) {
          imported = importModelFromJSON(text);
        } else {
          imported = parseCSVToModel(text);
        }
        onImport(imported);
        setImportStatus({ success: true, message: t('import.success') });
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        setImportStatus({
          success: false,
          message: err.message || t('import.error'),
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {t('export.title')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Buttons Grid */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Descargar y Compartir
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleExportModelCSV}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition text-left cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">
                  {t('export.csvModel')}
                </span>
                <span className="text-[11px] text-slate-600">Estructura para Excel</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportResultsCSV}
              disabled={!solution}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition text-left disabled:opacity-40 cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">
                  {t('export.csvResults')}
                </span>
                <span className="text-[11px] text-slate-600">Valores óptimos y holguras</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition text-left cursor-pointer"
            >
              <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">
                  {t('export.json')}
                </span>
                <span className="text-[11px] text-slate-600">Respaldo portable JSON</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                printReport();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition text-left cursor-pointer"
            >
              <Printer className="w-5 h-5 text-slate-700 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">
                  {t('export.printReport')}
                </span>
                <span className="text-[11px] text-slate-600">Hoja de resumen PDF</span>
              </div>
            </button>
          </div>
        </div>

        {/* Drag and Drop Import Area */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            {t('import.title')}
          </span>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
            }`}
          >
            <Upload className="w-6 h-6 text-slate-400" />
            <div className="flex flex-col text-xs text-slate-600">
              <span className="font-semibold text-slate-800">{t('import.selectFile')}</span>
              <span className="text-[11px] text-slate-600">{t('import.dragDrop')}</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
            />
          </div>

          {importStatus && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                importStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {importStatus.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}
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
