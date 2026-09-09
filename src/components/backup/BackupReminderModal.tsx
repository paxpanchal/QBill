import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  CheckCircle2,
  X,
  AlertTriangle,
  Eye,
  Share2,
  Mail,
  Truck,
  FileCheck2,
} from 'lucide-react';
import { BusinessDocument, AppSettings } from '../../types';
import { dbService } from '../../services/storage';
import { downloadDocumentAsPdf, generateDocumentPdfBlob } from '../../utils/pdfGenerator';

interface BackupReminderModalProps {
  isOpen: boolean;
  docNumber: string;
  docType: 'INVOICE' | 'QUOTATION';
  document?: BusinessDocument | null;
  settings?: AppSettings | null;
  onClose: () => void;
  onBackupSuccess?: () => void;
  onPrepareEwayBill?: (doc: BusinessDocument) => void;
  onPrepareEmail?: (doc: BusinessDocument) => void;
}

export const BackupReminderModal: React.FC<BackupReminderModalProps> = ({
  isOpen,
  docNumber,
  docType,
  document: doc,
  settings: propSettings,
  onClose,
  onBackupSuccess,
  onPrepareEwayBill,
  onPrepareEmail,
}) => {
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const isInvoice = docType === 'INVOICE';

  const handleCreateBackup = async () => {
    try {
      setDownloadingBackup(true);
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

      setBackupDownloaded(true);
      if (onBackupSuccess) {
        onBackupSuccess();
      }
    } catch (err) {
      console.error('Failed to generate backup from reminder modal:', err);
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!doc) return;
    try {
      setDownloadingPdf(true);
      const settings = propSettings || (await dbService.getSettings());
      await downloadDocumentAsPdf(doc, settings, 'ORIGINAL');
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    if (!doc) return;
    try {
      const settings = propSettings || (await dbService.getSettings());
      const title = `${doc.docType === 'INVOICE' ? 'Tax Invoice' : 'Quotation'} ${doc.docNumber}`;
      const text = `Please find attached ${title} from ${settings?.business?.businessName || 'QuickBill PRP'}.`;

      if (navigator.share && navigator.canShare) {
        try {
          const { blob, filename } = await generateDocumentPdfBlob(doc, settings, 'ORIGINAL');
          const file = new File([blob], filename, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title,
              text,
              files: [file],
            });
            setShareSuccess('PDF shared successfully!');
            setTimeout(() => setShareSuccess(null), 3000);
            return;
          }
        } catch (e) {
          // Fall back
        }
      }

      // WhatsApp fallback
      const shareUrl = window.location.href;
      const whatsappText = encodeURIComponent(`${text}\nView online: ${shareUrl}`);
      window.open(`https://api.whatsapp.com/send?text=${whatsappText}`, '_blank');
      setShareSuccess('WhatsApp share link opened!');
      setTimeout(() => setShareSuccess(null), 3000);
    } catch (err) {
      // User cancelled
    }
  };

  const handlePrepareEmailClick = () => {
    if (doc && onPrepareEmail) {
      onClose();
      onPrepareEmail(doc);
    }
  };

  const handlePrepareEwayBillClick = () => {
    if (doc && onPrepareEwayBill && isInvoice) {
      onClose();
      onPrepareEwayBill(doc);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-4 sm:p-5 text-white flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-wide uppercase">
                DOCUMENT SUCCESSFULLY CREATED ✓
              </h2>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                {isInvoice ? 'Tax Invoice' : 'Quotation'}{' '}
                <span className="font-mono font-bold text-white bg-black/20 px-1.5 py-0.5 rounded-sm">
                  {docNumber}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
            The document has been securely saved in your local{' '}
            <strong className="text-indigo-700">QuickBill PRP Database</strong> and registered into{' '}
            <strong className="text-indigo-700">Unified MIS</strong>. Select your next action below:
          </div>

          {shareSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fadeIn">
              {shareSuccess}
            </div>
          )}

          {/* Document Action Area */}
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">
              Document Actions
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* 1. VIEW INVOICE */}
              <button
                type="button"
                onClick={onClose}
                className="w-full p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>VIEW {isInvoice ? 'INVOICE' : 'QUOTATION'}</span>
              </button>

              {/* 2. DOWNLOAD PDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                <span>{downloadingPdf ? 'GENERATING PDF...' : 'DOWNLOAD PDF'}</span>
              </button>

              {/* 3. SHARE PDF */}
              <button
                type="button"
                onClick={handleSharePdf}
                className="w-full p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-slate-600" />
                <span>SHARE PDF</span>
              </button>

              {/* 4. PREPARE EMAIL */}
              <button
                type="button"
                onClick={handlePrepareEmailClick}
                className="w-full p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>PREPARE EMAIL</span>
              </button>

              {/* 5. PREPARE E-WAY BILL (Only for Invoices) */}
              {isInvoice && (
                <button
                  type="button"
                  onClick={handlePrepareEwayBillClick}
                  className="sm:col-span-2 w-full p-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 active:from-amber-700 text-white font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>PREPARE E-WAY BILL</span>
                </button>
              )}
            </div>
          </div>

          {/* 6. CREATE BACKUP Reminder Box & Action */}
          <div className="pt-2 border-t border-slate-200">
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2.5">
              <div className="flex items-start gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold uppercase tracking-wide">Data Protection Notice: </span>
                  QuickBill PRP operates offline on your browser. Create a backup to keep your newly saved records safe against browser cache clears.
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={downloadingBackup || backupDownloaded}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {backupDownloaded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>BACKUP DOWNLOADED SUCCESSFULLY!</span>
                  </>
                ) : downloadingBackup ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>CREATING BACKUP...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>CREATE BACKUP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
