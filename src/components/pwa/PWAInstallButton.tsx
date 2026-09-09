import React, { useState } from 'react';
import { Download, Smartphone, Check, X, Sparkles, Monitor } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'sidebar' | 'banner' | 'settings';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed as standalone PWA, render a small verified badge in settings or null in navbar
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>App Installed (PWA Active)</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Fallback: Inform user how to install manually in Chrome / Edge / Android
      setShowIOSGuide(true);
    }
  };

  // Rendering styles by variant
  let buttonContent = null;

  if (variant === 'navbar') {
    buttonContent = (
      <button
        onClick={handleInstallClick}
        title="Install QuickBill PRP as Desktop / Mobile App"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer ${className}`}
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  } else if (variant === 'sidebar') {
    buttonContent = (
      <button
        onClick={handleInstallClick}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 text-white text-xs font-semibold transition-all cursor-pointer group ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
            <Download className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-[11px] text-indigo-100">Install QuickBill</div>
            <div className="text-[9px] text-indigo-300">Desktop & Mobile PWA</div>
          </div>
        </div>
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
      </button>
    );
  } else if (variant === 'banner') {
    buttonContent = (
      <div className={`p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border border-indigo-700/50 ${className}`}>
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/80 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-white">Install QuickBill PRP on your Device</div>
            <div className="text-xs text-indigo-200">
              Run offline, instant launch from Home Screen or Taskbar, zero lag.
            </div>
          </div>
        </div>
        <button
          onClick={handleInstallClick}
          className="px-4 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-950 text-xs font-black shrink-0 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
        >
          <Download className="w-4 h-4 text-indigo-700" />
          <span>Install Now</span>
        </button>
      </div>
    );
  } else {
    // settings variant
    buttonContent = (
      <button
        onClick={handleInstallClick}
        className={`px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Install Progressive Web App (PWA)</span>
      </button>
    );
  }

  return (
    <>
      {buttonContent}

      {/* iOS / General Device Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  PWA
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Install QuickBill PRP</h3>
                  <p className="text-[11px] text-slate-500">Add to your Home Screen / Desktop</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>On iPhone & iPad (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-700 font-medium">
                  <li>Tap the <strong>Share</strong> button (box with upward arrow) in the Safari toolbar.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> in the top-right corner.</li>
                </ol>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-indigo-600" />
                  <span>On Android / Chrome / Windows / Mac:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-700 font-medium">
                  <li>Click the <strong>Install icon (⊕ or ⬇)</strong> in your browser's address bar.</li>
                  <li>Or open the browser menu (⋮) and choose <strong>Install QuickBill PRP</strong>.</li>
                  <li>The app will open as a native standalone window.</li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
            >
              Got it, close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
