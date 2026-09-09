import React from 'react';

interface FooterProps {
  version?: string;
  releaseDate?: string;
  developerName?: string;
  developerLinkedInUrl?: string;
  copyrightText?: string;
}

export const Footer: React.FC<FooterProps> = ({
  version = '1.0.0',
  releaseDate = '01-Sep-2026',
  developerName = 'Paras R. Panchal',
  developerLinkedInUrl = 'https://in.linkedin.com/in/paras-panchal12',
  copyrightText = 'Made by Paras R. Panchal',
}) => {
  return (
    <footer className="w-full py-3 px-4 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-400 select-none print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>QuickBill PRP</span>
          <span className="text-slate-500 hidden md:inline">| Smart Business. Simplified.</span>
        </div>
        <div className="text-slate-300 font-medium">
          Made by{' '}
          <a
            href={developerLinkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-2 transition-colors"
          >
            {developerName}
          </a>{' '}
          | Version {version} | Latest Release: {releaseDate}
        </div>
      </div>
    </footer>
  );
};
