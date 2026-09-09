import React, { useState } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import { BusinessDocument } from '../../types';
import { formatIndianCurrency } from '../../utils/indianNumbering';

interface CancelDocumentModalProps {
  document: BusinessDocument | null;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export const CancelDocumentModal: React.FC<CancelDocumentModalProps> = ({
  document: doc,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!doc) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a valid cancellation reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err: any) {
      alert(`Error cancelling document: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <XCircle className="w-6 h-6" />
        </div>

        <div className="text-center">
          <h3 className="text-base font-black text-slate-900">Cancel Document</h3>
          <p className="text-xs text-slate-500 mt-1">
            Are you sure you want to cancel <strong className="text-slate-900">{doc.docNumber}</strong>?
          </p>
        </div>

        <div className="p-3 bg-red-50/50 rounded-xl border border-red-200 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-600">Customer:</span>
            <span className="font-bold text-slate-900">{doc.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Amount:</span>
            <span className="font-bold text-red-700">{formatIndianCurrency(doc.grandTotal)}</span>
          </div>
          <div className="text-[11px] text-red-600 font-medium pt-1 border-t border-red-100">
            Note: The document number will remain reserved and will not be re-issued. It will appear as CANCELLED in MIS and audit reports.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Cancellation Reason *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Order cancelled by buyer, Incorrect GSTIN billed, Wrong product selection..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-red-100 focus:border-red-600"
              required
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
