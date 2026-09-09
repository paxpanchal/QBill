import React from 'react';
import {
  FilePlus2,
  FileText,
  Clock,
  ArrowRight,
  Menu,
  ShieldCheck,
  Building2,
  Sparkles,
  Zap,
  Upload,
  ArrowRightLeft,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BackupStatusBanner } from '../backup/BackupStatusBanner';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface HomePageProps {
  onCreateInvoice: () => void;
  onCreateQuotation: () => void;
  onOpenMenu: () => void;
  onNavigate: (view: any) => void;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
  onOpenRecoveryKit?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onCreateInvoice,
  onCreateQuotation,
  onOpenMenu,
  onNavigate,
  onOpenExport,
  onOpenImport,
  onOpenRecoveryKit,
}) => {
  const { currentUser } = useAuth();

  return (
    <div className="max-w-4xl mx-auto py-3 sm:py-6 px-2 sm:px-4 space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Welcome Banner with QuickBill PRP Identity */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center relative overflow-hidden">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-slate-900 text-white font-black text-xl shadow-md shadow-indigo-200 mb-3 border border-indigo-400/30">
          PRP
        </div>

        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            QuickBill <span className="text-indigo-600">PRP</span>
          </h1>
        </div>

        <p className="text-xs sm:text-sm font-semibold text-slate-600">
          Smart Business. Simplified. • Professional Invoicing & MIS
        </p>

        <div className="mt-2 flex items-center justify-center gap-2">
          <p className="text-xs sm:text-sm font-bold text-indigo-700">
            Welcome back, {currentUser?.displayName || 'Paras'}
          </p>
          {currentUser?.role === 'Admin' || currentUser?.role === 'ADMIN' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3 h-3" /> Admin
            </span>
          ) : null}
        </div>
      </div>

      {/* Real-Time Backup Status Tracker Banner */}
      <BackupStatusBanner
        onOpenExport={onOpenExport}
        onOpenImport={onOpenImport}
        onOpenRecoveryKit={onOpenRecoveryKit}
      />

      {/* Main 3 Large Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* 1. CREATE INVOICE */}
        <button
          type="button"
          onClick={onCreateInvoice}
          className="group relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 active:scale-[0.98] text-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-200 flex flex-col items-center text-center cursor-pointer border border-indigo-500/30"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white mb-4 group-hover:scale-110 group-hover:bg-white/20 transition-all">
            <FilePlus2 className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-1">
            Standard GST Document
          </span>

          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mb-2">
            CREATE INVOICE
          </h2>

          <p className="text-xs text-indigo-100 font-medium leading-relaxed">
            Generate official GST Tax Invoice with auto calculations, customer prices & PDF download.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold bg-white text-indigo-900 px-4 py-2 rounded-xl shadow-xs group-hover:bg-indigo-50 transition-colors">
            <span>Start Invoice</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* 2. CREATE QUOTATION */}
        <button
          type="button"
          onClick={onCreateQuotation}
          className="group relative bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-900 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-md hover:shadow-xl transition-all duration-200 flex flex-col items-center text-center cursor-pointer border-2 border-slate-200 hover:border-amber-400"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-amber-100 transition-all">
            <FileText className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
            Estimate / Price Quote
          </span>

          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 mb-2">
            CREATE QUOTATION
          </h2>

          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Generate formal client quotations with 1-click conversion to Tax Invoice when approved.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold bg-slate-900 text-white px-4 py-2 rounded-xl shadow-xs group-hover:bg-amber-600 transition-colors">
            <span>Start Quotation</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* 3. PURCHASE ORDER (COMING SOON) */}
        <div className="relative bg-slate-50 text-slate-500 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center text-center select-none">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-200/80 text-slate-400 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 mb-2">
            COMING SOON
          </span>

          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-700 mb-2">
            PURCHASE ORDER
          </h2>

          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Vendor purchase orders, inventory tracking & incoming goods verification module.
          </p>

          <div className="mt-5 text-[11px] font-semibold text-slate-400">
            Available in next release
          </div>
        </div>
      </div>

      {/* Quick Menu & Multi-Device Transfer Shortcuts */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <Menu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-800">
              Multi-Device Sync & Navigation Menu
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500">
              Access All Documents, Customer Master, Product Master, Export/Import, and Settings.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenRecoveryKit && (
            <button
              type="button"
              onClick={onOpenRecoveryKit}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Recovery Guide</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenMenu}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            Open ☰ Menu
          </button>
        </div>
      </div>
    </div>
  );
};
