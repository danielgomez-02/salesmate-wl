
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
  const isDashboard = activeScreen === AppScreen.DASHBOARD;

  const isNavActive = (screen: AppScreen) =>
    activeScreen === screen || (screen === AppScreen.DASHBOARD && activeScreen === AppScreen.CUSTOMER_DETAIL);

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-white shadow-2xl relative border-x border-slate-100 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" role="banner"
        style={{
          minHeight: isDashboard ? '60px' : '48px',
          backgroundColor: isDashboard ? brand.colors.primary : 'rgba(255,255,255,0.95)',
          backdropFilter: isDashboard ? 'none' : 'blur(12px)',
          borderColor: isDashboard ? 'transparent' : 'rgba(241,245,249,0.6)',
        }}
      >
        <div className="flex items-center px-4" style={{ height: isDashboard ? '60px' : '48px' }}>
          {/* Back button — hidden on dashboard & landing */}
          {!shouldHideBack && (
            <button
              onClick={onBack || defaultBack}
              aria-label="Volver atrás"
              className="mr-3 text-slate-400 hover:text-slate-700 transition-colors shrink-0 w-9 h-9 flex items-center justify-center -ml-1.5 rounded-xl hover:bg-slate-50 active:scale-90"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
          )}

          {/* Dashboard: show logo or brand name */}
          {isDashboard ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {brand.images.logo ? (
                <img
                  src={brand.images.logo}
                  alt={brand.labels.appName}
                  className="h-7 max-w-[120px] object-contain brightness-0 invert"
                  style={{ imageRendering: 'auto' }}
                />
              ) : (
                <span className="text-sm font-bold text-white tracking-tight font-display">
                  {brand.labels.appName}
                </span>
              )}
            </div>
          ) : (
            /* Other screens: show title */
            <h1 className="text-[13px] font-semibold uppercase tracking-wide text-slate-800 flex-1 truncate font-display">
              {title}
            </h1>
          )}

          {/* Right side: profile icon on dashboard */}
          {isDashboard && (
            <button
              onClick={() => setScreen(AppScreen.PROFILE)}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              aria-label="Perfil"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className={`flex-1 overflow-y-auto p-0 no-scrollbar overflow-x-hidden ${!isPreLogin ? 'pb-16' : ''}`} role="main">
        {children}
      </main>

      {/* Bottom Navigation — only show post-login */}
      {showNav && !isPreLogin && (
        <nav
          className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center h-14 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]"
          role="navigation"
          aria-label="Navegación principal"
        >
          <button
             onClick={() => setScreen(AppScreen.DASHBOARD)}
             aria-label={`Ir a ${brand.labels.missionSystem}`}
             aria-current={isNavActive(AppScreen.DASHBOARD) ? 'page' : undefined}
             className="flex flex-col items-center justify-center gap-0.5 w-1/2 min-h-[44px] transition-all"
             style={{ color: isNavActive(AppScreen.DASHBOARD) ? brand.colors.primary : '#94a3b8', transform: isNavActive(AppScreen.DASHBOARD) ? 'scale(1.05)' : 'scale(1)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" /></svg>
            <span className="text-[10px] font-semibold uppercase tracking-tight">{brand.labels.missionSystem}</span>
          </button>
          <button
            onClick={() => setScreen(AppScreen.PROFILE)}
            aria-label="Ir a Perfil"
            aria-current={isNavActive(AppScreen.PROFILE) ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-0.5 w-1/2 min-h-[44px] transition-all"
            style={{ color: isNavActive(AppScreen.PROFILE) ? brand.colors.primary : '#94a3b8', transform: isNavActive(AppScreen.PROFILE) ? 'scale(1.05)' : 'scale(1)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px] font-semibold uppercase tracking-tight">Perfil</span>
          </button>
        </nav>
      )}
    </div>
  );
};
export default Layout;
