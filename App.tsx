
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppScreen, UserData, RouteItem, Goal, Mission, MissionCategory, InsightChip, Product, BrandConfig } from './types';
import { mockApi } from './services/mockApi';
import Layout from './components/Layout';
import { useBrand, createBlankBrand } from './context/BrandContext';

const ProgressCircle: React.FC<{ current: number, total: number, label: string, color: string }> = ({ current, total, label, color }) => {
  const percentage = total === 0 ? 0 : (current / total) * 100;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-50 shadow-sm w-full">
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={radius} stroke="#f1f5f9" strokeWidth="3" fill="transparent" />
          <circle cx="28" cy="28" r={radius} stroke={color} strokeWidth="3" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] sm:text-[11px] font-bold">{current}/{total}</span>
        </div>
      </div>
      <span className="text-[5px] sm:text-[6px] font-bold uppercase text-slate-400 tracking-widest truncate w-full text-center">{label}</span>
    </div>
  );
};

const AchievementOverlay: React.FC<{
  completedCount: number,
  totalCount: number,
  onNext: () => void,
  nextMission?: Mission;
  currentMission: Mission | null;
  getCategoryLabel: (cat: string) => string;
  primaryColor: string;
  accentColor: string;
  avatarBg: string;
  avatarColor: string;
}> = ({ completedCount, totalCount, onNext, nextMission, currentMission, getCategoryLabel, primaryColor, accentColor, avatarBg, avatarColor }) => (
  <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm flex flex-col p-4 animate-fade-in overflow-y-auto no-scrollbar max-w-lg mx-auto left-0 right-0 shadow-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.98)' }}>
    <div className="flex justify-end mb-1">
      <button onClick={onNext} className="text-slate-400 p-1.5 active:scale-90 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>

    <div className="flex-1 flex flex-col items-center text-center mt-12">
      <div className="relative mb-6 shrink-0">
        {currentMission && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
             <span className="text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm border-2 border-white whitespace-nowrap" style={{ backgroundColor: accentColor }}>
               {getCategoryLabel(currentMission.category)}
             </span>
          </div>
        )}
        <div className="w-20 h-20 relative">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
            <circle cx="50" cy="50" r="42" stroke={primaryColor} strokeWidth="8" fill="transparent" strokeDasharray={264} strokeDashoffset={264 - (completedCount / totalCount) * 264} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-0.5">
            <span className="text-xl font-black text-slate-900">{completedCount}/{totalCount}</span>
            <span className="text-[6px] font-bold uppercase tracking-widest" style={{ color: primaryColor }}>Tareas</span>
          </div>
        </div>
      </div>

      {currentMission && (
        <div className="mb-6 space-y-1 w-full max-w-xs">
          <h2 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight break-words">{currentMission.name}</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">¡Misión completada!</p>
        </div>
      )}

      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner overflow-hidden border-4 border-white shrink-0">
        <img src={`https://ui-avatars.com/api/?name=Star&background=${avatarBg}&color=${avatarColor}&size=512`} className="w-full h-full object-cover opacity-90" alt="Success Avatar" />
      </div>

      <p className="text-slate-500 font-bold text-sm px-4 tracking-tight italic max-w-xs">"¡Buen trabajo! Sigamos ganando en el mercado."</p>
    </div>

    {nextMission ? (
        <div className="mt-auto w-full animate-slide-up pb-4">
            <div className="flex flex-col items-center gap-1 mb-2 animate-bounce-slow">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Siguiente Misión</span>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </div>

            <div className="bg-white border border-slate-100 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-1 overflow-hidden relative">
                 <div className="absolute top-0 bottom-0 left-0 w-1.5" style={{ backgroundColor: primaryColor }}></div>

                 <div className="flex items-center gap-3 p-3 pl-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest block mb-0.5" style={{ color: primaryColor }}>{getCategoryLabel(nextMission.category)}</span>
                        <h4 className="text-sm font-black text-slate-900 truncate leading-tight">{nextMission.name}</h4>
                    </div>
                    <button onClick={onNext} className="text-white text-[11px] font-bold px-4 py-2 rounded-full uppercase shadow-md active:scale-95 whitespace-nowrap transition-colors" style={{ backgroundColor: primaryColor }}>
                        Iniciar
                    </button>
                 </div>
            </div>
        </div>
    ) : (
      <div className="mt-auto w-full pb-4">
        <button onClick={onNext} className="w-full text-white font-black py-4 rounded-[24px] shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all" style={{ backgroundColor: primaryColor }}>
          Continuar
        </button>
      </div>
    )}
  </div>
);

// ── Admin form inputs (defined at module scope to avoid re-mount on each keystroke) ──
const AdminTextInput: React.FC<{label: string, value: string, onChange: (v: string) => void, placeholder?: string}> = ({label, value, onChange, placeholder}) => (
  <div>
    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">{label}</label>
    <input type="text" value={value || ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="w-full text-xs bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 font-medium" />
  </div>
);

const AdminColorInput: React.FC<{label: string, value: string, onChange: (v: string) => void}> = ({label, value, onChange}) => (
  <div className="flex items-center gap-2">
    <input type="color" value={value?.startsWith('#') ? value : `#${value}`} onChange={e => onChange(e.target.value)} className="w-8 h-8 rounded-lg border-0 cursor-pointer shrink-0" />
    <div className="flex-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="w-full text-[10px] font-mono bg-slate-50 rounded-lg px-2 py-1 border border-slate-100" />
    </div>
  </div>
);

const App: React.FC = () => {
  const { brand, setBrandId, brandId, brands, brandKeys, saveBrand, deleteBrand, exportBrands, initialPath, pushBrandPath } = useBrand();
  const getCategoryLabel = (cat: string) => {
    return brand.labels.categories[cat as MissionCategory] || cat.toUpperCase();
  };

  // Route-based initial screen: /config → BRAND_SELECT, /{brandId} → LOGIN, / → LANDING
  const [screen, setScreen] = useState<AppScreen>(() => {
    if (initialPath === 'config') return AppScreen.BRAND_SELECT;
    if (initialPath && brands[initialPath]) return AppScreen.LOGIN;
    return AppScreen.LANDING;
  });

  // Brand admin form state
  const [editingBrand, setEditingBrand] = useState<BrandConfig | null>(null);
  const [adminSlug, setAdminSlug] = useState('');
  const [user, setUser] = useState<UserData | null>(null);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);

  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [offerQty, setOfferQty] = useState(6);
  const [surveyValue, setSurveyValue] = useState<string | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [userInputVal, setUserInputVal] = useState<string>('');
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [loginInput, setLoginInput] = useState(brand.defaultEmpCode);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Update loginInput when brand changes
  useEffect(() => {
    setLoginInput(brand.defaultEmpCode);
  }, [brand]);

  // Listen for browser back/forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const segment = (window.location.pathname.replace(/^\/+/, '').split('/')[0] || '').toLowerCase();
      if (segment === 'config') {
        setScreen(AppScreen.BRAND_SELECT);
      } else if (segment && brands[segment]) {
        setBrandId(segment);
        setScreen(AppScreen.LOGIN);
      } else {
        setScreen(AppScreen.LANDING);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [brands]);

  const loadUserData = async (code: string) => {
    setIsLoading(true);
    try {
      const userData = await mockApi.getUserInfo(code, brand.labels.companyName);
      setUser(userData);
      const rawRoutes = await mockApi.getRoutes(code);
      setRoutes(rawRoutes);
      setGoals(await mockApi.getGoals(userData.emp_code));
      setScreen(AppScreen.DASHBOARD);
    } catch (e) {
      console.error("Login failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const empCode = params.get('emp_code');
    if (empCode) {
      loadUserData(empCode);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadUserData(loginInput);
  };

  const selectCustomer = async (route: RouteItem) => {
    setSelectedRoute(route);
    setIsLoading(true);
    try {
      const stored = localStorage.getItem(`${brand.storagePrefix}${route.visit_id}`);
      if (stored) setMissions(JSON.parse(stored));
      else setMissions(await mockApi.getMissions(route.visit_id));
      setScreen(AppScreen.CUSTOMER_DETAIL);
    } finally { setIsLoading(false); }
  };

  const startMission = (mission: Mission) => {
    setSelectedMission(mission);
    setCurrentProductIndex(0);
    if (mission.suggested_products && mission.suggested_products.length > 0) {
      setOfferQty(mission.suggested_products[0].suggested_qty || 1);
    } else {
      setOfferQty(6);
    }
    setSurveyValue(null);
    setStarRating(0);

    if (mission.type === 'user_input' && mission.code === 'COLD_DOORS') {
      setUserInputVal('2');
    } else {
      setUserInputVal('');
    }

    setTempPhoto(null);
    setScreen(AppScreen.MISSION_EXECUTION);
  };

  const completeMission = async () => {
    setIsValidating(true);

    if (selectedMission) {
      const feedbackData: any = {
         mission_type: selectedMission.type,
         timestamp: new Date().toISOString()
      };

      if (selectedMission.type === 'dialog') {
         feedbackData.survey_response = surveyValue;
         feedbackData.rating = starRating;
      } else if (selectedMission.type === 'user_input') {
         feedbackData.input_value = userInputVal;
      } else if (selectedMission.type === 'take_photo') {
         feedbackData.photo_evidence = tempPhoto;
      } else if (selectedMission.type === 'offer_products' || selectedMission.type === 'single_sku_push') {
         feedbackData.quantity = offerQty;
         if (selectedMission.suggested_products && selectedMission.suggested_products[currentProductIndex]) {
             feedbackData.product_code = selectedMission.suggested_products[currentProductIndex].code;
             feedbackData.product_name = selectedMission.suggested_products[currentProductIndex].name;
         }
      }

      try {
         await mockApi.updateTaskStatus(selectedMission.taskid, feedbackData);
      } catch (e) {
         console.warn("Could not sync task status with backend", e);
      }
    }

    setTimeout(() => {
      if (selectedMission && selectedRoute) {
        const updated = missions.map(m => m.taskid === selectedMission.taskid ? { ...m, status: 'done' as const } : m);
        setMissions(updated);
        localStorage.setItem(`${brand.storagePrefix}${selectedRoute.visit_id}`, JSON.stringify(updated));

        const allDone = updated.every(m => m.status === 'done');
        if (allDone) {
          setRoutes(prev => prev.map(r => r.visit_id === selectedRoute.visit_id ? { ...r, status: 'completed' as const } : r));
        }

        setIsValidating(false);
        setShowAchievement(true);
      }
    }, 400);
  };

  const handleBack = () => {
    if (screen === AppScreen.MISSION_EXECUTION) {
      setSelectedMission(null);
      setScreen(AppScreen.CUSTOMER_DETAIL);
    } else if (screen === AppScreen.CUSTOMER_DETAIL) {
      setScreen(AppScreen.DASHBOARD);
    } else {
      setScreen(AppScreen.DASHBOARD);
    }
  };

  useEffect(() => {
    if (screen === AppScreen.MISSION_EXECUTION && mapContainerRef.current && (selectedMission?.insights?.some(i => i.label.includes('MAP')) || selectedMission?.type === 'user_input' || selectedMission?.type === 'single_sku_push')) {
      const L = (window as any).L;
      if (!L) return;

      const timer = setTimeout(() => {
        if (!mapContainerRef.current) return;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const lat = selectedRoute?.customer.lat || 4.6097;
        const lng = selectedRoute?.customer.lng || -74.0817;

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([lat, lng], 16);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

        L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'bg-transparent',
            html: `
              <div class="relative flex flex-col items-center">
                <div class="w-12 h-12 rounded-full border-[3px] border-white shadow-lg flex items-center justify-center text-white z-20" style="background-color: ${brand.colors.primary}">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-2a2 2 0 100-4 2 2 0 000 4zm-2-4a2 2 0 100-4 2 2 0 000 4zm-2-4a2 2 0 100-4 2 2 0 000 4zm-2-4a2 2 0 100-4 2 2 0 000 4z" /></svg>
                </div>
                <div class="w-4 h-4 transform rotate-45 -mt-3 z-10 border-r-[3px] border-b-[3px] border-white" style="background-color: ${brand.colors.primary}"></div>
                <div class="w-10 h-3 bg-black/20 blur-sm rounded-full -mt-1"></div>
              </div>
            `,
            iconSize: [48, 60],
            iconAnchor: [24, 55]
          })
        }).addTo(map);

        const pois = [
          [lat + 0.002, lng + 0.001],
          [lat - 0.001, lng - 0.002]
        ];

        pois.forEach(p => {
          L.marker(p, {
            icon: L.divIcon({
              className: 'bg-transparent',
              html: `
                <div class="relative flex flex-col items-center group">
                   <div class="w-8 h-8 bg-white rounded-full border-2 border-sky-500 shadow-md flex items-center justify-center text-sky-600 z-20">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                   </div>
                   <div class="w-2 h-2 bg-sky-500 rounded-full mt-1 animate-ping absolute top-8"></div>
                </div>
              `,
              iconSize: [32, 40],
              iconAnchor: [16, 36]
            })
          }).addTo(map);
        });

        mapInstanceRef.current = map;
        map.invalidateSize();
      }, 300);

      return () => {
        clearTimeout(timer);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    }
  }, [screen, selectedMission, selectedRoute, brand]);

  const stats = useMemo(() => {
    const categories: MissionCategory[] = ['sales', 'execution', 'communication'];
    return categories.map(cat => ({
      label: getCategoryLabel(cat),
      current: missions.filter(m => m.category === cat && m.status === 'done').length,
      total: missions.filter(m => m.category === cat).length,
      color: brand.colors.categoryColors[cat]
    }));
  }, [missions, brand]);

  const filteredMissions = useMemo(() => {
    if (activeFilter === 'ALL') return missions;
    return missions.filter(m => m.category.toUpperCase() === activeFilter);
  }, [missions, activeFilter]);

  const isMissionReady = useMemo(() => {
    if (!selectedMission) return false;
    switch (selectedMission.type) {
      case 'take_photo': return !!tempPhoto;
      case 'dialog': return surveyValue !== null && starRating > 0;
      case 'offer_products': return true;
      case 'single_sku_push': return true;
      case 'user_input': return userInputVal.length > 0;
      default: return true;
    }
  }, [selectedMission, tempPhoto, surveyValue, starRating, offerQty, userInputVal]);

  const getChipStyle = (type: string) => {
    switch (type) {
      case 'danger': return 'bg-red-50 text-red-600 border-red-100';
      case 'info': return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'success': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const ProductImage: React.FC<{ src: string, alt: string, className?: string }> = ({ src, alt, className }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const finalSrc = hasError ? brand.images.fallbackProduct : src;
    return (
      <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 animate-pulse">
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${brand.colors.primaryLight}`, borderTopColor: brand.colors.primary }}></div>
          </div>
        )}
        <img
            src={finalSrc}
            alt={alt}
            className={`w-full h-full object-contain transition-all duration-700 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => { if (!hasError) setHasError(true); }}
        />
      </div>
    );
  };

  const filters = [
    { key: 'ALL', label: 'TODAS' },
    { key: 'SALES', label: brand.labels.categories.sales },
    { key: 'EXECUTION', label: brand.labels.categories.execution },
    { key: 'COMMUNICATION', label: brand.labels.categories.communication }
  ];

  const getCategoryChipStyle = (cat: MissionCategory) => {
    const colorMap: Record<MissionCategory, string> = {
      sales: brand.colors.categoryColors.sales,
      execution: brand.colors.categoryColors.execution,
      communication: brand.colors.categoryColors.communication,
      activation: brand.colors.categoryColors.activation,
    };
    const c = colorMap[cat] || '#64748b';
    return { color: c, backgroundColor: `${c}15`, borderColor: `${c}30` };
  };

  if (isLoading && screen === AppScreen.LOGIN && !user) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
           <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: brand.colors.primaryLight, borderTopColor: brand.colors.primary }}></div>
           <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Cargando perfil...</p>
        </div>
    )
  }

  return (
    <Layout
      activeScreen={screen}
      setScreen={setScreen}
      onBack={handleBack}
      title={
        screen === AppScreen.MISSION_EXECUTION ? "MISIÓN GUIADA" :
        screen === AppScreen.CUSTOMER_DETAIL && selectedRoute ? selectedRoute.customer.name :
        screen === AppScreen.LANDING ? "SALESMATE" :
        screen === AppScreen.BRAND_SELECT ? "CONFIGURACIÓN" :
        screen === AppScreen.BRAND_ADMIN ? "CONFIGURAR MARCA" :
        `${brand.labels.appName.toUpperCase()} PRO`
      }
    >
      {showAchievement && (
        <AchievementOverlay
          completedCount={missions.filter(m => m.status === 'done').length}
          totalCount={missions.length}
          onNext={() => {
            setShowAchievement(false);
            const next = missions.find(m => m.status === 'pending');
            if (next) startMission(next);
            else setScreen(AppScreen.CUSTOMER_DETAIL);
          }}
          nextMission={missions.find(m => m.status === 'pending')}
          currentMission={selectedMission}
          getCategoryLabel={getCategoryLabel}
          primaryColor={brand.colors.primary}
          accentColor={brand.colors.accent}
          avatarBg={brand.images.avatarBg}
          avatarColor={brand.images.avatarColor}
        />
      )}

      {/* ──────── LANDING SCREEN ──────── */}
      {screen === AppScreen.LANDING && (
        <div className="p-6 h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white animate-fade-in">
          <div className="mb-12 text-center">
            <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5em] mb-3">Powered by Yalo</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Salesmate</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Whitelabel Platform</p>
          </div>

          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/config');
                setScreen(AppScreen.BRAND_SELECT);
              }}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black rounded-[24px] shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all hover:shadow-2xl"
            >
              Configurar Marcas
            </button>

            {brandKeys.length > 0 && (
              <div className="pt-4 border-t border-slate-100 mt-6">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center mb-3">Acceso directo</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {brandKeys.map(key => {
                    const b = brands[key];
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setBrandId(key);
                          pushBrandPath(key);
                          setScreen(AppScreen.LOGIN);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-100 bg-white hover:shadow-md transition-all active:scale-95 text-xs font-bold text-slate-600"
                      >
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: b.colors.primary }}>
                          {b.labels.appName[0]}
                        </div>
                        {b.labels.appName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-12 uppercase tracking-widest">Proof of Concept — Whitelabel Demo</p>
        </div>
      )}

      {/* ──────── BRAND SELECT / CONFIG SCREEN ──────── */}
      {screen === AppScreen.BRAND_SELECT && (
        <div className="p-6 h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white animate-fade-in">
          <div className="mb-10 text-center">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5em] mb-3">Powered by Yalo</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Salesmate</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Configuración de Marcas</p>
          </div>

          <div className="w-full space-y-3 max-w-sm">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Selecciona una marca</p>
              <button
                onClick={() => {
                  setEditingBrand(null);
                  setAdminSlug('');
                  setScreen(AppScreen.BRAND_ADMIN);
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors active:scale-90"
                title="Crear nueva marca"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
              </button>
            </div>
            {brandKeys.map(key => {
              const b = brands[key];
              return (
                <div
                  key={key}
                  className="w-full p-4 rounded-[24px] border-2 flex items-center gap-4 transition-all hover:shadow-lg group"
                  style={{
                    borderColor: brandId === key ? b.colors.primary : '#f1f5f9',
                    backgroundColor: brandId === key ? `${b.colors.primary}08` : 'white'
                  }}
                >
                  <div
                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer active:scale-95 transition-transform"
                    onClick={() => {
                      setBrandId(key);
                      pushBrandPath(key);
                      setScreen(AppScreen.LOGIN);
                    }}
                  >
                    {b.images.logo ? (
                      <img src={b.images.logo} alt={b.labels.appName} className="w-12 h-12 rounded-2xl object-contain shadow-md shrink-0 bg-white p-1" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shrink-0" style={{ backgroundColor: b.colors.primary }}>
                        {b.labels.appName[0]}
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <h4 className="text-base font-black text-slate-900 tracking-tight">{b.labels.appName}</h4>
                      <p className="text-[11px] font-bold text-slate-400">{b.labels.companyName} — {b.labels.appTagline}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">/{key}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {/* Edit button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingBrand(JSON.parse(JSON.stringify(b)));
                        setAdminSlug('');
                        setScreen(AppScreen.BRAND_ADMIN);
                      }}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors active:scale-90"
                      title="Editar marca"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`¿Eliminar la marca "${b.labels.appName}"? Esta acción no se puede deshacer.`)) {
                          deleteBrand(key);
                        }
                      }}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-red-50 transition-colors active:scale-90"
                      title="Eliminar marca"
                    >
                      <svg className="w-4 h-4 text-slate-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                    {/* Navigate arrow */}
                    <div
                      className="text-slate-200 group-hover:translate-x-1 transition-transform cursor-pointer p-1"
                      onClick={() => {
                        setBrandId(key);
                        pushBrandPath(key);
                        setScreen(AppScreen.LOGIN);
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 mt-10 uppercase tracking-widest">Proof of Concept — Whitelabel Demo</p>
        </div>
      )}

      {/* ──────── BRAND ADMIN SCREEN ──────── */}
      {screen === AppScreen.BRAND_ADMIN && (() => {
        const isNew = editingBrand === null;
        const draft: BrandConfig = editingBrand || createBlankBrand('nueva-marca');

        const updateDraft = (path: string, value: string) => {
          const clone: any = JSON.parse(JSON.stringify(draft));
          const keys = path.split('.');
          let obj = clone;
          for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
          obj[keys[keys.length - 1]] = value;
          setEditingBrand(clone);
        };

        return (
          <div className="p-4 space-y-4 animate-fade-in overflow-y-auto pb-24">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{isNew ? 'Nueva Marca' : `Editar: ${draft.labels.appName}`}</h2>
              <button onClick={() => { window.history.pushState({}, '', '/config'); setScreen(AppScreen.BRAND_SELECT); }} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Preview Card */}
            <div className="p-4 rounded-[24px] border-2 flex items-center gap-4" style={{ borderColor: draft.colors.primary, backgroundColor: `${draft.colors.primary}08` }}>
              {draft.images.logo ? (
                <img src={draft.images.logo} alt="" className="w-12 h-12 rounded-2xl object-contain shadow-md shrink-0 bg-white p-1" />
              ) : (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shrink-0" style={{ backgroundColor: draft.colors.primary }}>
                  {draft.labels.appName?.[0] || '?'}
                </div>
              )}
              <div className="flex-1 text-left">
                <h4 className="text-base font-black text-slate-900 tracking-tight">{draft.labels.appName || 'Nombre'}</h4>
                <p className="text-[11px] font-bold text-slate-400">{draft.labels.companyName || 'Empresa'} — {draft.labels.appTagline || 'Tagline'}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">/{isNew ? adminSlug : draft.id}</p>
              </div>
            </div>

            {/* Slug / Ruta */}
            {isNew && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Slug / Ruta URL</label>
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                  <span className="text-[10px] text-slate-400 font-mono pl-3">/</span>
                  <input type="text" value={adminSlug} onChange={e => setAdminSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="mi-marca" className="flex-1 text-xs bg-transparent px-1 py-2 font-mono font-medium outline-none" />
                </div>
              </div>
            )}

            {/* Section: Info básica */}
            <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Información</p>
              <AdminTextInput label="Nombre de la App" value={draft.labels.appName} onChange={v => updateDraft('labels.appName', v)} />
              <AdminTextInput label="Empresa" value={draft.labels.companyName} onChange={v => updateDraft('labels.companyName', v)} />
              <AdminTextInput label="Tagline" value={draft.labels.appTagline} onChange={v => updateDraft('labels.appTagline', v)} />
              <AdminTextInput label="Sistema de Misiones" value={draft.labels.missionSystem} onChange={v => updateDraft('labels.missionSystem', v)} placeholder="RED, GOLD, CORE..." />
              <AdminTextInput label="Puntos Label" value={draft.labels.pointsLabel} onChange={v => updateDraft('labels.pointsLabel', v)} />
              <AdminTextInput label="Rutina Label" value={draft.labels.routineLabel} onChange={v => updateDraft('labels.routineLabel', v)} />
              <AdminTextInput label="Storage Prefix" value={draft.storagePrefix} onChange={v => updateDraft('storagePrefix', v)} placeholder="mi_marca_v1_" />
              <AdminTextInput label="Código Empleado Default" value={draft.defaultEmpCode} onChange={v => updateDraft('defaultEmpCode', v)} />
            </div>

            {/* Section: Login */}
            <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Pantalla Login</p>
              <AdminTextInput label="Título Login" value={draft.labels.loginTitle} onChange={v => updateDraft('labels.loginTitle', v)} />
              <AdminTextInput label="Placeholder Input" value={draft.labels.loginPlaceholder} onChange={v => updateDraft('labels.loginPlaceholder', v)} />
              <AdminTextInput label="Texto Botón" value={draft.labels.loginButton} onChange={v => updateDraft('labels.loginButton', v)} />
            </div>

            {/* Section: Colores */}
            <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Colores</p>
              <div className="grid grid-cols-2 gap-2">
                <AdminColorInput label="Primario" value={draft.colors.primary} onChange={v => updateDraft('colors.primary', v)} />
                <AdminColorInput label="Primario Light" value={draft.colors.primaryLight} onChange={v => updateDraft('colors.primaryLight', v)} />
                <AdminColorInput label="Primario Dark" value={draft.colors.primaryDark} onChange={v => updateDraft('colors.primaryDark', v)} />
                <AdminColorInput label="Acento" value={draft.colors.accent} onChange={v => updateDraft('colors.accent', v)} />
                <AdminColorInput label="Acento Light" value={draft.colors.accentLight} onChange={v => updateDraft('colors.accentLight', v)} />
                <AdminColorInput label="Success" value={draft.colors.success} onChange={v => updateDraft('colors.success', v)} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Colores por Categoría</p>
              <div className="grid grid-cols-2 gap-2">
                <AdminColorInput label="Ventas" value={draft.colors.categoryColors.sales} onChange={v => updateDraft('colors.categoryColors.sales', v)} />
                <AdminColorInput label="Ejecución" value={draft.colors.categoryColors.execution} onChange={v => updateDraft('colors.categoryColors.execution', v)} />
                <AdminColorInput label="Comunicación" value={draft.colors.categoryColors.communication} onChange={v => updateDraft('colors.categoryColors.communication', v)} />
                <AdminColorInput label="Activación" value={draft.colors.categoryColors.activation} onChange={v => updateDraft('colors.categoryColors.activation', v)} />
              </div>
            </div>

            {/* Section: Imágenes */}
            <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Imágenes</p>
              <AdminTextInput label="URL del Logo" value={draft.images.logo || ''} onChange={v => updateDraft('images.logo', v)} placeholder="https://..." />
              <AdminTextInput label="URL Banner Login" value={draft.images.loginBanner || ''} onChange={v => updateDraft('images.loginBanner', v)} placeholder="https://..." />
              <AdminTextInput label="URL Producto Fallback" value={draft.images.fallbackProduct} onChange={v => updateDraft('images.fallbackProduct', v)} />
              <div className="grid grid-cols-2 gap-2">
                <AdminColorInput label="Avatar BG (hex sin #)" value={draft.images.avatarBg} onChange={v => updateDraft('images.avatarBg', v)} />
                <AdminColorInput label="Avatar Color (hex sin #)" value={draft.images.avatarColor} onChange={v => updateDraft('images.avatarColor', v)} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  const id = isNew ? adminSlug : draft.id;
                  if (!id || id.length < 2) { alert('El slug debe tener al menos 2 caracteres'); return; }
                  saveBrand(id, { ...draft, id });
                  setEditingBrand(null);
                  setAdminSlug('');
                  setScreen(AppScreen.BRAND_SELECT);
                }}
                className="w-full text-white font-black py-3 rounded-[24px] shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all"
                style={{ backgroundColor: draft.colors.primary }}
              >
                {isNew ? 'Crear Marca' : 'Guardar Cambios'}
              </button>

              <button
                onClick={() => {
                  const json = exportBrands();
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'brands.json'; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-full py-3 border-2 border-slate-200 rounded-[24px] text-slate-600 font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
              >
                Exportar brands.json
              </button>

              {!isNew && (
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${draft.labels.appName}"?`)) {
                      deleteBrand(draft.id);
                      setEditingBrand(null);
                      setScreen(AppScreen.BRAND_SELECT);
                    }
                  }}
                  className="w-full py-3 border-2 border-red-200 rounded-[24px] text-red-500 font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                >
                  Eliminar Marca
                </button>
              )}
            </div>

            {/* Brand List (for editing existing) */}
            {isNew && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Editar marca existente</p>
                <div className="space-y-2">
                  {brandKeys.map(key => (
                    <button
                      key={key}
                      onClick={() => { setEditingBrand(JSON.parse(JSON.stringify(brands[key]))); setAdminSlug(''); }}
                      className="w-full p-3 rounded-xl border border-slate-100 flex items-center gap-3 hover:bg-slate-50 transition-colors active:scale-95"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0" style={{ backgroundColor: brands[key].colors.primary }}>
                        {brands[key].labels.appName[0]}
                      </div>
                      <span className="text-xs font-bold text-slate-700 flex-1 text-left">{brands[key].labels.appName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">/{key}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ──────── LOGIN SCREEN ──────── */}
      {screen === AppScreen.LOGIN && (
        <div className="h-full flex flex-col bg-white animate-fade-in">
          {/* Decorative hero */}
          <div className="relative overflow-hidden pt-12 pb-8 px-6 flex flex-col items-center text-center" style={{ background: `linear-gradient(135deg, ${brand.colors.primary}12, ${brand.colors.accent || brand.colors.primary}08)` }}>
            <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-[0.07]" style={{ backgroundColor: brand.colors.primary }}></div>
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full opacity-[0.05]" style={{ backgroundColor: brand.colors.accent || brand.colors.primary }}></div>
            {brand.images.loginBanner ? (
              <img src={brand.images.loginBanner} alt="" className="w-full max-h-28 object-contain mb-4 relative z-10 drop-shadow-sm" />
            ) : brand.images.logo ? (
              <img src={brand.images.logo} alt={brand.labels.appName} className="h-20 mx-auto mb-4 object-contain relative z-10 drop-shadow-sm" />
            ) : (
              <div className="w-20 h-20 rounded-[24px] flex items-center justify-center text-white text-3xl font-black shadow-xl mb-4 relative z-10" style={{ backgroundColor: brand.colors.primary }}>
                {brand.labels.appName[0]}
              </div>
            )}
            <h1 className="text-4xl font-black italic tracking-tighter drop-shadow-sm relative z-10" style={{ color: brand.colors.primary }}>{brand.labels.appName}</h1>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2 relative z-10">{brand.labels.appTagline}</p>
          </div>
          {/* Form */}
          <div className="flex-1 flex flex-col justify-center px-6">
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="space-y-1.5">
                 <label className="text-[11px] font-bold uppercase text-slate-500 ml-1 tracking-wide">{brand.labels.loginPlaceholder}</label>
                 <input
                   type="text"
                   value={loginInput}
                   onChange={(e) => setLoginInput(e.target.value)}
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3.5 text-sm font-bold outline-none transition-all focus:border-slate-200"
                   style={{ '--tw-ring-color': brand.colors.primary } as any}
                 />
              </div>
              <button disabled={isLoading} className="w-full text-white font-bold py-3.5 rounded-[24px] shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-50" style={{ backgroundColor: brand.colors.primary }}>
                 {isLoading ? 'Ingresando...' : brand.labels.loginButton}
              </button>
            </form>
            <button onClick={() => { window.history.pushState({}, '', '/config'); setScreen(AppScreen.BRAND_SELECT); }} className="mt-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors self-center">
              ← Cambiar marca
            </button>
          </div>
        </div>
      )}

      {/* ──────── DASHBOARD SCREEN ──────── */}
      {screen === AppScreen.DASHBOARD && (
        <div className="p-4 space-y-4 animate-fade-in">
           <div className="flex justify-between items-end px-1">
             <div className="flex-1 min-w-0 pr-4">
                <p className="text-[11px] font-bold uppercase tracking-widest truncate" style={{ color: brand.colors.primary }}>{brand.labels.routineLabel}</p>
                <h2 className="text-2xl font-black italic tracking-tighter truncate">Mi Ruta</h2>
             </div>
             <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: brand.colors.primaryLight }}>
                <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=${brand.images.avatarBg}&color=${brand.images.avatarColor}`} className="w-full h-full object-cover" alt="User Avatar" />
             </div>
           </div>

           <div className="space-y-3">
             {routes.length === 0 && (
               <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                 <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                   <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                 </div>
                 <p className="text-sm font-bold text-slate-500 mb-1">Sin rutas asignadas</p>
                 <p className="text-[11px] font-bold text-slate-400">No hay visitas programadas para hoy.</p>
               </div>
             )}
             {routes.map(r => (
               <div key={r.visit_id} onClick={() => selectCustomer(r)} className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-md flex items-center gap-3 active:scale-95 transition-all cursor-pointer">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-inner shrink-0 text-white"
                    style={{ backgroundColor: r.status === 'completed' ? brand.colors.success : brand.colors.primary }}
                  >
                     {r.status === 'completed' ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg> : r.route_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-black text-slate-900 truncate tracking-tight">{r.customer.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                       <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest truncate">{r.customer.segment}</span>
                       <div className="w-1 h-1 rounded-full bg-slate-200 shrink-0"></div>
                       <span className="text-[11px] font-bold uppercase truncate" style={{ color: brand.colors.primary }}>{r.customer.pos_id}</span>
                    </div>
                  </div>
                  <div className="text-slate-400 shrink-0">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* ──────── CUSTOMER DETAIL SCREEN ──────── */}
      {screen === AppScreen.CUSTOMER_DETAIL && selectedRoute && (
        <div className="p-4 space-y-4 animate-fade-in pb-20">

           <div className="rounded-[32px] p-6 text-white relative overflow-hidden shadow-xl mb-4" style={{ backgroundColor: brand.colors.primary }}>
              <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black/10 pointer-events-none">
                 <svg className="w-40 h-40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              </div>

              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border border-white/10">
                  Active POS
                </span>
                <span className="border border-white/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-white/5">
                  {selectedRoute.customer.segment || 'Segmento General'}
                </span>
              </div>

              <div className="relative z-10 mb-8">
                <h2 className="text-3xl font-black italic tracking-tighter leading-none mb-2 shadow-black/10 drop-shadow-md break-words">
                  {selectedRoute.customer.name}
                </h2>
                <p className="text-sm font-bold text-white/90">
                  {selectedRoute.customer.contact_person || 'Contacto no registrado'}
                </p>
              </div>

              <div className="flex gap-3 relative z-10">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-1 opacity-80">Last Visit</p>
                  <div className="border border-white/30 rounded-xl px-3 py-1.5 bg-white/10 backdrop-blur-sm">
                    <span className="text-xs font-bold tracking-wider">
                       {selectedRoute.customer.last_visit || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-1 opacity-80">POS ID</p>
                  <div className="border border-white/30 rounded-xl px-3 py-1.5 bg-white/10 backdrop-blur-sm">
                    <span className="text-xs font-bold tracking-wider">
                       {selectedRoute.customer.pos_id || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
           </div>

           <div className="space-y-3">
             <h3 className="text-sm font-black italic px-1 tracking-tight">Tu progreso</h3>
             <div className="grid grid-cols-3 gap-2">
               {stats.map(s => <ProgressCircle key={s.label} {...s} />)}
             </div>
           </div>

           <div className="flex gap-1.5 bg-slate-100/60 p-1 rounded-full overflow-x-auto no-scrollbar border border-slate-50 shrink-0">
             {filters.map(f => (
               <button
                 key={f.key}
                 onClick={() => setActiveFilter(f.key)}
                 className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeFilter === f.key ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
               >
                 {f.label}
               </button>
             ))}
           </div>

           <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                 <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-[0.2em] truncate">Misiones guiadas</h3>
                 <span className="text-[11px] font-bold uppercase whitespace-nowrap" style={{ color: brand.colors.primary }}>{missions.filter(m => m.status === 'pending').length} Restantes</span>
              </div>

              <div className="space-y-3">
                {filteredMissions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">Sin misiones</p>
                    <p className="text-[11px] font-bold text-slate-400">{activeFilter === 'ALL' ? 'No hay misiones asignadas.' : 'No hay misiones en esta categoría.'}</p>
                  </div>
                )}
                {filteredMissions.map(m => (
                  <div
                    key={m.taskid}
                    onClick={() => m.status === 'pending' && startMission(m)}
                    className={`bg-white border rounded-xl p-4 transition-all relative overflow-hidden group
                      ${m.status === 'done'
                        ? 'border-emerald-100 opacity-60 bg-emerald-50/20'
                        : 'border-slate-50 shadow-lg cursor-pointer hover:shadow-xl active:scale-[0.98]'
                      }`
                    }
                  >
                    <div className="flex gap-3 items-start mb-3">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 shadow-inner overflow-hidden border border-slate-100 relative">
                          {(m.category === 'sales' || m.category === 'activation') && m.suggested_products && m.suggested_products.length > 0 ? (
                              <ProductImage src={m.suggested_products[0].image} alt={m.suggested_products[0].name} className="w-full h-full p-1.5" />
                          ) : (
                             <>
                                {m.type === 'take_photo' && (
                                   <div style={{ color: brand.colors.categoryColors.execution }}>
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                   </div>
                                )}
                                {m.type === 'dialog' && (
                                   <div style={{ color: brand.colors.categoryColors.communication }}>
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                   </div>
                                )}
                                {m.type === 'user_input' && (
                                   <div style={{ color: brand.colors.categoryColors.sales }}>
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                   </div>
                                )}
                                {m.type === 'single_sku_push' && (
                                   <div style={{ color: brand.colors.categoryColors.activation }}>
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                   </div>
                                )}
                                {!['take_photo', 'dialog', 'user_input', 'single_sku_push'].includes(m.type) && (
                                   <div style={{ color: brand.colors.primary }}><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                                )}
                             </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md border inline-block mb-1" style={getCategoryChipStyle(m.category)}>
                            {getCategoryLabel(m.category)}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 leading-tight tracking-tight break-words">{m.name}</h4>
                        </div>

                        {m.status === 'done' && (
                           <div className="absolute right-4 top-4 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                           </div>
                        )}

                        {m.status === 'pending' && (
                           <div className="absolute right-4 top-4 text-slate-200 transition-colors" style={{ ['--tw-text-opacity' as any]: 1 }}>
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                           </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {(m.insights || []).map((i, idx) => (
                            <div key={idx} className={`px-2 py-1 rounded-2xl border text-[11px] font-bold uppercase tracking-tighter flex items-center gap-1 ${getChipStyle(i.type)} whitespace-nowrap`}>
                              {i.label.includes('MAP') && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>}
                              {i.label}
                            </div>
                          ))}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* ──────── MISSION EXECUTION SCREEN ──────── */}
      {screen === AppScreen.MISSION_EXECUTION && selectedMission && (
        <div className="flex flex-col h-full bg-slate-50 animate-slide-up pb-24">
           <div className="flex-1 overflow-y-auto p-0 no-scrollbar">
              {(() => {
                const product = selectedMission.suggested_products?.[0];
                const hasProducts = selectedMission.suggested_products && selectedMission.suggested_products.length > 0;

                if (selectedMission.type === 'single_sku_push' && hasProducts && product) {
                  return (
                    <div className="flex flex-col min-h-full">
                        <div className="bg-white p-6 pb-8 rounded-b-[32px] shadow-sm mb-4">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">{getCategoryLabel(selectedMission.category)} MISSION</span>
                                <div className="w-6 h-6 text-slate-400">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                            </div>
                            <div className="flex items-start gap-5">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 p-2 relative shadow-inner" style={{ backgroundColor: brand.colors.primaryLight }}>
                                     <ProductImage src={product.image} alt={product.name} className="w-full h-full object-contain" />
                                     <div className="absolute -bottom-2 -right-2 rounded-full p-1 text-white border-2 border-white" style={{ backgroundColor: brand.colors.primary }}>
                                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                     </div>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-black text-slate-900 leading-tight uppercase mb-1">{product.name}</h2>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{selectedMission.description}</p>
                                </div>
                            </div>
                        </div>

                        <div className="px-4 mb-6">
                            <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden flex flex-col justify-center">
                                <div className="absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full" style={{ backgroundColor: brand.colors.primary }}></div>
                                <p className="text-[11px] font-bold uppercase tracking-widest mb-2 pl-3" style={{ color: brand.colors.primary }}>INSTRUCTION</p>
                                <p className="text-sm font-bold text-slate-700 italic pl-3 leading-relaxed">
                                    "{selectedMission.instruction_text}"
                                </p>
                            </div>
                        </div>

                        <div className="px-4 flex-1 flex flex-col">
                            <div className="flex gap-2 mb-3 px-1">
                                <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-sm">Near By</span>
                                <span className="px-3 py-1 bg-slate-200 text-slate-500 rounded-full text-[11px] font-bold uppercase tracking-widest">Map</span>
                            </div>

                            <div className="relative flex-1 min-h-[280px] bg-slate-200 rounded-[32px] overflow-hidden border-4 border-white shadow-md">
                                 <div ref={mapContainerRef} className="absolute inset-0 z-10" />
                                 <div className="absolute bottom-4 left-4 right-4 bg-white p-3 rounded-2xl shadow-lg z-20 flex items-center gap-3 animate-slide-up">
                                     <div className="w-10 h-10 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-500 shrink-0 shadow-sm border border-cyan-100">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                     </div>
                                     <div className="flex-1">
                                         <p className="text-[11px] font-bold text-slate-600 leading-tight">
                                            Este producto tiene <span className="font-black" style={{ color: brand.colors.primary }}>alta demanda</span> en esta zona.
                                         </p>
                                     </div>
                                     <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                                 </div>
                            </div>
                        </div>
                    </div>
                  );
                }

                if (selectedMission.type === 'offer_products') {
                  return (
                    <div className="flex flex-col min-h-full">
                      <div className="flex flex-col items-center text-center px-4 pt-4 pb-4">
                          <span className="text-white text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-widest mb-3 shadow-sm" style={{ backgroundColor: brand.colors.accent }}>
                            {getCategoryLabel(selectedMission.category)}
                          </span>
                          <h2 className="text-xl font-black text-slate-900 leading-tight mb-1 tracking-tight">{selectedMission.name}</h2>
                          <p className="text-xs font-bold text-slate-400">Mostrar lista de SKUs sugeridos.</p>
                      </div>

                      <div className="flex-1 px-3 space-y-2 pb-6">
                         {hasProducts ? selectedMission.suggested_products?.map((product) => (
                             <div key={product.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-slate-100 shadow-sm">
                                 <div className="w-14 h-16 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 p-1.5 relative overflow-hidden">
                                     <ProductImage src={product.image} alt={product.name} className="w-full h-full object-contain" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <h4 className="text-sm font-black text-slate-900 mb-0.5 leading-tight">{product.name}</h4>
                                     <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: brand.colors.accent }}>
                                         SUGERENCIA: {product.suggested_qty} UDS
                                     </p>
                                 </div>
                             </div>
                         )) : (
                            <div className="p-4 text-center text-slate-400 text-sm font-bold bg-slate-100 rounded-xl">No hay productos sugeridos.</div>
                         )}
                      </div>
                    </div>
                  );
                }

                if (selectedMission.type === 'dialog') {
                   return (
                    <div className="space-y-4 animate-fade-in w-full p-4">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest whitespace-nowrap" style={getCategoryChipStyle('communication')}>COMUNICACIÓN</span>
                       </div>

                       <div className="space-y-3 w-full">
                          <h2 className="text-xl font-black italic tracking-tighter leading-tight break-words">{selectedMission.name}</h2>
                          <p className="text-xs text-slate-400 font-bold italic leading-snug break-words">{selectedMission.description}</p>

                          <div className="space-y-3 pt-2">
                             {selectedMission.instruction_steps?.map((step, idx) => (
                                <p key={idx} className="text-sm font-bold text-slate-800 leading-tight p-3 bg-slate-50 rounded-2xl border border-slate-100 break-words shadow-sm">
                                   {step}
                                </p>
                             ))}
                          </div>
                       </div>

                       {selectedMission.questionnaire && (
                         <div className="bg-slate-50 p-4 rounded-[32px] border border-slate-100 space-y-4 shadow-sm">
                            <p className="text-sm font-bold italic tracking-tight break-words">{selectedMission.questionnaire.question}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                               {selectedMission.questionnaire.options.map(opt => (
                                  <button
                                    key={opt}
                                    onClick={() => setSurveyValue(opt)}
                                    className={`p-3 rounded-2xl flex items-center justify-center gap-2 transition-all ${surveyValue !== opt ? 'bg-white border border-slate-200 text-slate-400' : 'text-white shadow-xl scale-105'}`}
                                    style={surveyValue === opt ? { backgroundColor: brand.colors.primary } : {}}
                                  >
                                     <span className="font-bold text-xs uppercase">{opt}</span>
                                  </button>
                               ))}
                            </div>
                         </div>
                       )}

                       <div className="bg-slate-50 p-4 rounded-[32px] border border-slate-100 text-center space-y-3 shadow-sm">
                          <p className="text-[11px] font-bold uppercase text-slate-400 tracking-widest leading-relaxed break-words">¿Cómo calificarías la experiencia?</p>
                          <div className="flex justify-center gap-3 flex-wrap">
                             {[1,2,3,4,5].map(star => (
                                <button key={star} onClick={() => setStarRating(star)} className="text-2xl transition-all active:scale-125" style={{ color: star <= starRating ? brand.colors.primary : '#e2e8f0' }}>★</button>
                             ))}
                          </div>
                       </div>
                    </div>
                   );
                }

                if (selectedMission.type === 'take_photo') {
                    return (
                     <div className="space-y-4 animate-fade-in w-full p-4">
                        <div className="text-center px-2 space-y-0.5">
                           <span className="text-[11px] font-bold uppercase tracking-[0.2em] mb-0.5 inline-block truncate w-full" style={{ color: selectedMission.category === 'activation' ? brand.colors.categoryColors.activation : brand.colors.primary }}>
                              {selectedMission.category === 'activation' ? 'Activación' : `Ejecución ${brand.labels.missionSystem}`}
                           </span>
                           <h2 className="text-xl font-black italic tracking-tighter leading-tight break-words">{selectedMission.name}</h2>
                        </div>

                        <div onClick={() => cameraInputRef.current?.click()} className="w-full aspect-video bg-slate-50 rounded-[32px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer relative shadow-inner group">
                           {tempPhoto ? (
                             <img src={tempPhoto} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" alt="Captured POS" />
                           ) : (
                             <div className="flex flex-col items-center gap-3 group-hover:scale-110 transition-transform p-3 text-center">
                               <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg text-slate-200 shrink-0">
                                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                               </div>
                               <span className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] break-words">Ejecutar y capturar</span>
                             </div>
                           )}
                           <input type="file" ref={cameraInputRef} capture="environment" accept="image/*" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                 const reader = new FileReader();
                                 reader.onload = () => setTempPhoto(reader.result as string);
                                 reader.readAsDataURL(file);
                              }
                           }} />
                        </div>
                        <p className="text-xs font-bold text-slate-500 italic px-4 text-center leading-relaxed break-words">"{selectedMission.instruction_text || selectedMission.description}"</p>
                     </div>
                    );
                }

                if (selectedMission.type === 'user_input') {
                    return (
                    <div className="space-y-4 animate-fade-in w-full p-4">
                       <div className="text-center px-2 space-y-0.5">
                          <span className="text-[11px] font-bold uppercase tracking-[0.2em] mb-0.5 inline-block truncate w-full" style={{ color: brand.colors.primary }}>
                             {selectedMission.code === 'COMP_CHECK' ? 'Inteligencia de Mercado' : 'Prospección de Ventas'}
                          </span>
                          <h2 className="text-xl font-black italic tracking-tighter leading-tight break-words">{selectedMission.name}</h2>
                       </div>

                       <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex items-center gap-4 shadow-inner flex-wrap justify-between relative mt-2">
                          {selectedMission.code === 'COLD_DOORS' && (
                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-white text-[11px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm border-2 border-white whitespace-nowrap" style={{ backgroundColor: brand.colors.accent }}>
                                  Sugerido: 2
                              </div>
                          )}

                          <input
                            type="number"
                            placeholder="0"
                            value={userInputVal}
                            onChange={(e) => setUserInputVal(e.target.value)}
                            className="flex-1 min-w-[80px] bg-transparent text-5xl font-black italic outline-none placeholder:text-slate-200 text-center"
                            style={{ color: brand.colors.primary }}
                          />
                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block truncate">
                               {selectedMission.code === 'COMP_CHECK' ? 'Precio' : 'Negociadas'}
                            </span>
                            <span className="text-lg font-black text-slate-900 italic truncate">
                               {selectedMission.code === 'COMP_CHECK' ? 'Pesos' : 'Unidades'}
                            </span>
                          </div>
                       </div>
                    </div>
                    );
                }

                return (
                     <div className="space-y-4 animate-fade-in w-full p-6 flex flex-col items-center justify-center text-center mt-10">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <h2 className="text-xl font-black text-slate-900">{selectedMission.name}</h2>
                        <p className="text-sm font-bold text-slate-500 italic">{selectedMission.description}</p>

                        <div className="bg-amber-50 text-amber-600 border border-amber-100 px-4 py-3 rounded-xl text-xs font-bold w-full mt-4">
                           Esta tarea de tipo <span className="uppercase">{selectedMission.type}</span> no requiere información adicional.
                        </div>
                     </div>
                );
              })()}
           </div>

           <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-50 flex gap-4 max-w-lg mx-auto z-[60] shadow-[0_-15px_35px_rgba(0,0,0,0.05)]">
              <button
                onClick={completeMission}
                disabled={isValidating || !isMissionReady}
                className={`w-full py-3 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl shadow-2xl transition-all break-words leading-none ${isValidating || !isMissionReady ? 'bg-slate-300 cursor-not-allowed' : 'active:scale-95 hover:brightness-110'}`}
                style={!isValidating && isMissionReady ? { backgroundColor: brand.colors.primary } : {}}
              >
                 {isValidating ? 'Validando...' : 'Completar misión'}
              </button>
           </div>
        </div>
      )}

      {/* ──────── PROFILE SCREEN ──────── */}
      {screen === AppScreen.PROFILE && user && (
        <div className="p-4 flex flex-col items-center animate-fade-in space-y-5 h-full">
           <div className="w-32 h-32 rounded-[48px] text-white flex items-center justify-center text-5xl font-black shadow-2xl italic border-8 border-white animate-bounce-slow relative shrink-0" style={{ backgroundColor: brand.colors.primary }}>
              {user.name[0]}
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shrink-0 shadow-lg" style={{ backgroundColor: brand.colors.success }}>
                 <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
              </div>
           </div>
           <div className="text-center space-y-1 w-full px-4 overflow-hidden">
              <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-tight break-words">{user.name}</h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] truncate" style={{ color: brand.colors.primary }}>{user.company}</p>
              <p className="text-[11px] font-bold text-slate-400">ID: {user.emp_code}</p>
           </div>

           <div className="w-full grid grid-cols-2 gap-3 px-1">
              <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100 text-center shadow-sm">
                 <p className="text-[11px] font-bold uppercase text-slate-400 mb-1 truncate">{brand.labels.pointsLabel}</p>
                 <p className="text-xl font-black italic truncate">
                    {user.emp_code === "9876543" ? "2,100" : "4,850"}
                 </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100 text-center shadow-sm">
                 <p className="text-[11px] font-bold uppercase text-slate-400 mb-1 truncate">Racha</p>
                 <p className="text-xl font-black italic truncate">
                    {user.emp_code === "9876543" ? "3 Días" : "12 Días"}
                 </p>
              </div>
           </div>

           <button onClick={() => { window.history.pushState({}, '', '/config'); setScreen(AppScreen.BRAND_SELECT); }} className="w-full mt-auto py-3 bg-white border-2 text-[10px] font-bold uppercase tracking-widest rounded-[24px] shadow-sm active:bg-slate-50 transition-all" style={{ borderColor: `${brand.colors.primary}30`, color: brand.colors.primary }}>
             Cerrar Sesión
           </button>
        </div>
      )}
      {/* Animations and utilities now in styles.css */}
    </Layout>
  );
};
export default App;
