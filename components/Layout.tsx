
import React from 'react';
import { AppScreen } from '../types';
import { useBrand } from '../context/BrandContext';

interface LayoutProps {
  children: React.ReactNode;
  activeScreen: AppScreen;
  setScreen: (s: AppScreen) => void;
  title: string;
  showNav?: boolean;
  onBack?: () => void;
}

const PRE_LOGIN_SCREENS = [AppScreen.LANDING, AppScreen.BRAND_SELECT, AppScreen.BRAND_ADMIN, AppScreen.LOGIN];
const HIDE_BACK_SCREENS = [AppScreen.LANDING, AppScreen.DASHBOARD];

const Layout: React.FC<LayoutProps> = ({ children, activeScreen, setScreen, title, showNav = true, onBack }) => {
  const { brand } = useBrand();
  const defaultBack = () => setScreen(AppScreen.DASHBOARD);

  const isPreLogin = PRE_LOGIN_SCREENS.includes(activeScreen);
  const shouldHideBack = HIDE_BACK_SCREENS.includes(activeScreen);

  const isNavActive = (screen: AppScreen) =>
    activeScreen === screen || (screen === AppScreen.DASHBOARD && activeScreen === AppScreen.CUSTOMER_DETAIL);

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-white shadow-2xl relative border-x border-slate-100 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 py-2.5 flex items-center border-b border-slate-100/60">
        {!shouldHideBack && (
          <button
            onClick={onBack || defaultBack}
            className="mr-3 text-slate-500 hover:text-slate-700 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
        )}
        <h1 className="text-sm font-bold uppercase tracking-wide text-slate-900 flex-1 truncate pr-2 font-display">{title}</h1>
      </header>

      {/* Content */}
      <main className={`flex-1 overflow-y-auto p-0 no-scrollbar overflow-x-hidden ${!isPreLogin ? 'pb-16' : ''}`}>
        {children}
      </main>

      {/* Bottom Navigation — only show post-login */}
      {showNav && !isPreLogin && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center h-14 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
          <button
             onClick={() => setScreen(AppScreen.DASHBOARD)}
             className="flex flex-col items-center justify-center gap-0.5 w-1/2 min-h-[44px] transition-all"
             style={{ color: isNavActive(AppScreen.DASHBOARD) ? brand.colors.primary : '#94a3b8', transform: isNavActive(AppScreen.DASHBOARD) ? 'scale(1.05)' : 'scale(1)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" /></svg>
            <span className="text-[10px] font-semibold uppercase tracking-tight">{brand.labels.missionSystem}</span>
          </button>
          <button
            onClick={() => setScreen(AppScreen.PROFILE)}
            className="flex flex-col items-center justify-center gap-0.5 w-1/2 min-h-[44px] transition-all"
            style={{ color: isNavActive(AppScreen.PROFILE) ? brand.colors.primary : '#94a3b8', transform: isNavActive(AppScreen.PROFILE) ? 'scale(1.05)' : 'scale(1)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px] font-semibold uppercase tracking-tight">Perfil</span>
          </button>
        </nav>
      )}
    </div>
  );
};
export default Layout;
