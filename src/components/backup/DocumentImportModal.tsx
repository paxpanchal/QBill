import React, { useState, useRef } from 'react';
import { Download, Upload, ArrowRightLeft, AlertTriangle, CheckCircle2, FileText, Users, Package, X, ShieldAlert } from 'lucide-react';
import { dbService } from '../../services/storage';
import { ImportPreviewResult, UserAccount } from '../../types';

interface DocumentImportModalProps {
  isOpen: boolean;
  currentUser: UserAccount;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const DocumentImportModal: React.FC<DocumentImportModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [strategy, setStrategy] = useState<'SKIP' | 'OVERWRITE' | 'CREATE_NEW'>('SKIP');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      const previewResult = await dbService.validateAndPreviewImport(content);
      setPreview(previewResult);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (!preview || !preview.isValid) return;
    try {
      setIsProcessing(true);
      const res = await dbService.executeImportDocuments(
        preview,
        strategy,
        currentUser.id,
        currentUser.fullName
      );
      setResultMessage(
        `Import completed successfully! Added ${res.importedDocs} documents, ${res.newCustomers} new customers, and ${res.newProducts} new products.`
      );
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      console.error('Import execution error:', err);
      setResultMessage(`Import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImport = () => {
    setFileContent(null);
    setFileName('');
    setPreview(null);
    setResultMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">
                IMPORT DOCUMENT DATA
              </h2>
              <p className="text-xs text-slate-400">Merge invoices and quotations from another device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {resultMessage ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="font-extrabold text-sm text-emerald-900 uppercase tracking-wide">
                IMPORT FINISHED
              </div>
              <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                {resultMessage}
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : !preview ? (
            /* Upload Zone */
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-indigo-600 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 mx-auto flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-bold text-xs text-slate-800">
                  Click to select QuickBill Export or Backup JSON file
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  or drag and drop your export file here
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">Multi-Device Transfer Protocol:</div>
                <p>1. Export documents on Mobile / Laptop using <strong>Export Document Data</strong>.</p>
                <p>2. Send the <span className="font-mono bg-slate-200 px-1 py-0.5 rounded-sm">.json</span> file via WhatsApp, Email, or USB drive.</p>
                <p>3. Select it here to merge documents cleanly into this device without creating duplicate rows.</p>
              </div>
            </div>
          ) : !preview.isValid ? (
            /* Invalid File */
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Invalid Export File</span>
              </div>
              <p className="text-rose-700">{preview.errorMessage}</p>
              <button
                type="button"
                onClick={resetImport}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                Choose Another File
              </button>
            </div>
          ) : (
            /* Valid Preview and Strategy Selection */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="text-slate-500 font-medium">Loaded File:</div>
                  <div className="font-bold text-slate-900 font-mono text-xs">{fileName}</div>
                </div>
                <button
                  type="button"
                  onClick={resetImport}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Scanned Counts Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                  <div className="text-lg font-black text-indigo-700">{preview.totalDocumentsFound}</div>
                  <div className="text-[10px] font-bold text-indigo-900 uppercase">Documents Found</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-lg font-black text-emerald-700">{preview.newDocumentsCount}</div>
                  <div className="text-[10px] font-bold text-emerald-900 uppercase">New Documents</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="text-lg font-black text-amber-700">
                    {preview.potentialDuplicatesCount + preview.conflictsCount}
                  </div>
                  <div className="text-[10px] font-bold text-amber-900 uppercase">Existing Matches</div>
                </div>
              </div>

              {/* Master Snapshot Counts */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-around">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>New Customers to Add: <strong className="text-slate-900">{preview.newCustomersCount}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  <span>New Products to Add: <strong className="text-slate-900">{preview.newProductsCount}</strong></span>
                </div>
              </div>

              {/* Conflict Handling Strategy */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  How should existing duplicate documents be handled?
                </label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                    strategy === 'SKIP' ? 'bg-indigo-50 border-indigo-400' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === 'SKIP'}
                      onChange={() => setStrategy('SKIP')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Skip Duplicates (Recommended)</div>
                      <div className="text-[11px] text-slate-500">
                        Imports only new documents, new customers, and new products. Keeps your existing records intact.
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                    strategy === 'OVERWRITE' ? 'bg-indigo-50 border-indigo-400' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === 'OVERWRITE'}
                      onChange={() => setStrategy('OVERWRITE')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Overwrite / Update Existing Records</div>
                      <div className="text-[11px] text-slate-500">
                        Updates documents that match existing IDs or numbers with incoming data.
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                    strategy === 'CREATE_NEW' ? 'bg-indigo-50 border-indigo-400' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === 'CREATE_NEW'}
                      onChange={() => setStrategy('CREATE_NEW')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Import All with Auto-Generated Numbers</div>
                      <div className="text-[11px] text-slate-500">
                        If a document number conflicts, a new sequential document number is assigned automatically.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {preview && preview.isValid && !resultMessage && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isProcessing}
              className="flex-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>{isProcessing ? 'Merging Data...' : 'CONFIRM & MERGE DATA'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
