import { BrandConfig } from '../types';

/** Default brands used as fallback when brands.json can't be loaded */
export const defaultBrands: Record<string, BrandConfig> = {
  cocacola: {
    id: 'cocacola',
    labels: {
      appName: 'Coca-Cola',
      appTagline: 'Salesmate Execution',
      companyName: 'Coca-Cola FEMSA',
      missionSystem: 'RED',
      pointsLabel: 'Puntos RED',
      routineLabel: 'Rutina RED',
      categories: {
        sales: 'VENTAS',
        execution: 'EJECUCIÓN',
        communication: 'COMUNICACIÓN',
        activation: 'ACTIVACIÓN',
      },
      loginTitle: 'Salesmate Pro',
      loginPlaceholder: 'Código de Empleado',
      loginButton: 'Ingresar',
    },
    colors: {
      primary: '#F40009',
      primaryLight: '#FEE2E2',
      primaryDark: '#DC2626',
      accent: '#00925d',
      accentLight: '#D1FAE5',
      success: '#10B981',
      successLight: '#D1FAE5',
      categoryColors: {
        sales: '#38bdf8',
        execution: '#a855f7',
        communication: '#2dd4bf',
        activation: '#f59e0b',
      },
    },
    images: {
      fallbackProduct: 'https://www.coca-cola.com/content/dam/on-premise/us/en/products/coca-cola-original/coca-cola-original-12oz.png',
      avatarBg: 'F40009',
      avatarColor: 'fff',
    },
    storagePrefix: 'coke_gamified_v3_',
    defaultEmpCode: '1234567',
  },

  bimbo: {
    id: 'bimbo',
    labels: {
      appName: 'Bimbo',
      appTagline: 'Field Execution Hub',
      companyName: 'Grupo Bimbo',
      missionSystem: 'GOLD',
      pointsLabel: 'Puntos GOLD',
      routineLabel: 'Rutina GOLD',
      categories: {
        sales: 'VENTAS',
        execution: 'EJECUCIÓN',
        communication: 'COMUNICACIÓN',
        activation: 'ACTIVACIÓN',
      },
      loginTitle: 'Execution Hub',
      loginPlaceholder: 'ID de Colaborador',
      loginButton: 'Acceder',
    },
    colors: {
      primary: '#0055A5',
      primaryLight: '#DBEAFE',
      primaryDark: '#1E40AF',
      accent: '#E8A317',
      accentLight: '#FEF3C7',
      success: '#059669',
      successLight: '#D1FAE5',
      categoryColors: {
        sales: '#6366f1',
        execution: '#ec4899',
        communication: '#14b8a6',
        activation: '#f97316',
      },
    },
    images: {
      fallbackProduct: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Bimbo_logo.svg/512px-Bimbo_logo.svg.png',
      avatarBg: '0055A5',
      avatarColor: 'fff',
    },
    storagePrefix: 'bimbo_exec_v1_',
    defaultEmpCode: '9876543',
  },

  yalo: {
    id: 'yalo',
    labels: {
      appName: 'Yalo',
      appTagline: 'Salesmate Platform',
      companyName: 'Yalo',
      missionSystem: 'CORE',
      pointsLabel: 'Puntos CORE',
      routineLabel: 'Rutina CORE',
      categories: {
        sales: 'VENTAS',
        execution: 'EJECUCIÓN',
        communication: 'COMUNICACIÓN',
        activation: 'ACTIVACIÓN',
      },
      loginTitle: 'Salesmate',
      loginPlaceholder: 'Employee Code',
      loginButton: 'Sign In',
    },
    colors: {
      primary: '#6C2BD9',
      primaryLight: '#EDE9FE',
      primaryDark: '#5B21B6',
      accent: '#06B6D4',
      accentLight: '#CFFAFE',
      success: '#10B981',
      successLight: '#D1FAE5',
      categoryColors: {
        sales: '#f43f5e',
        execution: '#8b5cf6',
        communication: '#06b6d4',
        activation: '#eab308',
      },
    },
    images: {
      fallbackProduct: 'https://ui-avatars.com/api/?name=Product&background=6C2BD9&color=fff&size=256',
      avatarBg: '6C2BD9',
      avatarColor: 'fff',
    },
    storagePrefix: 'yalo_sm_v1_',
    defaultEmpCode: '1234567',
  },
};

export const defaultBrandKeys = Object.keys(defaultBrands);
export const DEFAULT_BRAND = 'cocacola';
