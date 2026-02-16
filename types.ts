
export interface UserData {
  id: number;
  company: string;
  name: string;
  role: 'salesperson' | 'supervisor' | 'manager';
  emp_code: string;
  phone?: string;
}

export interface Customer {
  code: string;
  name: string;
  contact_person?: string;
  address?: string;
  segment?: string;
  pos_id?: string;
  last_visit?: string;
  nps_score?: number;
  last_visit_revenue?: number;
  lat?: number;
  lng?: number;
}

export interface RouteItem {
  visit_id: number;
  salesperson_id: number;
  customer: Customer;
  route_order: number;
  priority: number;
  check_in: string | null;
  status: 'pending' | 'completed' | 'in_progress';
}

export interface Goal {
  goalid: number;
  start_date: string;
  end_date: string;
  type: 'total' | 'units' | 'coverage';
  value: {
    values: {
      unit: string;
      total: number;
      progress: {
        date: string;
        value: number;
      }[];
    }[];
  };
  completion_rate: number;
}

export type MissionCategory = 'sales' | 'execution' | 'activation' | 'communication';

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  suggested_qty: number;
  code?: string;
  description?: string;
}

export interface InsightChip {
  label: string;
  type: 'danger' | 'info' | 'success' | 'warning' | 'neutral';
  icon?: string;
}

// ── Photo Verification Types ──
export interface VerificationCriterion {
  id: string;
  label: string;
  type: 'boolean' | 'count' | 'text';
  required: boolean;
  expectedValue?: string | number | boolean;
  min?: number;
  max?: number;
}

export interface PhotoVerificationConfig {
  prompt: string;
  criteria: VerificationCriterion[];
  model?: 'gpt-4o' | 'gpt-4o-mini';
  maxRetries?: number;
  fallbackToManual?: boolean;
  confidenceThreshold?: number;
}

export interface CriterionResult {
  criterionId: string;
  label: string;
  passed: boolean;
  value: string | number | boolean | null;
  confidence: number;
  reasoning: string;
}

export interface VerificationResult {
  passed: boolean;
  overallConfidence: number;
  criteriaResults: CriterionResult[];
  modelUsed: string;
  processingTimeMs: number;
  processedAt: string;
  mode: 'internal' | 'external';
  taskReference: string;
}

export interface Mission {
  taskid: number;
  code: string;
  name: string;
  description: string;
  type: 'photo' | 'checklist' | 'inventory' | 'order' | 'sku_list' | 'user_input' | 'check' | 'take_photo' | 'NPS' | 'offer_products' | 'dialog' | 'single_sku_push';
  category: MissionCategory;
  required: boolean; // Essential or Extra
  status: 'pending' | 'done';
  impact_score: number;
  priority_label?: string;
  insights?: InsightChip[];
  suggested_products?: Product[];
  instruction_steps?: string[];
  questionnaire?: {
    question: string;
    options: string[];
  };
  instruction_text?: string;
  verificationConfig?: PhotoVerificationConfig;
}

export enum AppScreen {
  LANDING,
  BRAND_SELECT,
  BRAND_ADMIN,
  LOGIN,
  DASHBOARD,
  ROUTE,
  CUSTOMER_DETAIL,
  MISSION_EXECUTION,
  GOALS,
  PROFILE
}

export interface BrandColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  success: string;
  successLight: string;
  categoryColors: {
    sales: string;
    execution: string;
    communication: string;
    activation: string;
  };
}

export interface BrandLabels {
  appName: string;
  appTagline: string;
  companyName: string;
  missionSystem: string;       // "RED" for Coca-Cola, "GOLD" for Bimbo, etc.
  pointsLabel: string;         // "Puntos RED", "Puntos GOLD"
  routineLabel: string;        // "Rutina RED", "Rutina GOLD"
  categories: Record<MissionCategory, string>;
  loginTitle: string;
  loginPlaceholder: string;
  loginButton: string;
}

export interface BrandImages {
  logo?: string;
  loginBanner?: string;
  fallbackProduct: string;
  avatarBg: string;
  avatarColor: string;
}

export interface BrandConfig {
  id: string;
  labels: BrandLabels;
  colors: BrandColors;
  images: BrandImages;
  storagePrefix: string;
  defaultEmpCode: string;
}
