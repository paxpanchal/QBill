import React, { useState } from 'react';
import {
  Menu,
  X,
  LogOut,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Zap,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { BackupStatusBanner } from '../backup/BackupStatusBanner';

interface NavbarProps {
  currentView?: string;
  onNavigate: (view: any, params?: any) => void;
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const { currentUser, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 print:hidden shadow-2xs">
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Mobile menu toggle + Brand Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer flex items-center gap-1.5"
            aria-label="Toggle navigation menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-xs font-bold text-slate-800 hidden sm:inline">MENU</span>
          </button>

          <div
            onClick={() => onNavigate('HOME')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-indigo-200 group-hover:scale-105 transition-transform border border-indigo-400/30">
              PRP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                  QuickBill <span className="text-indigo-600">PRP</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Enterprise
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 hidden md:block leading-none mt-0.5">
                Smart Business. Simplified. • Professional Billing & MIS
              </p>
            </div>
          </div>
        </div>

        {/* Right: PWA Install + Backup tracker + User profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Action Button */}
          <PWAInstallButton variant="navbar" />

          {/* User profile dropdown / pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {currentUser?.displayName || 'Paras'}
              </div>
              <div className="text-[10px] font-medium text-slate-500 flex items-center justify-end gap-1">
                {currentUser?.role === 'ADMIN' || currentUser?.role === 'Admin' ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </span>
                ) : (
                  <span className="text-slate-600 flex items-center gap-0.5">
                    <UserCheck className="w-3 h-3" /> User
                  </span>
                )}
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold ring-2 ring-indigo-500/30">
              {currentUser?.displayName?.charAt(0).toUpperCase() || 'P'}
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors ml-1 cursor-pointer"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
