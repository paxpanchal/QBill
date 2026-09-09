import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Users,
  Package,
  ArrowUpRight,
  Filter,
  Calendar,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  Sparkles,
  ChevronRight,
  FileCheck2,
  FileText,
  Percent,
  Plus
} from 'lucide-react';
import { BusinessDocument, Customer, Product, UserAccount } from '../../types';
import { dbService } from '../../services/storage';
import { formatIndianCurrency, formatDate } from '../../utils/indianNumbering';

interface DashboardProps {
  onNavigate?: (page: string, params?: any) => void;
  onCreateInvoice?: () => void;
  onCreateQuotation?: () => void;
  onViewMIS?: (filterType: any, customer?: string, product?: string) => void;
  onViewDocument?: (doc: BusinessDocument) => void;
  onNavigateMaster?: (master: 'CUSTOMERS' | 'PRODUCTS') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onCreateInvoice,
  onCreateQuotation,
  onViewMIS,
  onViewDocument,
  onNavigateMaster,
}) => {
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_FY' | 'CUSTOM'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | 'INVOICE' | 'QUOTATION'>('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [fyFilter, setFyFilter] = useState('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docs, custs, prods, usrs] = await Promise.all([
        dbService.getDocuments(),
        dbService.getCustomers(),
        dbService.getProducts(),
        dbService.getUsers(),
      ]);
      setDocuments(docs);
      setCustomers(custs);
      setProducts(prods);
      setUsers(usrs);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Distinct Financial Years from documents
  const availableFYs = useMemo(() => {
    const set = new Set<string>();
    documents.forEach(d => {
      if (d.financialYear) set.add(d.financialYear);
    });
    return Array.from(set);
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (doc.status === 'CANCELLED') return false;

      // Doc Type
      if (docTypeFilter !== 'ALL' && doc.docType !== docTypeFilter) return false;

      // Customer
      if (customerFilter !== 'ALL' && doc.customerId !== customerFilter && doc.customerName !== customerFilter) {
        return false;
      }

      // User
      if (userFilter !== 'ALL' && doc.generatedBy !== userFilter && doc.generatedByName !== userFilter) {
        return false;
      }

      // Financial Year
      if (fyFilter !== 'ALL' && doc.financialYear !== fyFilter) {
        return false;
      }

      // Product
      if (productFilter !== 'ALL') {
        const hasProduct = doc.items.some(
          item => item.productId === productFilter || item.productName.toLowerCase().includes(productFilter.toLowerCase())
        );
        if (!hasProduct) return false;
      }

      // Date logic
      const docDate = new Date(doc.docDate);
      const now = new Date();

      if (dateRangeFilter === 'THIS_MONTH') {
        if (docDate.getMonth() !== now.getMonth() || docDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (dateRangeFilter === 'LAST_MONTH') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        if (docDate.getMonth() !== lastMonth || docDate.getFullYear() !== lastMonthYear) {
          return false;
        }
      } else if (dateRangeFilter === 'CUSTOM') {
        if (fromDate && doc.docDate < fromDate) return false;
        if (toDate && doc.docDate > toDate) return false;
      }

      return true;
    });
  }, [documents, dateRangeFilter, fromDate, toDate, customerFilter, productFilter, docTypeFilter, userFilter, fyFilter]);

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const invoices = filteredDocuments.filter(d => d.docType === 'INVOICE' && d.status === 'GENERATED');
    const quotations = filteredDocuments.filter(d => d.docType === 'QUOTATION' && d.status !== 'DRAFT');

    const totalInvoiceSales = invoices.reduce((sum, d) => sum + d.grandTotal, 0);
    const totalInvoices = invoices.length;
    const avgInvoiceValue = totalInvoices > 0 ? totalInvoiceSales / totalInvoices : 0;

    const totalQuotationValue = quotations.reduce((sum, d) => sum + d.grandTotal, 0);
    const totalQuotations = quotations.length;

    const totalTax = invoices.reduce((sum, d) => sum + d.totalTax, 0);
    const totalCgst = invoices.reduce((sum, d) => sum + d.cgst, 0);
    const totalSgst = invoices.reduce((sum, d) => sum + d.sgst, 0);
    const totalIgst = invoices.reduce((sum, d) => sum + d.igst, 0);

    const activeCustomers = customers.filter(c => c.active).length;

    const totalProductsSold = invoices.reduce((sum, d) => {
      return sum + d.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    return {
      totalInvoiceSales,
      totalInvoices,
      avgInvoiceValue,
      totalQuotationValue,
      totalQuotations,
      totalTax,
      totalCgst,
      totalSgst,
      totalIgst,
      activeCustomers,
      totalProductsSold,
    };
  }, [filteredDocuments, customers]);

  // Top Customers by revenue
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; totalRevenue: number; invoiceCount: number; lastDate: string }>();

    filteredDocuments
      .filter(d => d.docType === 'INVOICE' && d.status === 'GENERATED')
      .forEach(doc => {
        const current = map.get(doc.customerName) || {
          name: doc.customerName,
          totalRevenue: 0,
          invoiceCount: 0,
          lastDate: doc.docDate,
        };
        current.totalRevenue += doc.grandTotal;
        current.invoiceCount += 1;
        if (doc.docDate > current.lastDate) {
          current.lastDate = doc.docDate;
        }
        map.set(doc.customerName, current);
      });

    return Array.from(map.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [filteredDocuments]);

  // Top Products by revenue & quantity
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; totalQty: number; totalRevenue: number }>();

    filteredDocuments
      .filter(d => d.docType === 'INVOICE' && d.status === 'GENERATED')
      .forEach(doc => {
        doc.items.forEach(item => {
          const current = map.get(item.productName) || {
            name: item.productName,
            totalQty: 0,
            totalRevenue: 0,
          };
          current.totalQty += item.quantity;
          current.totalRevenue += item.amount;
          map.set(item.productName, current);
        });
      });

    return Array.from(map.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [filteredDocuments]);

  // Month-wise Sales Breakdown (Last 6 months)
  const monthWiseSales = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataMap = new Map<string, { monthName: string; invoiceTotal: number; quoteTotal: number }>();

    // Seed recent 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      dataMap.set(key, {
        monthName: `${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
        invoiceTotal: 0,
        quoteTotal: 0,
      });
    }

    filteredDocuments.forEach(doc => {
      const key = doc.docDate.substring(0, 7);
      if (dataMap.has(key)) {
        const item = dataMap.get(key)!;
        if (doc.docType === 'INVOICE' && doc.status === 'GENERATED') {
          item.invoiceTotal += doc.grandTotal;
        } else if (doc.docType === 'QUOTATION' && doc.status !== 'DRAFT') {
          item.quoteTotal += doc.grandTotal;
        }
      }
    });

    return Array.from(dataMap.values());
  }, [filteredDocuments]);

  const maxMonthValue = Math.max(...monthWiseSales.map(m => Math.max(m.invoiceTotal, m.quoteTotal)), 50000);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Business Performance Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time sales intelligence, GST collections, quotations, and client analytics.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('create-document', { type: 'INVOICE' })}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>

          <button
            onClick={() => onNavigate('create-document', { type: 'QUOTATION' })}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Create Quotation</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Dashboard Filters</span>
          </div>

          <button
            onClick={() => {
              setDateRangeFilter('ALL');
              setFromDate('');
              setToDate('');
              setCustomerFilter('ALL');
              setProductFilter('ALL');
              setDocTypeFilter('ALL');
              setUserFilter('ALL');
              setFyFilter('ALL');
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Date Range Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date Range</label>
            <select
              value={dateRangeFilter}
              onChange={e => setDateRangeFilter(e.target.value as any)}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-slate-50 font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
            >
              <option value="ALL">All Time</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer</label>
            <select
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-slate-50 font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 truncate"
            >
              <option value="ALL">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.customerName}
                </option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Product</label>
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-slate-50 font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 truncate"
            >
              <option value="ALL">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.productName}
                </option>
              ))}
            </select>
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Doc Type</label>
            <select
              value={docTypeFilter}
              onChange={e => setDocTypeFilter(e.target.value as any)}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-slate-50 font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
            >
              <option value="ALL">All Documents</option>
              <option value="INVOICE">Invoices Only</option>
              <option value="QUOTATION">Quotations Only</option>
            </select>
          </div>

          {/* Generated By User */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Created By</label>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-slate-50 font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
            >
              <option value="ALL">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Financial Year */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Financial Year</label>
            <select
              value={fyFilter}
              onChange={e => setFyFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-slate-50 font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
            >
              <option value="ALL">All FYs</option>
              {availableFYs.map(fy => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom date range row */}
        {dateRangeFilter === 'CUSTOM' && (
          <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-md border border-slate-300 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-md border border-slate-300 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Invoice Sales */}
        <div
          onClick={() => onNavigate('mis', { type: 'INVOICE' })}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {formatIndianCurrency(stats.totalInvoiceSales)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{stats.totalInvoices} Invoices Generated</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Avg Invoice Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Invoice Value</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {formatIndianCurrency(stats.avgInvoiceValue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Per Bill Average</div>
        </div>

        {/* Total Quotations */}
        <div
          onClick={() => onNavigate('mis', { type: 'QUOTATION' })}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quotations Value</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {formatIndianCurrency(stats.totalQuotationValue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{stats.totalQuotations} Quotations Created</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Total Tax (GST Breakdown) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tax Collected</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {formatIndianCurrency(stats.totalTax)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>CGST: ₹{Math.round(stats.totalCgst || 0).toLocaleString('en-IN')}</span>
            <span>SGST: ₹{Math.round(stats.totalSgst || 0).toLocaleString('en-IN')}</span>
            <span>IGST: ₹{Math.round(stats.totalIgst || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-indigo-900 font-semibold">Active Clients</div>
            <div className="text-base font-extrabold text-indigo-950">{stats.activeCustomers} Clients</div>
          </div>
        </div>

        <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-emerald-900 font-semibold">Units Sold</div>
            <div className="text-base font-extrabold text-emerald-950">{stats.totalProductsSold} Items</div>
          </div>
        </div>

        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-amber-900 font-semibold">Total Invoices</div>
            <div className="text-base font-extrabold text-amber-950">{stats.totalInvoices} Invoices</div>
          </div>
        </div>

        <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-700 font-semibold">All Records</div>
            <div className="text-base font-extrabold text-slate-900">{filteredDocuments.length} Documents</div>
          </div>
        </div>
      </div>

      {/* Visual Charts & Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month-wise Sales Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Sales & Quotation Volume</h2>
              <p className="text-xs text-slate-500">Invoice Revenue vs Quotations Issued (Last 6 Months)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-600 inline-block" />
                <span className="text-slate-600 font-medium">Invoices (₹)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
                <span className="text-slate-600 font-medium">Quotations (₹)</span>
              </div>
            </div>
          </div>

          {/* Custom SVG / HTML Bar Chart */}
          <div className="h-64 pt-6 flex items-end justify-between gap-3 sm:gap-6 border-b border-slate-200">
            {monthWiseSales.map((item, idx) => {
              const invHeight = maxMonthValue > 0 ? (item.invoiceTotal / maxMonthValue) * 100 : 0;
              const quoHeight = maxMonthValue > 0 ? (item.quoteTotal / maxMonthValue) * 100 : 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-48">
                    {/* Invoice Bar */}
                    <div
                      style={{ height: `${Math.max(invHeight, 4)}%` }}
                      className="w-1/2 max-w-[28px] bg-indigo-600 hover:bg-indigo-700 rounded-t-md transition-all relative group/bar"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/bar:block bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-10 font-bold">
                        ₹{Number(item.invoiceTotal || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Quotation Bar */}
                    <div
                      style={{ height: `${Math.max(quoHeight, 4)}%` }}
                      className="w-1/2 max-w-[28px] bg-amber-400 hover:bg-amber-500 rounded-t-md transition-all relative group/bar"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/bar:block bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-10 font-bold">
                        ₹{Number(item.quoteTotal || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-slate-600 truncate">{item.monthName}</span>
                </div>
              );
            })}
          </div>

          <div className="text-right text-[11px] text-slate-400">
            Click any bar to drill down into corresponding period in MIS
          </div>
        </div>

        {/* Top Customers Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Top Revenue Clients</h2>
            <button
              onClick={() => onNavigate('customers')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {topCustomers.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No client invoice activity recorded yet.</div>
            ) : (
              topCustomers.map((c, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate('mis', { customer: c.name })}
                  className="p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 truncate max-w-[180px]">
                      {idx + 1}. {c.name}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {formatIndianCurrency(c.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>{c.invoiceCount} Invoices</span>
                    <span>Last: {formatDate(c.lastDate)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Top Selling Products</h2>
            <p className="text-xs text-slate-500">Highest grossing inventory items and order volume</p>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
          >
            Manage Products
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3 text-right">Quantity Sold</th>
                <th className="py-2.5 px-3 text-right">Total Revenue (₹)</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No product transactions recorded yet.
                  </td>
                </tr>
              ) : (
                topProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-800">{p.name}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700">{p.totalQty} Units</td>
                    <td className="py-3 px-3 text-right font-bold text-indigo-950">
                      {formatIndianCurrency(p.totalRevenue)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigate('mis', { product: p.name })}
                        className="text-[11px] text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
