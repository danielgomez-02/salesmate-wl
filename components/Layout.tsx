
import React, { useState, useEffect } from 'react';
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
  const [scrolled, setScrolled] = useState(false);

  const isPreLogin = PRE_LOGIN_SCREENS.includes(activeScreen);
  const shouldHideBack = HIDE_BACK_SCREENS.includes(activeScreen);
  const isDashboard = activeScreen === AppScreen.DASHBOARD;

  const isNavActive = (screen: AppScreen) =>
    activeScreen === screen || (screen === AppScreen.DASHBOARD && activeScreen === AppScreen.CUSTOMER_DETAIL);

  // Track scroll for header shadow effect
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const handleScroll = () => setScrolled(main.scrollTop > 8);
    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  // Generate a lighter tint of primary for the gradient
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };
  const primary = hexToRgb(brand.colors.primary);

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-slate-50 shadow-2xl relative border-x border-slate-100/50 overflow-x-hidden">

      {/* ─── Header ─── */}
      <header
        className="sticky top-0 z-40 transition-all duration-300"
        role="banner"
        style={{
          minHeight: isDashboard ? '64px' : '52px',
        }}
      >
        {/* Dashboard header: brand-colored with depth */}
        {isDashboard ? (
          <div
            className="relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${brand.colors.primary} 0%, ${brand.colors.primaryDark} 100%)`,
              minHeight: '64px',
            }}
          >
            {/* Subtle decorative orb */}
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.12] pointer-events-none"
              style={{ background: `radial-gradient(circle, white 0%, transparent 70%)` }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{ background: `rgba(255,255,255,0.08)` }}
            />

            <div className="flex items-center justify-between px-5 relative z-10" style={{ height: '64px' }}>
              {/* Logo / brand name */}
              <div className="flex items-center gap-3 min-w-0">
                {brand.images.logo ? (
                  <img
                    src={brand.images.logo}
                    alt={brand.labels.appName}
                    className="h-6 max-w-[100px] object-contain brightness-0 invert opacity-95"
                  />
                ) : (
                  <span className="text-[15px] font-extrabold text-white/95 tracking-tight font-display">
                    {brand.labels.appName}
                  </span>
                )}
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                {/* Notification dot indicator (decorative) */}
                <button
                  onClick={() => setScreen(AppScreen.PROFILE)}
                  className="relative shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 hover:bg-white/15"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  aria-label="Perfil"
                >
                  <svg className="w-[18px] h-[18px] text-white/90" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Sub-screen header: clean glass effect */
          <div
            className="transition-all duration-300"
            style={{
              minHeight: '52px',
              backgroundColor: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.98)',
              backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
              borderBottom: scrolled ? '1px solid rgba(0,0,0,0.04)' : '1px solid transparent',
              boxShadow: scrolled ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
            }}
          >
            <div className="flex items-center px-4 gap-2" style={{ height: '52px' }}>
              {/* Back button */}
              {!shouldHideBack && (
                <button
                  onClick={onBack || defaultBack}
                  aria-label="Volver atrás"
                  className="shrink-0 w-9 h-9 flex items-center justify-center -ml-1 rounded-xl transition-all duration-200 active:scale-90 hover:bg-slate-100"
                  style={{ color: brand.colors.primary }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
              )}

              {/* Title */}
              <h1 className="text-[15px] font-bold text-slate-900 flex-1 truncate font-display">
                {title}
              </h1>
            </div>
          </div>
        )}
      </header>

      {/* ─── Content ─── */}
      <main
        className={`flex-1 overflow-y-auto p-0 no-scrollbar overflow-x-hidden ${!isPreLogin ? 'pb-20' : ''}`}
        role="main"
      >
        {children}
      </main>

      {/* ─── Bottom Navigation ─── */}
      {showNav && !isPreLogin && (
        <nav
          className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-50"
          role="navigation"
          aria-label="Navegación principal"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderTop: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.03)',
          }}
        >
          <div className="flex justify-around items-center h-16 px-4">
            {/* Route / Mission tab */}
            <button
              onClick={() => setScreen(AppScreen.DASHBOARD)}
              aria-label={`Ir a ${brand.labels.missionSystem}`}
              aria-current={isNavActive(AppScreen.DASHBOARD) ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] transition-all duration-200"
            >
              {/* Active indicator pill */}
              {isNavActive(AppScreen.DASHBOARD) && (
                <div
                  className="absolute -top-0.5 w-12 h-1 rounded-full"
                  style={{ backgroundColor: brand.colors.primary }}
                />
              )}
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: isNavActive(AppScreen.DASHBOARD) ? `rgba(${primary.r},${primary.g},${primary.b},0.1)` : 'transparent',
                }}
              >
                <svg
                  className="w-[22px] h-[22px] transition-colors duration-200"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isNavActive(AppScreen.DASHBOARD) ? '2.2' : '1.8'}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{ color: isNavActive(AppScreen.DASHBOARD) ? brand.colors.primary : '#94a3b8' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              </div>
              <span
                className="text-[10px] font-semibold tracking-tight transition-colors duration-200"
                style={{ color: isNavActive(AppScreen.DASHBOARD) ? brand.colors.primary : '#94a3b8' }}
              >
                {brand.labels.missionSystem}
              </span>
            </button>

            {/* Profile tab */}
            <button
              onClick={() => setScreen(AppScreen.PROFILE)}
              aria-label="Ir a Perfil"
              aria-current={isNavActive(AppScreen.PROFILE) ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] transition-all duration-200"
            >
              {isNavActive(AppScreen.PROFILE) && (
                <div
                  className="absolute -top-0.5 w-12 h-1 rounded-full"
                  style={{ backgroundColor: brand.colors.primary }}
                />
              )}
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: isNavActive(AppScreen.PROFILE) ? `rgba(${primary.r},${primary.g},${primary.b},0.1)` : 'transparent',
                }}
              >
                <svg
                  className="w-[22px] h-[22px] transition-colors duration-200"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isNavActive(AppScreen.PROFILE) ? '2.2' : '1.8'}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{ color: isNavActive(AppScreen.PROFILE) ? brand.colors.primary : '#94a3b8' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <span
                className="text-[10px] font-semibold tracking-tight transition-colors duration-200"
                style={{ color: isNavActive(AppScreen.PROFILE) ? brand.colors.primary : '#94a3b8' }}
              >
                Perfil
              </span>
            </button>
          </div>
          {/* Safe area for phones with gesture bars */}
          <div className="h-safe-area-inset-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
        </nav>
      )}
    </div>
  );
};
export default Layout;
