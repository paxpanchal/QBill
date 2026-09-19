import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Download,
  Share2,
  Edit3,
  RotateCcw,
  History,
  XCircle,
  CheckCircle,
  FileSpreadsheet,
  ArrowLeft,
  QrCode,
  Building2,
  CreditCard,
  FileCheck,
  Share,
  Layers,
  Mail,
  Truck,
  ShieldCheck
} from 'lucide-react';
import { BusinessDocument, AppSettings } from '../../types';
import { dbService } from '../../services/storage';
import { formatIndianCurrency, formatDate, formatDateTime } from '../../utils/indianNumbering';
import { downloadDocumentAsPdf, generateDocumentPdfBlob } from '../../utils/pdfGenerator';
import { buildInvoiceDocumentHtml } from '../../utils/invoiceTemplate';
import { printInvoiceDocument } from '../../utils/printService';
import { extractPinCodeFromAddress } from '../../services/ewayBillService';
import { useAuth } from '../../context/AuthContext';
import { EmailSharingGuideModal } from './EmailSharingGuideModal';
import { EwayBillExportModal } from './EwayBillExportModal';

interface DocumentPreviewProps {
  document: BusinessDocument;
  onBack: () => void;
  onEdit: (doc: BusinessDocument) => void;
  onCancelDoc: (doc: BusinessDocument) => void;
  onConvertQuotation?: (doc: BusinessDocument) => void;
  onViewHistory: (doc: BusinessDocument) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document: doc,
  onBack,
  onEdit,
  onCancelDoc,
  onConvertQuotation,
  onViewHistory,
}) => {
  const { currentUser, hasPermission } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [copyType, setCopyType] = useState<'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'>(
    doc.copyType || 'ORIGINAL'
  );
  const [isReprintMode, setIsReprintMode] = useState<boolean>(false);
  const [shareSuccessMessage, setShareSuccessMessage] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showEmailGuide, setShowEmailGuide] = useState(false);
  const [showEwayBillModal, setShowEwayBillModal] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [autoFitScale, setAutoFitScale] = useState<number>(1);
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const appSettings = await dbService.getSettings();
      setSettings(appSettings);
    };
    fetchSettings();
  }, []);

  // Screen resize listener for mobile fit calculation
  useEffect(() => {
    const checkScreenAndCalculateFit = () => {
      const screenW = window.innerWidth;
      const isSmall = screenW < 840;
      setIsMobileScreen(isSmall);

      // A4 content fixed standard display width is 794px
      const availableWidth = Math.max(300, screenW - 32);
      const computedFit = Math.min(1, Math.max(0.35, availableWidth / 794));
      const roundedFit = Math.round(computedFit * 100) / 100;
      setAutoFitScale(roundedFit);

      if (isSmall) {
        setZoomScale(roundedFit);
      } else {
        setZoomScale(1);
      }
    };

    checkScreenAndCalculateFit();
    window.addEventListener('resize', checkScreenAndCalculateFit);
    return () => window.removeEventListener('resize', checkScreenAndCalculateFit);
  }, []);

  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(1.5, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoomScale(prev => Math.max(0.35, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleResetFit = () => {
    setZoomScale(autoFitScale);
  };

  const handlePrint = async (isReprint: boolean = false) => {
    // Record audit log for print/reprint
    if (currentUser) {
      await dbService.logAudit(
        currentUser.id,
        currentUser.displayName,
        isReprint ? 'DOCUMENT_REPRINTED' : 'DOCUMENT_PRINTED',
        'DOCUMENT',
        `${doc.docType} ${doc.docNumber} ${isReprint ? 'reprinted' : 'printed'} as ${copyType} copy.`,
        doc.docNumber,
        doc.id
      );
    }
    await printInvoiceDocument(doc, settings, copyType, isReprint);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await downloadDocumentAsPdf(doc, settings, copyType, isReprintMode);
      if (currentUser) {
        await dbService.logAudit(
          currentUser.id,
          currentUser.displayName,
          'DOCUMENT_DOWNLOADED',
          'DOCUMENT',
          `${doc.docType} ${doc.docNumber} downloaded as PDF (${copyType}).`,
          doc.docNumber,
          doc.id
        );
      }
      setShareSuccessMessage('PDF downloaded successfully!');
      setTimeout(() => setShareSuccessMessage(''), 4000);
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      // Fallback to print dialog
      await printInvoiceDocument(doc, settings, copyType, isReprintMode);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShare = async () => {
    const title = `${doc.docType === 'INVOICE' ? 'Tax Invoice' : 'Quotation'} - ${doc.docNumber}`;
    const text = `Please find the ${doc.docType} ${doc.docNumber} from ${settings?.business.businessName || 'our company'} for ${doc.customerName} (Total: ${formatIndianCurrency(doc.grandTotal)}).`;
    const shareUrl = window.location.href;

    try {
      // Try sharing with file attachment if supported
      if (navigator.share && navigator.canShare) {
        try {
          const { blob, filename } = await generateDocumentPdfBlob(doc, settings, copyType, isReprintMode);
          const file = new File([blob], filename, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title,
              text,
              files: [file],
            });
            if (currentUser) {
              await dbService.logAudit(
                currentUser.id,
                currentUser.displayName,
                'DOCUMENT_SHARED',
                'DOCUMENT',
                `${doc.docType} ${doc.docNumber} shared as PDF file.`,
                doc.docNumber,
                doc.id
              );
            }
            return;
          }
        } catch (e) {
          // Fall back to standard share
        }
      }

      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url: shareUrl,
        });
        if (currentUser) {
          await dbService.logAudit(
            currentUser.id,
            currentUser.displayName,
            'DOCUMENT_SHARED',
            'DOCUMENT',
            `${doc.docType} ${doc.docNumber} shared via device share dialog.`,
            doc.docNumber,
            doc.id
          );
        }
      } else {
        // Fallback: WhatsApp share link
        const whatsappText = encodeURIComponent(`${text}\nView online: ${shareUrl}`);
        window.open(`https://api.whatsapp.com/send?text=${whatsappText}`, '_blank');
        setShareSuccessMessage('WhatsApp share link opened!');
        setTimeout(() => setShareSuccessMessage(''), 4000);
      }
    } catch (err) {
      // Share cancelled by user or not supported
    }
  };

  const handleQuickBackup = async () => {
    try {
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

      setShareSuccessMessage('Database backup downloaded successfully!');
      setTimeout(() => setShareSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Quick backup failed:', err);
    }
  };

  const copyTypeText =
    copyType === 'ORIGINAL'
      ? 'Original for Recipient'
      : copyType === 'DUPLICATE'
      ? 'Duplicate for Transporter'
      : 'Triplicate for Supplier';

  const isQuotation = doc.docType === 'QUOTATION';
  const isCancelled = doc.status === 'CANCELLED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Action Toolbar (Hidden during browser Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900">{doc.docNumber}</h1>
              {isCancelled && (
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                  CANCELLED
                </span>
              )}
              {doc.status === 'CONVERTED' && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  CONVERTED TO INVOICE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Created on {formatDate(doc.docDate)} by {doc.generatedByName}
            </p>
          </div>
        </div>

        {/* Copy Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(['ORIGINAL', 'DUPLICATE', 'TRIPLICATE'] as const).map(type => (
            <button
              key={type}
              onClick={() => setCopyType(type)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                copyType === type
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type === 'ORIGINAL' ? 'Original' : type === 'DUPLICATE' ? 'Duplicate' : 'Triplicate'}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Print */}
          {hasPermission('printDocument') && (
            <button
              onClick={() => handlePrint(false)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          )}

          {/* Reprint (Same Doc Number, No new MIS record) */}
          {hasPermission('printDocument') && (
            <button
              onClick={() => {
                setIsReprintMode(true);
                handlePrint(true);
              }}
              title="Reprint original document without changing invoice numbers or MIS"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>Reprint</span>
            </button>
          )}

          {/* Download PDF */}
          {hasPermission('downloadPdf') && (
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 active:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
          )}

          {/* Share */}
          {hasPermission('sharePdf') && (
            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-slate-600" />
              <span>Share</span>
            </button>
          )}

          {/* Prepare Email Guide */}
          <button
            onClick={() => setShowEmailGuide(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Generate ready-to-use email format for this document"
          >
            <Mail className="w-4 h-4 text-indigo-600" />
            <span>Prepare Email</span>
          </button>

          {/* Prepare E-Way Bill (Only for Invoices) */}
          {!isQuotation && !isCancelled && (
            <button
              onClick={() => setShowEwayBillModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 active:from-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Prepare E-Way Bill JSON for government portal upload"
            >
              <Truck className="w-4 h-4" />
              <span>Prepare E-Way Bill</span>
            </button>
          )}

          {/* Quick Database Backup */}
          <button
            onClick={handleQuickBackup}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Create full local database backup"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Backup</span>
          </button>

          {/* Edit */}
          {!isCancelled && (hasPermission('editAllDocuments') || (hasPermission('editOwnDocuments') && doc.generatedBy === currentUser?.id)) && (
            <button
              onClick={() => onEdit(doc)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>Edit</span>
            </button>
          )}

          {/* Convert Quotation to Invoice */}
          {isQuotation && doc.status !== 'CONVERTED' && !isCancelled && onConvertQuotation && (
            <button
              onClick={() => onConvertQuotation(doc)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Convert to Invoice</span>
            </button>
          )}

          {/* View Change History */}
          <button
            onClick={() => onViewHistory(doc)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-all"
            title="View Edit & Audit History"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Cancel */}
          {!isCancelled && hasPermission('cancelDocument') && (
            <button
              onClick={() => onCancelDoc(doc)}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all"
              title="Cancel Document"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {shareSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium animate-fadeIn">
          {shareSuccessMessage}
        </div>
      )}

      {/* 
        ========================================================================
        MOBILE & DESKTOP DOCUMENT ZOOM CONTROLS (Maintains strict A4 Proportions)
        ========================================================================
      */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-2xl print:hidden shadow-md">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
            {isQuotation ? 'Quotation' : 'Invoice'} Preview
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden xs:inline">
            (Preserved A4 Ratio)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold text-base cursor-pointer transition-colors"
          >
            –
          </button>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 font-mono text-xs font-bold text-indigo-300 min-w-[50px] text-center border border-slate-700">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold text-base cursor-pointer transition-colors"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleResetFit}
            title="Fit to Screen"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-[11px] font-bold uppercase tracking-wider text-white cursor-pointer ml-1 transition-colors"
          >
            Fit Screen
          </button>
        </div>
      </div>

      {/* 
        ========================================================================
        DYNAMIC HIGH FIDELITY A4 DOCUMENT LAYOUT
        ========================================================================
      */}
      <div className="w-full overflow-x-auto overflow-y-auto pb-6 rounded-2xl print:overflow-visible print:pb-0">
        <div
          className="transition-transform duration-100 ease-out origin-top-left sm:origin-top mx-auto print:transform-none print:w-full print:m-0"
          style={{
            transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
            width: '794px',
            minWidth: '794px',
            marginBottom: zoomScale < 1 ? `-${Math.round((1 - zoomScale) * 1123)}px` : undefined,
            marginRight: zoomScale < 1 ? `-${Math.round((1 - zoomScale) * 794)}px` : undefined,
          }}
        >
          <div
            ref={printRef}
            id="printable-document"
            className="bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 overflow-hidden font-sans a4-page w-[794px] max-w-[794px] mx-auto print:p-0 print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none print:transform-none"
            style={{
              width: "794px",
              minHeight: "1123px",
              backgroundColor: "#ffffff",
            }}
            dangerouslySetInnerHTML={{
              __html: buildInvoiceDocumentHtml(doc, settings, copyType, isReprintMode),
            }}
          />
    </div>
  </div>

      {/* Email Sharing Guide Modal */}
      {showEmailGuide && (
        <EmailSharingGuideModal
          document={doc}
          settings={settings}
          isOpen={showEmailGuide}
          onClose={() => setShowEmailGuide(false)}
        />
      )}

      {/* E-Way Bill Export Modal (Transport Details) */}
      {showEwayBillModal && (
        <EwayBillExportModal
          document={doc}
          settings={settings}
          isOpen={showEwayBillModal}
          onClose={() => setShowEwayBillModal(false)}
        />
      )}
    </div>
  );
};
