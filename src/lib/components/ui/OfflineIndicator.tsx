import React from 'react';
import { useOnlineStatus } from '../../pwa/usePWAInstall';
import { useI18n } from '../../i18n';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useI18n();

  return (
    <div
      id="connection-status-pill"
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition"
      title={isOnline ? t('status.online') : t('status.offline')}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-emerald-500 shadow-xs' : 'bg-amber-500 animate-pulse'
        }`}
      />
      <span className={isOnline ? 'text-slate-600' : 'text-amber-700 font-semibold'}>
        {isOnline ? t('status.online') : t('status.offline')}
      </span>
    </div>
  );
};
