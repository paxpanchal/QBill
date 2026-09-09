import React, { useState } from 'react';
import {
  Home,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  LayoutDashboard,
  Users,
  Package,
  UserCog,
  Settings,
  Database,
  LogOut,
  ShieldCheck,
  Sparkles,
  Upload,
  ArrowRightLeft,
  BookOpen,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: any, params?: any) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
  onOpenRecoveryKit?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
  onOpenExport,
  onOpenImport,
  onOpenRecoveryKit,
}) => {
  const { currentUser, logout, hasPermission } = useAuth();

  // Collapsible section states
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    documents: true,
    masters: false,
    backup: false,
    admin: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleNav = (view: string, params?: any) => {
    onNavigate(view, params);
    if (window.innerWidth < 1024) {
      onCloseMobile();
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'Admin';

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar element */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-950 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto border-r border-slate-800 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } print:hidden`}
      >
        {/* Top brand banner */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center font-black text-sm text-white shadow-md shadow-indigo-950 border border-indigo-400/30">
              PRP
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black tracking-wider text-sm text-white">
                <span>QuickBill</span>
                <span className="text-amber-400">PRP</span>
              </div>
              <div className="text-[10px] tracking-wide text-indigo-300 font-semibold uppercase flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span>AI ERP Solution</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-2 custom-scrollbar">
          {/* HOME */}
          <button
            onClick={() => handleNav('HOME')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'HOME'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/60'
                : 'text-slate-200 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4 text-indigo-400" />
            <span>HOME</span>
          </button>

          {/* DOCUMENTS & MIS SECTION */}
          {hasPermission('misDocuments') && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => toggleSection('documents')}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors uppercase tracking-wider cursor-pointer"
              >
                <span>DOCUMENTS & MIS</span>
                {openSections.documents ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {openSections.documents && (
                <div className="mt-1 pl-2 space-y-1">
                  <button
                    onClick={() => handleNav('UNIFIED_MIS')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      currentView === 'UNIFIED_MIS'
                        ? 'bg-indigo-600/90 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-300" />
                    <span>All Documents</span>
                  </button>

                  <button
                    onClick={() => handleNav('UNIFIED_MIS', { filter: 'REPRINT' })}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      currentView === 'UNIFIED_MIS' && false
                        ? 'bg-indigo-600/90 text-white'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Reprint Document</span>
                  </button>

                  {hasPermission('dashboard') && (
                    <button
                      onClick={() => handleNav('DASHBOARD')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        currentView === 'DASHBOARD'
                          ? 'bg-indigo-600/90 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Dashboard</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MASTERS SECTION */}
          {(hasPermission('customerMaster') || hasPermission('productMaster')) && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => toggleSection('masters')}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors uppercase tracking-wider cursor-pointer"
              >
                <span>MASTERS</span>
                {openSections.masters ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {openSections.masters && (
                <div className="mt-1 pl-2 space-y-1">
                  {hasPermission('customerMaster') && (
                    <button
                      onClick={() => handleNav('CUSTOMERS')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        currentView === 'CUSTOMERS'
                          ? 'bg-indigo-600/90 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-amber-300" />
                      <span>Customer Master</span>
                    </button>
                  )}

                  {hasPermission('productMaster') && (
                    <button
                      onClick={() => handleNav('PRODUCTS')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        currentView === 'PRODUCTS'
                          ? 'bg-indigo-600/90 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5 text-amber-300" />
                      <span>Product Master</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DATA SAFETY & BACKUP SECTION */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => toggleSection('backup')}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors uppercase tracking-wider cursor-pointer"
            >
              <span>DATA & PORTABILITY</span>
              {openSections.backup ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {openSections.backup && (
              <div className="mt-1 pl-2 space-y-1">
                {onOpenExport && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenExport();
                      if (window.innerWidth < 1024) onCloseMobile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Export Document Data</span>
                  </button>
                )}

                {onOpenImport && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenImport();
                      if (window.innerWidth < 1024) onCloseMobile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Import Document Data</span>
                  </button>
                )}

                {onOpenRecoveryKit && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRecoveryKit();
                      if (window.innerWidth < 1024) onCloseMobile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Recovery Guide & Kit</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ADMIN & SETTINGS SECTION */}
          {(isAdmin || hasPermission('settings')) && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => toggleSection('admin')}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors uppercase tracking-wider cursor-pointer"
              >
                <span>ADMIN & SETTINGS</span>
                {openSections.admin ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {openSections.admin && (
                <div className="mt-1 pl-2 space-y-1">
                  {isAdmin && (
                    <button
                      onClick={() => handleNav('SETTINGS', { tab: 'users' })}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        currentView === 'SETTINGS' && false
                          ? 'bg-indigo-600/90 text-white'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <UserCog className="w-3.5 h-3.5 text-emerald-400" />
                      <span>User Management</span>
                    </button>
                  )}

                  {hasPermission('settings') && (
                    <button
                      onClick={() => handleNav('SETTINGS', { tab: 'business' })}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        currentView === 'SETTINGS'
                          ? 'bg-indigo-600/90 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Settings</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => handleNav('SETTINGS', { tab: 'backup' })}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Backup & Restore</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PWA Install Promotion Card */}
          <div className="pt-2">
            <PWAInstallButton variant="sidebar" />
          </div>

          {/* LOGOUT */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>LOGOUT</span>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser?.displayName?.charAt(0).toUpperCase() || 'P'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-200 truncate">
                  {currentUser?.displayName || 'Paras'}
                </div>
                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                  {isAdmin ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span>Standard User</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
