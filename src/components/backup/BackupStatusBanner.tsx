import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Download, RefreshCw, Upload, ArrowRightLeft, Database } from 'lucide-react';
import { dbService } from '../../services/storage';
import { BackupStatus } from '../../types';

interface BackupStatusBannerProps {
  onOpenExport?: () => void;
  onOpenImport?: () => void;
  onOpenRecoveryKit?: () => void;
  variant?: 'dashboard' | 'compact' | 'header';
}

export const BackupStatusBanner: React.FC<BackupStatusBannerProps> = ({
  onOpenExport,
  onOpenImport,
  onOpenRecoveryKit,
  variant = 'dashboard',
}) => {
  const [status, setStatus] = useState<BackupStatus>({
    lastBackupDate: null,
    lastBackupTime: null,
    documentsSinceLastBackup: 0,
  });
  const [downloading, setDownloading] = useState(false);

  const loadStatus = async () => {
    const s = await dbService.getBackupStatus();
    setStatus(s);
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleBackupNow = async () => {
    try {
      setDownloading(true);
      const jsonStr = await dbService.exportFullBackupJSON();
      
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const fileName = `QuickBillPRP_Backup_${timestamp}.json`;

      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await loadStatus();
    } catch (err) {
      console.error('Backup now error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const isBackupRecommended = !status.lastBackupDate || status.documentsSinceLastBackup > 0;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium">
          Backup: <span className="text-slate-800 font-semibold">{status.lastBackupDate || 'Never'}</span>
        </span>
        {status.documentsSinceLastBackup > 0 && (
          <span className="px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 font-mono text-[10px] font-bold">
            +{status.documentsSinceLastBackup} new
          </span>
        )}
        <button
          onClick={handleBackupNow}
          disabled={downloading}
          className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 font-semibold cursor-pointer"
          title="Backup Now"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      isBackupRecommended
        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
        : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
    }`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left info */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
            isBackupRecommended
              ? 'bg-amber-500 text-white'
              : 'bg-emerald-600 text-white'
          }`}>
            {isBackupRecommended ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-xs uppercase tracking-wide">
                DATA BACKUP & SAFETY TRACKER
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isBackupRecommended
                  ? 'bg-amber-200 text-amber-900 animate-pulse'
                  : 'bg-emerald-200 text-emerald-900'
              }`}>
                {isBackupRecommended ? 'BACKUP RECOMMENDED' : 'ALL DATA BACKED UP'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
              <div>
                <span className="text-slate-500">Last Backup: </span>
                <span className="font-bold text-slate-900">
                  {status.lastBackupDate ? `${status.lastBackupDate}, ${status.lastBackupTime || ''}` : 'Never'}
                </span>
              </div>
              <div className="text-slate-300 hidden sm:inline">•</div>
              <div>
                <span className="text-slate-500">New Documents Since Backup: </span>
                <span className={`font-mono font-bold ${
                  status.documentsSinceLastBackup > 0 ? 'text-amber-700 font-extrabold' : 'text-emerald-700'
                }`}>
                  {status.documentsSinceLastBackup}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export Docs</span>
            </button>
          )}

          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
              <span>Import Docs</span>
            </button>
          )}

          <button
            onClick={handleBackupNow}
            disabled={downloading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-all shadow-xs hover:shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {downloading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Backing up...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>BACKUP NOW</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
