import React, { useState, useEffect } from 'react';
import { Upload, Download, Calendar, Filter, FileText, CheckCircle2, X, Smartphone, Laptop } from 'lucide-react';
import { dbService } from '../../services/storage';
import { BusinessDocument, DocumentType } from '../../types';

interface DocumentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentExportModal: React.FC<DocumentExportModalProps> = ({ isOpen, onClose }) => {
  const [docType, setDocType] = useState<DocumentType | 'ALL'>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [allDocs, setAllDocs] = useState<BusinessDocument[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      dbService.getDocuments().then(docs => {
        setAllDocs(docs);
        if (docs.length > 0) {
          const dates = docs.map(d => d.docDate).sort();
          setFromDate(dates[0]);
          setToDate(dates[dates.length - 1]);
        }
      });
      setExportedCount(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCount = allDocs.filter(d => {
    if (docType !== 'ALL' && d.docType !== docType) return false;
    if (fromDate && d.docDate < fromDate) return false;
    if (toDate && d.docDate > toDate) return false;
    return true;
  }).length;

  const handleExport = async () => {
    try {
      setExporting(true);
      const exportData = await dbService.exportDocumentsData({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        docType,
      });

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const fileName = `QuickBillPRP_Export_${timestamp}.json`;

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportedCount(exportData.counts.documents);
    } catch (err) {
      console.error('Export documents error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">
                EXPORT DOCUMENT DATA
              </h2>
              <p className="text-xs text-slate-400">Transfer documents to Mobile, Tablet, or PC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Transfer Info Note */}
          <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between text-xs text-indigo-950 font-medium">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Laptop</span>
              <span className="text-indigo-400 font-bold">➔</span>
              <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Mobile / Another PC</span>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
              JSON File
            </span>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Document Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['ALL', 'INVOICE', 'QUOTATION'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDocType(type)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      docType === type
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'ALL' ? 'All Docs' : type === 'INVOICE' ? 'Invoices' : 'Quotations'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  From Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  To Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Export Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <div className="text-slate-500 font-medium">Selected Documents for Export:</div>
              <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                {filteredCount} Document{filteredCount === 1 ? '' : 's'}
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              Includes Customers, Products &<br />Price Histories automatically
            </div>
          </div>

          {exportedCount !== null && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Export file generated and downloaded ({exportedCount} documents).</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || filteredCount === 0}
              className="flex-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Exporting...' : 'DOWNLOAD EXPORT FILE'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
