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
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await downloadDocumentAsPdf(doc, settings, copyType);
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
      // Fallback to native print to PDF
      window.print();
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
          const { blob, filename } = await generateDocumentPdfBlob(doc, settings, copyType);
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
            className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 relative overflow-hidden font-sans a4-page w-[794px] max-w-[794px] mx-auto print:p-0 print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none print:transform-none"
          >
        {/* Cancelled Watermark */}
        {isCancelled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none">
            <div className="text-red-500/20 text-6xl sm:text-8xl font-black uppercase tracking-widest rotate-[-30deg] border-8 border-red-500/20 py-4 px-12 rounded-3xl">
              CANCELLED
            </div>
          </div>
        )}

        {/* Copy Type Header Pill */}
        <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-4 text-xs font-semibold text-slate-600">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            GSTIN: {settings?.business.gstin || '-'}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="px-2.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] uppercase font-bold text-slate-700 tracking-wider">
              {copyTypeText}
            </div>
            {isReprintMode && (
              <div className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-[10px] uppercase font-black text-amber-800 tracking-wider">
                REPRINT
              </div>
            )}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            PAN: {settings?.business.pan || '-'}
          </div>
        </div>

        {/* Business Header Section */}
        <div className="text-center pb-4 border-b-2 border-slate-900">
          <div className="flex justify-center items-center gap-3 mb-1">
            {settings?.branding.logoUrl && settings.branding.showLogo && (
              <img
                src={settings.branding.logoUrl}
                alt="Logo"
                className="max-h-12 max-w-[140px] object-contain"
              />
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight uppercase">
              {settings?.business.businessName || 'YOUR BUSINESS NAME'}
            </h1>
          </div>
          <div className="text-xs text-slate-700 max-w-xl mx-auto leading-relaxed">
            {settings?.business.address ? (
              <>
                {settings.business.address}
                {settings.business.city && `, ${settings.business.city}`}
                {settings.business.state && `, ${settings.business.state}`}
                {settings.business.pinCode && ` - ${settings.business.pinCode}`}
              </>
            ) : (
              <span className="text-slate-400 italic">Address not configured in Settings</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex justify-center gap-3 flex-wrap">
            {settings?.business.primaryContact && <span>Phone: {settings.business.primaryContact}</span>}
            {settings?.business.email && <span>Email: {settings.business.email}</span>}
            {settings?.business.stateCode && (
              <span>State Code: {settings.business.stateCode} {settings.business.state && `(${settings.business.state})`}</span>
            )}
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="bg-slate-900 text-white text-center py-1.5 my-3 rounded-md font-black tracking-widest text-sm uppercase">
          {isQuotation ? 'QUOTATION' : 'TAX INVOICE'}
        </div>

        {/* Document Metadata & Customer Block Grid */}
        <div className="grid grid-cols-2 border border-slate-900 rounded-sm mb-4 text-xs divide-x divide-slate-900">
          {/* Left: Customer Info (Billed To) */}
          <div className="p-3 space-y-2">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Details of Receiver / Billed To:
            </div>
            <div>
              <div className="text-sm font-black text-slate-950 leading-tight">
                {doc.customerName}
              </div>
              <div className="text-slate-700 text-[11px] mt-1 whitespace-pre-line leading-snug">
                {doc.customerAddress || 'Address on file'}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1 font-medium">
              {(doc.customerPinCode || extractPinCodeFromAddress(doc.customerAddress)) && (
                <div className="flex justify-between">
                  <span className="text-slate-600 font-bold">Customer PIN Code:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {doc.customerPinCode || extractPinCodeFromAddress(doc.customerAddress)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600 font-bold">GSTIN / UIN:</span>
                <span className="font-mono font-bold text-slate-900">{doc.customerGstin || 'Unregistered'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Contact No:</span>
                <span className="text-slate-900">{doc.customerContact || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">State & Code:</span>
                <span className="font-bold text-slate-900">{doc.customerState} ({doc.customerStateCode})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Place of Supply:</span>
                <span className="font-bold text-slate-900">{doc.placeOfSupply}</span>
              </div>
            </div>
          </div>

          {/* Right: Document & Dispatch Details */}
          <div className="p-3 space-y-1.5 text-[11px] divide-y divide-slate-100">
            <div className="flex justify-between pb-1">
              <span className="text-slate-600 font-bold">
                {isQuotation ? 'Quotation No:' : 'Invoice No:'}
              </span>
              <span className="font-black text-slate-950 font-mono text-xs">{doc.docNumber}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-600 font-bold">Dated:</span>
              <span className="font-bold text-slate-900">{formatDate(doc.docDate)}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-600">Buyer Order No & Date:</span>
              <span className="font-medium text-slate-900">
                {doc.buyerOrderNo ? `${doc.buyerOrderNo} (${formatDate(doc.buyerOrderDate)})` : '-'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-600">Dispatch Doc / LR No:</span>
              <span className="font-medium text-slate-900">{doc.dispatchDocNo || '-'}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-600">Dispatched Through:</span>
              <span className="font-medium text-slate-900">{doc.dispatchedThrough || '-'}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-600">Terms of Payment:</span>
              <span className="font-bold text-slate-900">{doc.paymentTerms || '30 Days Net'}</span>
            </div>

            <div className="flex justify-between pt-1">
              <span className="text-slate-600">Terms of Delivery:</span>
              <span className="font-medium text-slate-900">{doc.termsOfDelivery || 'Door Delivery'}</span>
            </div>
          </div>
        </div>

        {/* Product Items Table */}
        <div className="border border-slate-900 rounded-sm mb-4 overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 border-b border-slate-900 uppercase font-black text-[10px]">
                <th className="py-2 px-2 text-center w-8 border-r border-slate-900">Sr.</th>
                <th className="py-2 px-3 border-r border-slate-900">Description of Goods</th>
                <th className="py-2 px-2 text-center w-24 border-r border-slate-900">HSN/SAC</th>
                <th className="py-2 px-2 text-center w-14 border-r border-slate-900">GST</th>
                <th className="py-2 px-2 text-right w-16 border-r border-slate-900">Qty</th>
                <th className="py-2 px-2 text-right w-24 border-r border-slate-900">Rate (₹)</th>
                <th className="py-2 px-3 text-right w-28">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {doc.items.map((item, idx) => (
                <tr key={item.id} className="align-top">
                  <td className="py-2 px-2 text-center font-bold text-slate-700 border-r border-slate-900">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-900 space-y-0.5">
                    <div className="font-bold text-slate-950 leading-snug">{item.productName}</div>
                    {item.productDescription && (
                      <div className="text-[10px] text-slate-600 leading-normal whitespace-pre-wrap">
                        {item.productDescription}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-800 border-r border-slate-900">
                    {item.hsnSac || '-'}
                  </td>
                  <td className="py-2 px-2 text-center font-semibold text-slate-800 border-r border-slate-900">
                    {item.gstRate}%
                  </td>
                  <td className="py-2 px-2 text-right font-bold text-slate-900 border-r border-slate-900 font-mono">
                    {item.quantity} {item.unit && <span className="text-[10px] font-normal text-slate-500">{item.unit}</span>}
                  </td>
                  <td className="py-2 px-2 text-right font-bold text-slate-900 border-r border-slate-900">
                    {formatIndianCurrency(item.rate, false)}
                  </td>
                  <td className="py-2 px-3 text-right font-extrabold text-slate-950">
                    {formatIndianCurrency(item.amount, false)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lower Totals, Tax Breakdown, Bank & Signature Section */}
        <div className="grid grid-cols-12 border border-slate-900 rounded-sm text-xs divide-x divide-slate-900 mb-4">
          {/* Left Column (7 cols): Amount in Words, Bank Details, Declaration */}
          <div className="col-span-7 p-3 space-y-3 flex flex-col justify-between">
            {/* Amount In Words */}
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                Total Amount Chargeable (in words):
              </div>
              <div className="font-bold text-slate-900 mt-0.5 text-xs leading-snug">
                {doc.amountInWords}
              </div>
            </div>

            {/* Notes / Remarks if present */}
            {doc.notes && (
              <div className="bg-amber-50/70 p-2.5 rounded border border-amber-200 text-[10px] text-amber-950">
                <span className="font-bold uppercase text-[9px] text-amber-900 block mb-0.5">Notes / Remarks:</span>
                <span className="whitespace-pre-wrap leading-tight">{doc.notes}</span>
              </div>
            )}

            {/* Bank Details */}
            {settings?.print.showBankDetails && (
              <div className="p-2.5 rounded border border-slate-200 text-[10px] space-y-1">
                <div className="font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3 h-3 text-indigo-700" />
                  <span>Company Bank Details</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-700">
                  <div>Bank: <strong className="text-slate-900">{settings?.bank.bankName}</strong></div>
                  <div>A/c Name: <strong className="text-slate-900">{settings?.bank.accountHolder}</strong></div>
                  <div>A/c No: <strong className="text-slate-900 font-mono">{settings?.bank.accountNumber}</strong></div>
                  <div>IFSC: <strong className="text-slate-900 font-mono">{settings?.bank.ifsc}</strong></div>
                  <div>Branch: <span>{settings?.bank.branch}</span></div>
                  <div>UPI ID: <strong className="text-indigo-700 font-mono">{settings?.bank.upiId}</strong></div>
                </div>
              </div>
            )}

            {/* Terms & Conditions */}
            {settings?.print.showTerms && (
              <div className="text-[9px] text-slate-600 space-y-0.5">
                <div className="font-black uppercase text-slate-800">Terms & Conditions:</div>
                <ol className="list-decimal list-inside space-y-0.5 leading-tight">
                  {(isQuotation ? settings?.terms.quotationTerms : settings?.terms.invoiceTerms)?.map(
                    (term, i) => (
                      <li key={i}>{term}</li>
                    )
                  )}
                </ol>
              </div>
            )}

            {/* Declaration */}
            {settings?.print.showDeclaration && (
              <div className="pt-2 border-t border-slate-200 text-[9px] text-slate-600 leading-tight">
                <strong>Declaration:</strong> {settings?.terms.declaration}
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Calculation Breakdown */}
          <div className="col-span-5 p-3 space-y-1.5 text-[11px] flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-700">
                <span>Subtotal Amount:</span>
                <span className="font-bold text-slate-900">{formatIndianCurrency(doc.productTotal)}</span>
              </div>

              {doc.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span className="font-bold">- {formatIndianCurrency(doc.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-800 font-semibold border-t border-slate-200 pt-1">
                <span>Taxable Value:</span>
                <span className="font-bold text-slate-950">{formatIndianCurrency(doc.taxableValue)}</span>
              </div>

              {doc.freightCharges > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Freight & Cartage:</span>
                  <span className="font-bold">{formatIndianCurrency(doc.freightCharges)}</span>
                </div>
              )}

              {/* GST Breakdown */}
              {doc.isInterState ? (
                <div className="flex justify-between text-purple-800 font-semibold">
                  <span>IGST (Integrated Tax):</span>
                  <span className="font-bold">{formatIndianCurrency(doc.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>CGST (Central Tax):</span>
                    <span className="font-bold">{formatIndianCurrency(doc.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>SGST (State Tax):</span>
                    <span className="font-bold">{formatIndianCurrency(doc.sgst)}</span>
                  </div>
                </>
              )}

              {doc.otherCharges > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Other Charges:</span>
                  <span className="font-bold">{formatIndianCurrency(doc.otherCharges)}</span>
                </div>
              )}

              {doc.roundingOff !== 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Rounding Off:</span>
                  <span>{formatIndianCurrency(doc.roundingOff)}</span>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="border-t-2 border-slate-900 pt-2 pb-1 flex justify-between items-center text-sm font-black text-slate-950 bg-slate-100 p-2 rounded">
              <span>Grand Total:</span>
              <span className="text-base text-indigo-900">{formatIndianCurrency(doc.grandTotal)}</span>
            </div>

            {/* Signature Area */}
            <div className="pt-8 text-center border-t border-slate-200 mt-4">
              <div className="text-[10px] font-black uppercase text-slate-800">
                For {settings?.business.businessName || 'Authorized Signatory'}
              </div>
              <div className="h-12 flex items-center justify-center text-slate-300 text-xs italic">
                {settings?.branding.signatureUrl ? (
                  <img src={settings.branding.signatureUrl} alt="Signature" className="h-10 object-contain mx-auto" />
                ) : (
                  <span>[ Authorized Signatory ]</span>
                )}
              </div>
              <div className="text-[9px] font-bold text-slate-600 uppercase border-t border-dashed border-slate-400 pt-1">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Document ID Bar */}
        <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-200 pt-2">
          <span>This is a computer generated document.</span>
          <span>Doc ID: {doc.id} | Generated By: {doc.generatedByName} ({formatDateTime(doc.generatedAt)})</span>
        </div>
      </div>
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
