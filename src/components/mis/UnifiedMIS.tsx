import React, { useState, useEffect, useMemo } from 'react';
import {
  TableProperties,
  Search,
  Filter,
  Download,
  Printer,
  Share2,
  Edit3,
  Eye,
  History,
  XCircle,
  FileCheck,
  Calendar,
  FileSpreadsheet,
  ChevronDown,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Layers,
  Mail,
  Truck
} from 'lucide-react';
import { BusinessDocument, MISRecord, Customer, Product, UserAccount, DocumentType, DocumentStatus, AppSettings } from '../../types';
import { dbService } from '../../services/storage';
import { exportMISToExcel } from '../../utils/excelExport';
import { formatIndianCurrency, formatDate, formatDateTime } from '../../utils/indianNumbering';
import { downloadDocumentAsPdf } from '../../utils/pdfGenerator';
import { useAuth } from '../../context/AuthContext';
import { EmailSharingGuideModal } from '../document/EmailSharingGuideModal';
import { EwayBillExportModal } from '../document/EwayBillExportModal';

interface UnifiedMISProps {
  initialFilterType?: DocumentType | 'ALL';
  initialCustomer?: string;
  initialProduct?: string;
  onViewDocument: (doc: BusinessDocument) => void;
  onEditDocument: (doc: BusinessDocument) => void;
  onCancelDocument: (doc: BusinessDocument) => void;
  onConvertQuotation: (doc: BusinessDocument) => void;
  onViewHistory: (doc: BusinessDocument) => void;
}

export const UnifiedMIS: React.FC<UnifiedMISProps> = ({
  initialFilterType = 'ALL',
  initialCustomer = '',
  initialProduct = '',
  onViewDocument,
  onEditDocument,
  onCancelDocument,
  onConvertQuotation,
  onViewHistory,
}) => {
  const { currentUser, hasPermission } = useAuth();
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [misRecords, setMisRecords] = useState<MISRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailGuideDoc, setEmailGuideDoc] = useState<BusinessDocument | null>(null);
  const [ewayBillDoc, setEwayBillDoc] = useState<BusinessDocument | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeSlicer, setDocTypeSlicer] = useState<'ALL' | 'INVOICE' | 'QUOTATION' | 'DRAFT' | 'CANCELLED'>(
    initialFilterType === 'INVOICE' || initialFilterType === 'QUOTATION' ? initialFilterType : 'ALL'
  );
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState(initialCustomer || 'ALL');
  const [productFilter, setProductFilter] = useState(initialProduct || 'ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [fyFilter, setFyFilter] = useState('ALL');

  useEffect(() => {
    loadMIS();
  }, []);

  const loadMIS = async () => {
    setIsLoading(true);
    try {
      const [docs, records, custs, prods, usrs, appSettings] = await Promise.all([
        dbService.getDocuments(),
        dbService.getMISRecords(),
        dbService.getCustomers(),
        dbService.getProducts(),
        dbService.getUsers(),
        dbService.getSettings(),
      ]);
      // Sort newest first
      docs.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
      setDocuments(docs);
      setMisRecords(records);
      setCustomers(custs);
      setProducts(prods);
      setUsers(usrs);
      setSettings(appSettings);
    } catch (err) {
      console.error('Failed to load MIS records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowDownloadPdf = async (e: React.MouseEvent, docToDownload: BusinessDocument) => {
    e.stopPropagation();
    try {
      await downloadDocumentAsPdf(docToDownload, settings, 'ORIGINAL');
      if (currentUser) {
        await dbService.logAudit(
          currentUser.id,
          currentUser.displayName,
          'DOCUMENT_DOWNLOADED',
          'DOCUMENT',
          `${docToDownload.docType} ${docToDownload.docNumber} downloaded as PDF from MIS.`,
          docToDownload.docNumber,
          docToDownload.id
        );
      }
    } catch (err) {
      console.error('Failed to download PDF:', err);
      onViewDocument(docToDownload);
    }
  };

  // Distinct Financial Years
  const availableFYs = useMemo(() => {
    const set = new Set<string>();
    documents.forEach(d => {
      if (d.financialYear) set.add(d.financialYear);
    });
    return Array.from(set);
  }, [documents]);

  // Unified Multi-Filter Engine
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Slicer check
      if (docTypeSlicer === 'INVOICE' && (doc.docType !== 'INVOICE' || doc.status === 'CANCELLED')) return false;
      if (docTypeSlicer === 'QUOTATION' && (doc.docType !== 'QUOTATION' || doc.status === 'CANCELLED')) return false;
      if (docTypeSlicer === 'DRAFT' && doc.status !== 'DRAFT') return false;
      if (docTypeSlicer === 'CANCELLED' && doc.status !== 'CANCELLED') return false;

      // Global Search Bar: doc number, customer name, items, or user
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNumber = doc.docNumber.toLowerCase().includes(query);
        const matchesCustomer = doc.customerName.toLowerCase().includes(query);
        const matchesUser = doc.generatedByName.toLowerCase().includes(query);
        const matchesItems = doc.items.some(
          it =>
            it.productName.toLowerCase().includes(query) ||
            it.hsnSac.toLowerCase().includes(query)
        );
        if (!matchesNumber && !matchesCustomer && !matchesUser && !matchesItems) return false;
      }

      // Customer Filter
      if (customerFilter !== 'ALL') {
        if (doc.customerId !== customerFilter && doc.customerName !== customerFilter) {
          return false;
        }
      }

      // Product Filter
      if (productFilter !== 'ALL') {
        const hasProd = doc.items.some(
          it => it.productId === productFilter || it.productName.toLowerCase().includes(productFilter.toLowerCase())
        );
        if (!hasProd) return false;
      }

      // User Filter
      if (userFilter !== 'ALL') {
        if (doc.generatedBy !== userFilter && doc.generatedByName !== userFilter) return false;
      }

      // Financial Year Filter
      if (fyFilter !== 'ALL' && doc.financialYear !== fyFilter) return false;

      // Date Range Filters
      if (fromDate && doc.docDate < fromDate) return false;
      if (toDate && doc.docDate > toDate) return false;

      return true;
    });
  }, [documents, docTypeSlicer, searchQuery, customerFilter, productFilter, userFilter, fyFilter, fromDate, toDate]);

  // Formatted MIS Records from filtered documents
  const filteredMISRecords = useMemo(() => {
    return filteredDocuments.map(doc => {
      const productDetailsDisplay = (doc.items || [])
        .map((it, idx) => {
          const qty = it.quantity || 0;
          const rate = Number(it.rate || 0).toLocaleString('en-IN');
          const amt = Number(it.amount || 0).toLocaleString('en-IN');
          return `${idx + 1}. ${it.productName || 'Item'} [Qty: ${qty}, Rate: ₹${rate}, Amt: ₹${amt}]`;
        })
        .join('\n');

      return {
        id: doc.id,
        documentType: doc.docType,
        documentNumber: doc.docNumber,
        documentDate: doc.docDate,
        documentTime: doc.docTime,
        customerName: doc.customerName,
        productDetailsDisplay: productDetailsDisplay || 'No items',
        taxableValue: doc.taxableValue,
        cgst: doc.cgst,
        sgst: doc.sgst,
        igst: doc.igst,
        totalTax: doc.totalTax,
        freight: doc.freightCharges,
        otherCharges: doc.otherCharges,
        discount: doc.discountAmount,
        roundingOff: doc.roundingOff,
        grandTotal: doc.grandTotal,
        status: doc.status,
        generatedBy: doc.generatedByName,
        createdAt: doc.generatedAt,
        lastEditedBy: doc.lastEditedByName,
        lastEditedAt: doc.lastEditedAt,
        syncStatus: doc.syncStatus,
      };
    });
  }, [filteredDocuments]);

  // Aggregate Totals of Filtered Dataset
  const totals = useMemo(() => {
    const totalTaxable = filteredDocuments.reduce((sum, d) => sum + (d.status !== 'CANCELLED' ? d.taxableValue : 0), 0);
    const totalTax = filteredDocuments.reduce((sum, d) => sum + (d.status !== 'CANCELLED' ? d.totalTax : 0), 0);
    const totalGrand = filteredDocuments.reduce((sum, d) => sum + (d.status !== 'CANCELLED' ? d.grandTotal : 0), 0);
    return { totalTaxable, totalTax, totalGrand };
  }, [filteredDocuments]);

  const handleExportExcel = () => {
    exportMISToExcel(filteredMISRecords);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setDocTypeSlicer('ALL');
    setFromDate('');
    setToDate('');
    setCustomerFilter('ALL');
    setProductFilter('ALL');
    setUserFilter('ALL');
    setFyFilter('ALL');
  };

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TableProperties className="w-6 h-6 text-indigo-600" />
            <span>Unified MIS & Documents Registry</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete database of Invoices, Quotations, Drafts, line items, and audit logs.
          </p>
        </div>

        {/* Excel Export Button */}
        {hasPermission('excelExport') && (
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>EXPORT MIS TO EXCEL ({filteredDocuments.length})</span>
          </button>
        )}
      </div>

      {/* Slicers & Global Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Document Slicer Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['ALL', 'INVOICE', 'QUOTATION', 'DRAFT', 'CANCELLED'] as const).map(slicer => (
              <button
                key={slicer}
                onClick={() => setDocTypeSlicer(slicer)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  docTypeSlicer === slicer
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {slicer === 'ALL'
                  ? 'All Documents'
                  : slicer === 'INVOICE'
                  ? 'Invoices'
                  : slicer === 'QUOTATION'
                  ? 'Quotations'
                  : slicer === 'DRAFT'
                  ? 'Drafts'
                  : 'Cancelled'}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Doc No, Client, Product..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Detailed Multi-Filter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* From Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-50 font-medium"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-50 font-medium"
            />
          </div>

          {/* Customer */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Customer</label>
            <select
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-50 font-medium truncate"
            >
              <option value="ALL">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.customerName}>
                  {c.customerName}
                </option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Product</label>
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-50 font-medium truncate"
            >
              <option value="ALL">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.productName}>
                  {p.productName}
                </option>
              ))}
            </select>
          </div>

          {/* Generated By User */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Generated By</label>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-50 font-medium"
            >
              <option value="ALL">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.displayName}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Financial Year */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Financial Year</label>
              <select
                value={fyFilter}
                onChange={e => setFyFilter(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-50 font-medium"
              >
                <option value="ALL">All FYs</option>
                {availableFYs.map(fy => (
                  <option key={fy} value={fy}>
                    FY {fy}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={resetFilters}
              title="Reset All Filters"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold h-[35px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Summary Filter Bar Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs font-medium text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{filteredDocuments.length}</strong> matching documents
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>
              Taxable: <strong className="text-slate-900">{formatIndianCurrency(totals.totalTaxable)}</strong>
            </span>
            <span>
              Total Tax: <strong className="text-indigo-700">{formatIndianCurrency(totals.totalTax)}</strong>
            </span>
            <span>
              Grand Total: <strong className="text-emerald-700">{formatIndianCurrency(totals.totalGrand)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        MIS TABLE: ONE DOCUMENT = ONE ROW (All Specified Columns)
        ========================================================================
      */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-900 text-white uppercase font-black text-[10px] tracking-wider">
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Doc Number</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3 min-w-[200px]">Customer Name</th>
                <th className="py-3 px-3 min-w-[260px]">Product Details (Qty, Rate, Amt)</th>
                <th className="py-3 px-3 text-right">Taxable (₹)</th>
                <th className="py-3 px-3 text-right">CGST (₹)</th>
                <th className="py-3 px-3 text-right">SGST (₹)</th>
                <th className="py-3 px-3 text-right">IGST (₹)</th>
                <th className="py-3 px-3 text-right">Freight (₹)</th>
                <th className="py-3 px-3 text-right">Grand Total (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Generated By</th>
                <th className="py-3 px-3">Last Edited</th>
                <th className="py-3 px-3 text-center sticky right-0 bg-slate-900 z-10 shadow-l">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    No documents matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map(doc => {
                  const isInvoice = doc.docType === 'INVOICE';
                  const isCancelled = doc.status === 'CANCELLED';

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCancelled ? 'bg-red-50/30 opacity-70' : ''
                      }`}
                    >
                      {/* Type */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isInvoice
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {doc.docType}
                        </span>
                      </td>

                      {/* Doc Number */}
                      <td className="py-3 px-3 font-mono font-bold text-indigo-950">
                        {doc.docNumber}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formatDate(doc.docDate)}</div>
                        <div className="text-[10px] text-slate-400">{doc.docTime}</div>
                      </td>

                      {/* Customer Name */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{doc.customerName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {doc.customerGstin || 'Unregistered'} ({doc.customerState})
                        </div>
                      </td>

                      {/* Product Details (Formatted in one cell) */}
                      <td className="py-3 px-3 text-[11px] text-slate-700 whitespace-pre-line leading-relaxed max-w-[280px]">
                        {doc.items.map((it, idx) => (
                          <div key={idx} className="truncate">
                            <span className="font-semibold text-slate-900">{idx + 1}. {it.productName}</span>{' '}
                            <span className="text-slate-500 text-[10px]">
                              [Qty: {it.quantity}, ₹{it.rate}]
                            </span>
                          </div>
                        ))}
                      </td>

                      {/* Financial columns */}
                      <td className="py-3 px-3 text-right font-semibold text-slate-800">
                        {formatIndianCurrency(doc.taxableValue, false)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {formatIndianCurrency(doc.cgst, false)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {formatIndianCurrency(doc.sgst, false)}
                      </td>
                      <td className="py-3 px-3 text-right text-purple-700 font-semibold">
                        {formatIndianCurrency(doc.igst, false)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {formatIndianCurrency(doc.freightCharges, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-slate-950 text-xs">
                        {formatIndianCurrency(doc.grandTotal)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.status === 'GENERATED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.status === 'DRAFT'
                              ? 'bg-slate-200 text-slate-800'
                              : doc.status === 'CONVERTED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>

                      {/* Generated By */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{doc.generatedByName}</div>
                        <div className="text-[10px] text-slate-400">{doc.generatedAt.slice(0, 10)}</div>
                      </td>

                      {/* Last Edited */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        {doc.lastEditedByName ? (
                          <div>
                            <div className="font-semibold text-slate-800">{doc.lastEditedByName}</div>
                            <div className="text-[10px] text-slate-400">{doc.lastEditedAt?.slice(0, 10)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Actions Sticky Column */}
                      <td className="py-3 px-3 text-center sticky right-0 bg-white shadow-l">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Preview */}
                          <button
                            onClick={() => onViewDocument(doc)}
                            title="View Document Preview"
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Print / Reprint */}
                          {hasPermission('printDocument') && (
                            <button
                              onClick={() => onViewDocument(doc)}
                              title="Print / Reprint Document"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Download PDF */}
                          {hasPermission('downloadPdf') && (
                            <button
                              onClick={(e) => handleRowDownloadPdf(e, doc)}
                              title="Download PDF"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-indigo-900 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Email Sharing Guide */}
                          <button
                            onClick={() => setEmailGuideDoc(doc)}
                            title="Prepare Email Guide"
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* Prepare E-Way Bill (Only for Invoices) */}
                          {doc.docType === 'INVOICE' && !isCancelled && (
                            <button
                              onClick={() => setEwayBillDoc(doc)}
                              title="Prepare E-Way Bill JSON"
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          {!isCancelled && (hasPermission('editAllDocuments') || (hasPermission('editOwnDocuments') && doc.generatedBy === currentUser?.id)) && (
                            <button
                              onClick={() => onEditDocument(doc)}
                              title="Edit Document"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Convert (if quote) */}
                          {doc.docType === 'QUOTATION' && doc.status !== 'CONVERTED' && !isCancelled && (
                            <button
                              onClick={() => onConvertQuotation(doc)}
                              title="Convert to Invoice"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* View History */}
                          <button
                            onClick={() => onViewHistory(doc)}
                            title="Audit Change Trail"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Cancel */}
                          {!isCancelled && hasPermission('cancelDocument') && (
                            <button
                              onClick={() => onCancelDocument(doc)}
                              title="Cancel Document"
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Sharing Guide Modal */}
      {emailGuideDoc && (
        <EmailSharingGuideModal
          document={emailGuideDoc}
          settings={settings}
          isOpen={!!emailGuideDoc}
          onClose={() => setEmailGuideDoc(null)}
        />
      )}

      {/* E-Way Bill Export Modal */}
      {ewayBillDoc && (
        <EwayBillExportModal
          document={ewayBillDoc}
          settings={settings}
          isOpen={!!ewayBillDoc}
          onClose={() => setEwayBillDoc(null)}
        />
      )}
    </div>
  );
};
