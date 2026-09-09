import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  Building2,
  MapPin,
  Phone,
  Mail,
  Receipt,
  History,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Customer, BusinessDocument, CustomerProductPriceHistory } from '../../types';
import { dbService } from '../../services/storage';
import { exportCustomersToCSV, downloadCustomerTemplateCSV } from '../../utils/excelExport';
import { INDIAN_STATES, extractStateCodeFromGSTIN, getStateByCode } from '../../utils/gstStates';
import { formatIndianCurrency, formatDate } from '../../utils/indianNumbering';
import { useAuth } from '../../context/AuthContext';
import { extractPinCodeFromAddress } from '../../services/ewayBillService';

export const CustomerMaster: React.FC = () => {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [priceHistories, setPriceHistories] = useState<CustomerProductPriceHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Customer Intelligence Drawer
  const [intelligenceCustomer, setIntelligenceCustomer] = useState<Customer | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState('Gujarat');
  const [stateCode, setStateCode] = useState('24');
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const [custs, docs, phs] = await Promise.all([
      dbService.getCustomers(),
      dbService.getDocuments(),
      dbService.getPriceHistories(),
    ]);
    setCustomers(custs);
    setDocuments(docs);
    setPriceHistories(phs);
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setCustomerName('');
    setAddress('');
    setCity('');
    setPinCode('');
    setGstin('');
    setContactNumber('');
    setEmail('');
    setState('Gujarat');
    setStateCode('24');
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setCustomerName(cust.customerName);
    setAddress(cust.address);
    setCity(cust.city || '');
    setPinCode(cust.pinCode || extractPinCodeFromAddress(cust.address) || '');
    setGstin(cust.gstin);
    setContactNumber(cust.contactNumber);
    setEmail(cust.email);
    setState(cust.state);
    setStateCode(cust.stateCode);
    setActive(cust.active);
    setIsModalOpen(true);
  };

  const handleGstinChange = (val: string) => {
    setGstin(val);
    const code = extractStateCodeFromGSTIN(val);
    if (code) {
      setStateCode(code);
      const st = getStateByCode(code);
      if (st) setState(st.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Please enter a Customer Name');
      return;
    }

    const cleanPin = pinCode.trim().replace(/\D/g, '');
    if (!cleanPin) {
      alert('Customer PIN Code is required.');
      return;
    }
    if (cleanPin.length !== 6 || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
      alert('Customer PIN Code must be a valid 6-digit Indian PIN code (e.g. 380001).');
      return;
    }

    const nowIso = new Date().toISOString();
    const custId = editingCustomer?.id || `CUST-${Date.now()}`;

    const customerToSave: Customer = {
      id: custId,
      customerName: customerName.trim(),
      address: address.trim(),
      city: city.trim(),
      pinCode: cleanPin,
      gstin: gstin.trim().toUpperCase(),
      contactNumber: contactNumber.trim(),
      email: email.trim(),
      state,
      stateCode,
      active,
      createdDate: editingCustomer?.createdDate || nowIso,
      lastUpdatedDate: nowIso,
    };

    await dbService.saveCustomer(customerToSave);
    await dbService.logAudit(
      currentUser?.id || 'USR-001',
      currentUser?.displayName || 'User',
      editingCustomer ? 'CUSTOMER_UPDATED' : 'CUSTOMER_CREATED',
      'CUSTOMER',
      `Customer ${customerToSave.customerName} (${customerToSave.gstin || 'Unregistered'}) saved.`,
      undefined,
      customerToSave.id
    );

    setIsModalOpen(false);
    loadCustomers();
  };

  const handleDelete = async (cust: Customer) => {
    if (confirm(`Are you sure you want to delete customer "${cust.customerName}"?`)) {
      await dbService.deleteCustomer(cust.id);
      await dbService.logAudit(
        currentUser?.id || 'USR-001',
        currentUser?.displayName || 'User',
        'CUSTOMER_DELETED',
        'CUSTOMER',
        `Customer ${cust.customerName} deleted.`,
        undefined,
        cust.id
      );
      loadCustomers();
    }
  };

  // Bulk CSV Upload Handler
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        alert('File is empty or contains only headers.');
        return;
      }

      let addedCount = 0;
      const nowIso = new Date().toISOString();

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        let cName = '';
        let cAddr = '';
        let cPin = '';
        let cGstin = '';
        let cContact = '';
        let cEmail = '';
        let cState = '';
        let cStateCode = '';

        if (cols.length >= 8) {
          // Template with PIN: [Name, Address, PIN, GSTIN, Contact, Email, State, StateCode]
          [cName, cAddr, cPin, cGstin, cContact, cEmail, cState, cStateCode] = cols;
        } else {
          // Legacy template: [Name, Address, GSTIN, Contact, Email, State, StateCode]
          [cName, cAddr, cGstin, cContact, cEmail, cState, cStateCode] = cols;
        }

        const resolvedPin = (cPin || extractPinCodeFromAddress(cAddr) || '').replace(/\D/g, '').slice(0, 6) || '380001';

        if (cName) {
          const newCust: Customer = {
            id: `CUST-CSV-${Date.now()}-${i}`,
            customerName: cName,
            address: cAddr || '',
            pinCode: resolvedPin,
            gstin: cGstin?.toUpperCase() || '',
            contactNumber: cContact || '',
            email: cEmail || '',
            state: cState || 'Gujarat',
            stateCode: cStateCode || '24',
            active: true,
            createdDate: nowIso,
            lastUpdatedDate: nowIso,
          };
          await dbService.saveCustomer(newCust);
          addedCount++;
        }
      }

      alert(`Successfully imported ${addedCount} customers.`);
      loadCustomers();
    };
    reader.readAsText(file);
  };

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (statusFilter === 'ACTIVE' && !c.active) return false;
      if (statusFilter === 'INACTIVE' && c.active) return false;
      if (stateFilter !== 'ALL' && c.state !== stateFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.customerName.toLowerCase().includes(query);
        const matchesGstin = c.gstin.toLowerCase().includes(query);
        const matchesContact = c.contactNumber.includes(query);
        const matchesEmail = c.email.toLowerCase().includes(query);
        if (!matchesName && !matchesGstin && !matchesContact && !matchesEmail) return false;
      }
      return true;
    });
  }, [customers, searchQuery, stateFilter, statusFilter]);

  // Customer Intelligence Metrics for Drawer
  const intelligenceData = useMemo(() => {
    if (!intelligenceCustomer) return null;
    const clientDocs = documents.filter(
      d =>
        d.status !== 'CANCELLED' &&
        (d.customerId === intelligenceCustomer.id ||
          d.customerName.toLowerCase() === intelligenceCustomer.customerName.toLowerCase())
    );

    const invoices = clientDocs.filter(d => d.docType === 'INVOICE');
    const quotations = clientDocs.filter(d => d.docType === 'QUOTATION');
    const totalSpent = invoices.reduce((sum, d) => sum + d.grandTotal, 0);

    const clientPrices = priceHistories.filter(
      p =>
        p.customerId === intelligenceCustomer.id ||
        p.customerName.toLowerCase() === intelligenceCustomer.customerName.toLowerCase()
    );

    const lastDoc = clientDocs[0]; // sorted newest first

    return {
      totalDocs: clientDocs.length,
      invoiceCount: invoices.length,
      quotationCount: quotations.length,
      totalSpent,
      lastInvoiceDate: lastDoc?.docDate || 'No orders yet',
      lastDocNumber: lastDoc?.docNumber || '-',
      clientPrices,
      recentDocs: clientDocs.slice(0, 5),
    };
  }, [intelligenceCustomer, documents, priceHistories]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Customer Master Registry</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage clients, billing addresses, GSTIN records, and price intelligence.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Template */}
          <button
            onClick={downloadCustomerTemplateCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download CSV Import Template"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV Template</span>
          </button>

          {/* Bulk Import */}
          <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
          </label>

          {/* Export */}
          <button
            onClick={() => exportCustomersToCSV(filteredCustomers)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Add New */}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, GSTIN, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* State Filter */}
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-slate-50 font-medium"
          >
            <option value="ALL">All States</option>
            {INDIAN_STATES.map(s => (
              <option key={s.code} value={s.name}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-slate-50 font-medium"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-900 text-white uppercase font-black text-[10px] tracking-wider">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-3">GSTIN / UIN</th>
                <th className="py-3 px-3">State & Code</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Intelligence</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customers found. Click "+ Add Customer" or Import CSV.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Customer Name & Address */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{cust.customerName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[280px]">
                        {cust.address || 'No address specified'}
                      </div>
                      {(cust.pinCode || extractPinCodeFromAddress(cust.address)) && (
                        <div className="text-[10px] text-indigo-700 font-mono font-bold mt-0.5">
                          PIN: {cust.pinCode || extractPinCodeFromAddress(cust.address)}
                        </div>
                      )}
                    </td>

                    {/* GSTIN */}
                    <td className="py-3 px-3 font-mono font-bold text-indigo-950">
                      {cust.gstin || (
                        <span className="text-slate-400 font-normal">Unregistered</span>
                      )}
                    </td>

                    {/* State */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{cust.state}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Code: {cust.stateCode}</div>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-3 text-slate-700">
                      <div>{cust.contactNumber || '-'}</div>
                      <div className="text-[10px] text-slate-400">{cust.email || '-'}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cust.active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {cust.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Intelligence / Insights */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setIntelligenceCustomer(cust)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors"
                      >
                        Insights
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          title="Edit Customer"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cust)}
                          title="Delete Customer"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Apex Industrial Solutions Pvt Ltd"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Billing Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Plot No., Road, Industrial Area"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    City / Place
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Surat, Mumbai"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Customer PIN Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6 digits (e.g. 380001)"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Mandatory 6-digit Indian Postal Code
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    GSTIN / UIN
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={e => handleGstinChange(e.target.value)}
                    placeholder="24AABCS1234F1Z1"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono uppercase font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    placeholder="+91 98250 00000"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    State & State Code
                  </label>
                  <select
                    value={stateCode}
                    onChange={e => {
                      const code = e.target.value;
                      setStateCode(code);
                      const st = getStateByCode(code);
                      if (st) setState(st.name);
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => setActive(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Active Customer</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    Save Customer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Intelligence Insights Drawer */}
      {intelligenceCustomer && intelligenceData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Client Intelligence & Purchase History
                </h3>
                <p className="text-xs text-slate-500 font-bold">{intelligenceCustomer.customerName}</p>
              </div>
              <button
                onClick={() => setIntelligenceCustomer(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Total Invoiced</div>
                <div className="font-extrabold text-indigo-950 text-sm mt-0.5">
                  {formatIndianCurrency(intelligenceData.totalSpent)}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Orders Placed</div>
                <div className="font-extrabold text-emerald-950 text-sm mt-0.5">
                  {intelligenceData.invoiceCount} Invoices
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Last Activity</div>
                <div className="font-extrabold text-amber-950 text-xs mt-0.5">
                  {formatDate(intelligenceData.lastInvoiceDate)}
                </div>
              </div>
            </div>

            {/* Product Specific Historical Rates */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Customer-Specific Pricing Registry
              </div>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-2 text-right">Last Price (₹)</th>
                      <th className="py-2 px-2 text-right">Previous (₹)</th>
                      <th className="py-2 px-3 text-right">Last Bill</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {intelligenceData.clientPrices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">
                          No product rates recorded yet for this client.
                        </td>
                      </tr>
                    ) : (
                      intelligenceData.clientPrices.map((cp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{cp.productName}</td>
                          <td className="py-2 px-2 text-right font-extrabold text-indigo-900">
                            {formatIndianCurrency(cp.lastPrice)}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-500">
                            {cp.previousPrice ? formatIndianCurrency(cp.previousPrice) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-[10px] text-slate-600">
                            {cp.lastDocNumber}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setIntelligenceCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
