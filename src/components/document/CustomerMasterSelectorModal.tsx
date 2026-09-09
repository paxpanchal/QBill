import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, Building2, MapPin, Phone, Mail } from 'lucide-react';
import { Customer } from '../../types';

interface CustomerMasterSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  initialQuery?: string;
}

export const CustomerMasterSelectorModal: React.FC<CustomerMasterSelectorModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSelectCustomer,
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // Sync initial query when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    const activeList = customers.filter(c => c.active !== false);
    if (!searchQuery.trim()) return activeList;
    const q = searchQuery.toLowerCase().trim();
    return activeList.filter(
      c =>
        c.customerName?.toLowerCase().includes(q) ||
        c.gstin?.toLowerCase().includes(q) ||
        c.contactNumber?.toLowerCase().includes(q) ||
        c.state?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.pinCode?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  if (!isOpen) return null;

  return createPortal(
    <div className="lg:hidden">
      {/* ========================================================================= */}
      {/* 1. MOBILE BOTTOM SHEET (< 768px)                                         */}
      {/* ========================================================================= */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end md:hidden"
        onClick={onClose}
        style={{ margin: 0, padding: 0 }}
      >
        <div
          className="w-full max-w-full bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 overflow-hidden flex flex-col max-h-[85vh] box-border animate-in slide-in-from-bottom duration-200"
          style={{
            maxWidth: '100vw',
            boxSizing: 'border-box',
            paddingBottom: 'env(safe-area-inset-bottom, 12px)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Mobile Sheet Drag Indicator */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

          {/* Mobile Sheet Header (Fixed) */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                  SELECT CUSTOMER
                </div>
                <div className="text-[10px] text-slate-500">
                  Customer Master ({filteredCustomers.length} available)
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-black text-xs flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <X className="w-4 h-4" />
              <span>CLOSE</span>
            </button>
          </div>

          {/* Mobile Search Field (Fixed below header) */}
          <div className="p-3 bg-white border-b border-slate-200 shrink-0">
            <div className="text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
              <span>Search Customer</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
            <div className="relative w-full" style={{ boxSizing: 'border-box' }}>
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer by name, GSTIN, city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 box-border"
                style={{
                  boxSizing: 'border-box',
                  width: '100%',
                  maxWidth: '100%',
                }}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Customer List (Vertically scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 overscroll-contain">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <Building2 className="w-10 h-10 mx-auto text-slate-300" />
                <div className="text-xs font-bold text-slate-600">No matching customers found</div>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Try searching by customer name, GSTIN, or city.
                </p>
              </div>
            ) : (
              filteredCustomers.map(cust => (
                <div
                  key={cust.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 transition-all space-y-2.5"
                  style={{ boxSizing: 'border-box' }}
                >
                  {/* Customer Name */}
                  <div
                    className="font-black text-slate-900 text-sm leading-snug break-words"
                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  >
                    {cust.customerName}
                  </div>

                  {/* GSTIN and Location Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        GSTIN
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-xs break-all block">
                        {cust.gstin || 'Unregistered'}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Location & PIN
                      </span>
                      <span className="font-semibold text-slate-800 text-xs truncate block">
                        {cust.state || 'Gujarat'} {cust.pinCode ? `(${cust.pinCode})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Contact Information */}
                  {(cust.contactNumber || cust.email) && (
                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                      {cust.contactNumber && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.contactNumber}</span>
                        </span>
                      )}
                      {cust.email && (
                        <span
                          className="flex items-center gap-1 break-all"
                          style={{ wordBreak: 'break-all' }}
                        >
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{cust.email}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Select Customer Action */}
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(cust)}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>SELECT CUSTOMER</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Mobile Bottom Sheet Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TABLET CENTERED MODAL (768px - 1024px, md:flex lg:hidden)             */}
      {/* ========================================================================= */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden md:flex lg:hidden items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Tablet Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Select Customer Master
                </div>
                <div className="text-xs text-slate-500">
                  {filteredCustomers.length} matching customers found
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tablet Search Bar */}
          <div className="p-4 bg-white border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer by name, GSTIN, city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tablet Customer List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <Building2 className="w-10 h-10 mx-auto text-slate-300" />
                <div className="text-xs font-bold text-slate-600">No matching customers found</div>
                <p className="text-xs text-slate-400">Try refining your search query.</p>
              </div>
            ) : (
              filteredCustomers.map(cust => (
                <div
                  key={cust.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 flex items-center justify-between gap-3 bg-white hover:bg-indigo-50/20 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {cust.customerName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-1 font-mono">
                      <span>GSTIN: {cust.gstin || 'Unregistered'}</span>
                      <span>•</span>
                      <span className="font-sans text-slate-700">{cust.state || 'Gujarat'}</span>
                      {cust.pinCode && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-indigo-700 font-semibold">PIN: {cust.pinCode}</span>
                        </>
                      )}
                    </div>
                    {cust.contactNumber && (
                      <div className="text-[10px] text-slate-400 mt-1">
                        📞 {cust.contactNumber}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(cust)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shrink-0 cursor-pointer shadow-xs"
                  >
                    Select
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
