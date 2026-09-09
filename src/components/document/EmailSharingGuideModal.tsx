import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Copy,
  Check,
  Download,
  ExternalLink,
  X,
  Building2,
  User,
  FileText,
  Save,
  CheckCircle2,
  Paperclip,
  Info
} from 'lucide-react';
import { BusinessDocument, AppSettings, Customer } from '../../types';
import { dbService } from '../../services/storage';
import { formatDateFull, formatIndianCurrency, formatDate } from '../../utils/indianNumbering';
import { downloadDocumentAsPdf } from '../../utils/pdfGenerator';

interface EmailSharingGuideModalProps {
  document: BusinessDocument;
  settings: AppSettings | null;
  isOpen: boolean;
  onClose: () => void;
  onEmailUpdated?: (email: string) => void;
}

export const EmailSharingGuideModal: React.FC<EmailSharingGuideModalProps> = ({
  document: doc,
  settings,
  isOpen,
  onClose,
  onEmailUpdated,
}) => {
  const [customerEmail, setCustomerEmail] = useState<string>(doc.customerEmail || '');
  const [subject, setSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isSavingEmail, setIsSavingEmail] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [availableCustomerEmails, setAvailableCustomerEmails] = useState<string[]>([]);
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);

  // Business Name from Settings
  const businessName = settings?.business?.businessName || 'Pramukhraj Enterprises';
  const businessAddress = `${settings?.business?.address || 'Plot No. 42-45, GIDC Industrial Estate, Phase-II'}, ${settings?.business?.city || 'Ahmedabad'}, ${settings?.business?.state || 'Gujarat'} - ${settings?.business?.pinCode || '382415'}`;
  const businessPhone = settings?.business?.primaryContact || '+91 98250 12345';
  const businessGstin = settings?.business?.gstin || '';
  const isInvoice = doc.docType === 'INVOICE';
  const docTypeName = isInvoice ? 'Invoice' : 'Quotation';
  const docDateFormatted = formatDateFull(doc.docDate);

  // Load customer details from Customer Master
  useEffect(() => {
    if (!isOpen) return;

    const findCustomer = async () => {
      try {
        const customers = await dbService.getCustomers();
        let found: Customer | undefined;

        if (doc.customerId) {
          found = customers.find(c => c.id === doc.customerId);
        }
        if (!found && doc.customerName) {
          found = customers.find(
            c => c.customerName.trim().toLowerCase() === doc.customerName.trim().toLowerCase()
          );
        }

        if (found) {
          setMatchedCustomer(found);
          const emails: string[] = [];
          if (found.email) emails.push(found.email);
          if (doc.customerEmail && !emails.includes(doc.customerEmail)) {
            emails.push(doc.customerEmail);
          }
          setAvailableCustomerEmails(emails);

          if (!customerEmail && found.email) {
            setCustomerEmail(found.email);
          }
        }
      } catch (err) {
        console.error('Failed to lookup customer email:', err);
      }
    };

    findCustomer();
  }, [isOpen, doc.customerId, doc.customerName]);

  // Generate Subject
  useEffect(() => {
    const generatedSubject = isInvoice
      ? `Invoice from ${businessName} – Invoice No. ${doc.docNumber} – ${docDateFormatted}`
      : `Quotation from ${businessName} – Quotation No. ${doc.docNumber} – ${docDateFormatted}`;
    setSubject(generatedSubject);
  }, [doc.docNumber, doc.docDate, isInvoice, businessName, docDateFormatted]);

  // Generate Email Body
  useEffect(() => {
    const itemsText = (doc.items || [])
      .map((it) => {
        const itemTotal = Number(it.totalWithTax ?? it.amount ?? 0);
        const formattedItemTotal = isNaN(itemTotal)
          ? '0.00'
          : itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const unitStr = (it as any).unit ? ` ${(it as any).unit}` : '';
        return `${it.productName || 'Item'} – Qty: ${it.quantity || 0}${unitStr} – ₹ ${formattedItemTotal}`;
      })
      .join('\n\n');

    const formattedGrandTotal = formatIndianCurrency(Number(doc.grandTotal || 0));

    let body = '';
    if (isInvoice) {
      body = `Hi ${doc.customerName || 'Customer'},

Greetings from ${businessName}.

Please find attached the Invoice for your reference.

Invoice Number: ${doc.docNumber}
Invoice Date: ${formatDate(doc.docDate)}
Invoice Value: ${formattedGrandTotal}

Products / Services:

${itemsText}

Please review the attached Invoice.

If you have any questions or require any clarification, please feel free to contact us.

Thank you for your business.

Regards,

${businessName}
${businessAddress}
Phone: ${businessPhone}${businessGstin ? `\nGSTIN: ${businessGstin}` : ''}`;
    } else {
      body = `Hi ${doc.customerName || 'Customer'},

Greetings from ${businessName}.

Please find attached our Quotation for your reference and consideration.

Quotation Number: ${doc.docNumber}
Quotation Date: ${formatDate(doc.docDate)}
Quotation Value: ${formattedGrandTotal}

Products / Services Quoted:

${itemsText}

Please review the attached Quotation.

If you have any questions or require any clarification, please feel free to contact us.

We look forward to the opportunity to serve you.

Regards,

${businessName}
${businessAddress}
Phone: ${businessPhone}${businessGstin ? `\nGSTIN: ${businessGstin}` : ''}`;
    }

    setEmailBody(body);
  }, [doc, businessName, businessAddress, businessPhone, businessGstin, isInvoice]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`✓ Copied ${label} to Clipboard`);
    } catch (err) {
      // Fallback
      const textArea = window.document.createElement('textarea');
      textArea.value = text;
      window.document.body.appendChild(textArea);
      textArea.select();
      window.document.execCommand('copy');
      window.document.body.removeChild(textArea);
      showToast(`✓ Copied ${label} to Clipboard`);
    }
  };

  const handleCopyAll = () => {
    const fullText = `To:
${customerEmail || '(Enter Customer Email)'}

Subject:
${subject}

Body:
${emailBody}`;
    copyToClipboard(fullText, 'All Email Details');
  };

  const handleSaveEmailToCustomer = async () => {
    if (!customerEmail.trim()) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsSavingEmail(true);
    try {
      let targetCustomer = matchedCustomer;
      if (!targetCustomer && doc.customerId) {
        const custs = await dbService.getCustomers();
        targetCustomer = custs.find(c => c.id === doc.customerId) || null;
      }

      if (targetCustomer) {
        const updated: Customer = {
          ...targetCustomer,
          email: customerEmail.trim(),
          lastUpdatedDate: new Date().toISOString(),
        };
        await dbService.saveCustomer(updated);
        setMatchedCustomer(updated);
        showToast('✓ Saved Email to Customer Master');
      } else {
        showToast('✓ Email saved for current session');
      }

      if (onEmailUpdated) {
        onEmailUpdated(customerEmail.trim());
      }
    } catch (err: any) {
      console.error('Failed to save email to Customer Master:', err);
      alert(`Could not save email: ${err.message}`);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleOpenEmailApp = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(customerEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
    showToast('Opening default email application...');
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadDocumentAsPdf(doc, settings, doc.copyType || 'ORIGINAL');
      showToast('✓ PDF Downloaded (Ready to attach)');
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Could not download PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
              <Mail className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-white">
                  Email Sharing Guide
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[11px] font-bold font-mono">
                  {doc.docNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ready-to-use email format for {docTypeName} • Copy, paste in your email client & attach PDF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Guidance Banner */}
        <div className="bg-indigo-50/90 border-b border-indigo-100 px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-950">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Follow 4 easy steps: <strong>1. Copy Details</strong> → <strong>2. Open Gmail/Mail</strong> → <strong>3. Paste</strong> → <strong>4. Attach PDF & Send</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs hover:bg-indigo-50/50"
          >
            <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isDownloadingPdf ? 'Downloading PDF...' : 'Download PDF to Attach'}</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs text-slate-800">
          {/* TO Field */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>To (Customer Email)</span>
              </label>

              <div className="flex items-center gap-2">
                {matchedCustomer && customerEmail && customerEmail !== matchedCustomer.email && (
                  <button
                    type="button"
                    onClick={handleSaveEmailToCustomer}
                    disabled={isSavingEmail}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    <span>{isSavingEmail ? 'Saving...' : 'Save to Customer Master'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => copyToClipboard(customerEmail || '', 'Recipient Email')}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Email</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="customer@business.com (Enter customer email if not found)"
                className="flex-1 p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
              {availableCustomerEmails.length > 1 && (
                <select
                  onChange={e => setCustomerEmail(e.target.value)}
                  value={customerEmail}
                  className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  {availableCustomerEmails.map((em, idx) => (
                    <option key={idx} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {matchedCustomer && !matchedCustomer.email && (
              <p className="text-[11px] text-amber-700 font-medium">
                Tip: Customer '{matchedCustomer.customerName}' does not have an email saved. Enter it above to optionally save it to Customer Master.
              </p>
            )}
          </div>

          {/* SUBJECT Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Subject</span>
              </label>
              <button
                type="button"
                onClick={() => copyToClipboard(subject, 'Subject Line')}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Subject</span>
              </button>
            </div>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
            />
          </div>

          {/* EMAIL BODY Field (Editable) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Email Body (Editable)</span>
              </label>
              <button
                type="button"
                onClick={() => copyToClipboard(emailBody, 'Email Body')}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Email Body</span>
              </button>
            </div>
            <textarea
              rows={9}
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 font-sans text-xs text-slate-900 leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 resize-y"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 sm:px-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Copy All (To, Subject, Body)</span>
            </button>

            <button
              type="button"
              onClick={handleOpenEmailApp}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Open your default email client (Gmail, Outlook, Mail app)"
            >
              <ExternalLink className="w-4 h-4 text-indigo-600" />
              <span>Open Email App</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 bg-slate-950 text-white px-5 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
