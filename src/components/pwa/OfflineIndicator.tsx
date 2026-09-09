import React from 'react';
import { WifiOff, ShieldCheck, Database } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside
      aria-label="Offline Mode Notification"
      className="fixed bottom-12 right-4 sm:bottom-14 sm:right-6 z-40 max-w-sm bg-slate-900/95 backdrop-blur-md text-white border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3 animate-slideUp select-none"
    >
      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
        <WifiOff className="w-4 h-4" />
      </div>

      <div className="text-xs space-y-0.5">
        <div className="flex items-center gap-1.5 font-black text-amber-400 uppercase tracking-wider text-[11px]">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>OFFLINE MODE</span>
        </div>
        <p className="text-slate-300 font-medium leading-relaxed">
          Your data is being saved locally on this device. All invoices, quotes, and reports work 100% offline.
        </p>
      </div>
    </aside>
  );
};
