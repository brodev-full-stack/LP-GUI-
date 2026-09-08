import React, { useState, useEffect } from 'react';
import { LPModel } from '../../solver/types';
import { getAllModels, deleteModel } from '../../storage';
import { useI18n } from '../../i18n';
import { FolderOpen, X, Trash2, ArrowRight, Calendar } from 'lucide-react';

interface SavedModelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (model: LPModel) => void;
}

export const SavedModelsModal: React.FC<SavedModelsModalProps> = ({ isOpen, onClose, onSelect }) => {
  const { t, formatDate } = useI18n();
  const [models, setModels] = useState<LPModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const list = await getAllModels();
      setModels(list.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (e) {
      console.error('Error fetching saved models:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    if (window.confirm(t('modal.deleteConfirm'))) {
      await deleteModel(id);
      await fetchModels();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {t('modal.savedTitle')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : models.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <FolderOpen className="w-8 h-8 text-slate-300" />
            <span>{t('modal.noSaved')}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {models.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex items-center justify-between gap-3"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-semibold text-sm text-slate-800 truncate">{m.name}</span>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
                    <span className="flex items-center gap-1 font-sans">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(m.updatedAt)}
                    </span>
                    <span>
                      {m.variables.length} vars × {m.constraints.length} rest.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(m);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition cursor-pointer"
                  >
                    <span>{t('modal.load')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    title={t('modal.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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
