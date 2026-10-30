import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SITE_CONFIG } from '../config/siteConfig';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-stone-900 text-lg tracking-tight">
                {SITE_CONFIG.branding.logoText}
              </span>
              <span className="hidden sm:inline-block text-xs uppercase px-2 py-0.5 rounded font-medium bg-stone-100 text-stone-600 border border-stone-200">
                WCAG 2.1 / 2.2
              </span>
            </div>
            <p className="text-xs text-stone-500 hidden md:block">
              {SITE_CONFIG.branding.tagline}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-stone-600">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">Client-Side Engine</span>
          </div>
        </div>
      </div>
    </header>
  );
};
