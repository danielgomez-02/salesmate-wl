import { UserData, RouteItem, Goal, Mission, MissionCategory, Product } from '../types';

// ── API Configuration (from environment variables) ──
const ROUTES_API_KEY = import.meta.env.VITE_RETOOL_ROUTES_API_KEY || '';
const UPDATE_API_KEY = import.meta.env.VITE_RETOOL_UPDATE_API_KEY || '';

// ── Mock Users (Kept for login/profile simulation) ──
const USERS: Record<string, UserData> = {
  "1234567": {
    id: 1,
    company: "Coca-Cola FEMSA",
    name: "Alejandra Lopez",
    role: 'salesperson',
    emp_code: "1234567",
    phone: "+573001234567"
  },
  "9876543": {
    id: 2,
    company: "Coca-Cola FEMSA",
    name: "Camilo Torres",
    role: 'salesperson',
    emp_code: "9876543",
    phone: "+573009876543"
  }
};

// ── Fallback data in case the API call fails ──
interface FallbackTask {
  customer_code: string;
  customer_name: string;
  contact_person: string;
  address: string;
  segment: string;
  pos_id: string;
  lat: number;
  lng: number;
  priority: number;
  task_detail: {
    code: string;
    name: string;
    description: string;
    type: string;
    category: string;
    impact_score: number;
    instruction_text?: string;
    instruction_steps?: string[];
    priority_label?: string;
  };
}

const FALLBACK_TASKS: FallbackTask[] = [
  {
    customer_code: "CUST001",
    customer_name: "Supermercado El Sol",
    contact_person: "Maria Rodriguez",
    address: "Av. Siempre Viva 123",
    segment: "Gold",
    pos_id: "POS-1001",
    lat: 4.6097,
    lng: -74.0817,
    priority: 1,
    task_detail: {
      code: "COLD_DOORS",
      name: "Aumento de puertas frías",
      description: "Aumentar participación en equipos fríos.",
      type: "user_input",
      category: "sales",
      impact_score: 90,
      instruction_text: "Negociar 2 puertas adicionales para portafolio de innovación.",
      priority_label: "Alta"
    }
  },
  {
    customer_code: "CUST001",
    customer_name: "Supermercado El Sol",
    contact_person: "Maria Rodriguez",
    address: "Av. Siempre Viva 123",
    segment: "Gold",
    pos_id: "POS-1001",
    lat: 4.6097,
    lng: -74.0817,
    priority: 1,
    task_detail: {
      code: "PHOTO_EXEC",
      name: "Foto de Ejecución",
      description: "Tomar foto de la nevera principal.",
      type: "take_photo",
      category: "execution",
      impact_score: 50,
      instruction_text: "Asegurar planograma visible."
    }
  },
  {
    customer_code: "CUST002",
    customer_name: "Tienda La Esquina",
    contact_person: "Juan Perez",
    address: "Calle 10 # 5-20",
    segment: "Silver",
    pos_id: "POS-1002",
    lat: 4.6120,
    lng: -74.0850,
    priority: 2,
    task_detail: {
      code: "COM_CHECK",
      name: "Encuesta de Satisfacción",
      description: "Validar satisfacción con el último pedido.",
      type: "dialog",
      category: "communication",
      impact_score: 30,
      instruction_steps: ["Saludar al cliente", "Preguntar por entrega", "Registrar respuesta"]
    }
  }
];

// ── Helper: deterministic hash for ID generation ──
function generateId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ── Helper: parse a raw API task into a typed Mission ──
interface RawTaskItem {
  assignation_id?: number;
  task_id?: number;
  code?: string;
  task_name?: string;
  name?: string;
  description?: string;
  mission_category?: string;
  category?: string;
  type?: string;
  required?: boolean;
  status?: string;
  score_impact?: number;
  impact_score?: number;
  task_detail?: RawTaskItem;
  type_of_action?: string;
  'type_of_ action'?: string; // API sometimes includes space
  value?: RawSkuItem[];
  instruction_steps?: string[];
  instruction_text?: string;
  priority_label?: string;
  price?: number;
  suggested_qty?: number;
}

interface RawSkuItem {
  sku_code?: string;
  sku_name?: string;
  sku_photo?: string;
  price?: number;
  suggested_qty?: number;
}

interface RawCustomerBlock {
  customer_name?: string;
  customer_code?: string;
  customer_address?: string;
  last_visit?: string;
  task?: RawTaskItem[];
}

function parseTaskToMission(taskItem: RawTaskItem, visitId: number, tIndex: number): Mission {
  // Category mapping
  let category: MissionCategory = 'execution';
  const catUpper = (taskItem.mission_category || taskItem.category || '').toUpperCase();
  if (catUpper.includes('SALE')) category = 'sales';
  else if (catUpper.includes('COM')) category = 'communication';
  else if (catUpper.includes('ACTIV')) category = 'activation';

  // Mission type mapping
  let type: Mission['type'] = 'check';
  const typeUpper = (taskItem.type || '').toUpperCase();
  const detail = taskItem.task_detail || taskItem;
  const detailAction = detail.type_of_action || detail['type_of_ action'];

  let suggestedProducts: Product[] | undefined = undefined;
  let instructionSteps: string[] | undefined = undefined;
  let questionnaire: Mission['questionnaire'] = undefined;

  if ((typeUpper === 'LIST' || typeUpper === 'SINGLE_SKU_PUSH') && detail.value && Array.isArray(detail.value)) {
    type = typeUpper === 'SINGLE_SKU_PUSH' ? 'single_sku_push' : 'offer_products';
    suggestedProducts = detail.value.map((sku: RawSkuItem, idx: number) => ({
      id: generateId(sku.sku_code || `SKU_${idx}`),
      name: sku.sku_name || 'Producto',
      price: sku.price || 0,
      suggested_qty: sku.suggested_qty || 1,
      image: sku.sku_photo || '',
      code: sku.sku_code
    }));
  } else if (typeUpper === 'CHECK' || typeUpper === 'DIALOG') {
    type = 'dialog';
    if (detail.instruction_steps) {
      instructionSteps = detail.instruction_steps;
      questionnaire = {
        question: "¿Se completó la actividad satisfactoriamente?",
        options: ["Sí", "No", "Pendiente"]
      };
    } else if (detailAction) {
      instructionSteps = [`Acción requerida: ${detailAction}`];
      questionnaire = {
        question: "¿Resultado de la gestión?",
        options: ["Gestionado", "Rechazado", "Volver a intentar"]
      };
    } else {
      instructionSteps = [detail.description || detail.name || "Realizar verificación"];
      questionnaire = {
        question: "¿Tarea completada?",
        options: ["Sí", "No"]
      };
    }
  } else if (typeUpper === 'TAKE_PHOTO' || typeUpper === 'PHOTO' || typeUpper === 'IMAGE') {
    type = 'take_photo';
  } else if (typeUpper === 'USER_INPUT' || typeUpper === 'KPI') {
    type = 'user_input';
  }

  return {
    taskid: taskItem.assignation_id || taskItem.task_id || generateId(`TASK_${visitId}_${tIndex}`),
    code: taskItem.code || `TASK_${taskItem.task_id || tIndex}`,
    name: taskItem.task_name || taskItem.name || 'Tarea sin nombre',
    description: detail.description || taskItem.task_name || '',
    type,
    category,
    required: taskItem.required !== false,
    status: taskItem.status === 'DONE' ? 'done' : 'pending',
    impact_score: taskItem.score_impact || taskItem.impact_score || 10,
    suggested_products: suggestedProducts,
    instruction_steps: instructionSteps || detail.instruction_steps,
    questionnaire,
    instruction_text: detail.instruction_text || detail.instruction_steps?.join(' ') || detail.description || ''
  };
}

// ── Return type for getRoutes (routes + missions together) ──
export interface RoutesWithMissions {
  routes: RouteItem[];
  missionsMap: Record<number, Mission[]>;
}

// ── Feedback data shape for task completion ──
export interface TaskFeedback {
  type?: string;
  value?: string | number | string[];
  photo?: string;
  survey?: string;
  rating?: number;
  quantities?: Record<string, number>;
  [key: string]: unknown;
}

export const mockApi = {
  getUserInfo: async (identifier: string, companyName?: string): Promise<UserData> => {
    return new Promise((res) => setTimeout(() => {
      const user = USERS[identifier];
      if (user) {
        res({ ...user, company: companyName || user.company });
      } else {
        res({
          id: 999,
          company: companyName || "Empresa",
          name: "Representante Ventas",
          role: 'salesperson',
          emp_code: identifier || "0000",
          phone: "N/A"
        });
      }
    }, 800));
  },

  /**
   * Fetches routes AND missions in a single call.
   * Returns both the route list and a missions map keyed by visit_id.
   * This eliminates the need for a module-level missionsCache.
   */
  getRoutes: async (empCode: string, dateOverride?: string): Promise<RoutesWithMissions> => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    const lastVisitDateObj = new Date(d);
    lastVisitDateObj.setDate(d.getDate() - 7);
    const dynamicLastVisit = lastVisitDateObj.toISOString().split('T')[0];

    const dateToSend = dateOverride || today;

    // Always use server-side proxy paths (Vite dev proxy or Vercel serverless function)
    const targetUrl = '/api/retool';

    console.log(`[API Request] Fetching routes. Target: ${targetUrl}`);

    let customersData: RawCustomerBlock[] = [];

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Workflow-Api-Key': ROUTES_API_KEY,
        },
        body: JSON.stringify({
          emp_code: empCode,
          date: dateToSend
        })
      });

      if (!response.ok) {
        let errorMsg = response.statusText;
        try {
          const errData = await response.json();
          if (errData.message) errorMsg = errData.message;
        } catch (_e) { /* ignore parse error */ }
        throw new Error(`API Error ${response.status}: ${errorMsg}`);
      }

      const data = await response.json();
      customersData = data.userRouteTasks || [];
      console.log(`[API Response] Received ${customersData.length} customers.`);

    } catch (error) {
      console.warn("API Request failed, using fallback data.", error);
      customersData = [];
    }

    const routeMap = new Map<string, RouteItem>();
    const missionsMap: Record<number, Mission[]> = {};

    if (Array.isArray(customersData) && customersData.length > 0) {
      customersData.forEach((customerBlock: RawCustomerBlock, index: number) => {
        const custName = customerBlock.customer_name || `Cliente ${index + 1}`;
        const custCode = customerBlock.customer_code || `CUST_${generateId(custName).toString().substring(0, 6)}`;
        const visitId = generateId(`${custCode}_${dateToSend}`);

        if (!routeMap.has(custCode)) {
          routeMap.set(custCode, {
            visit_id: visitId,
            salesperson_id: parseInt(empCode) || 0,
            customer: {
              code: custCode,
              name: custName,
              address: customerBlock.customer_address || "Dirección pendiente",
              contact_person: "Encargado",
              segment: "Gold",
              pos_id: `POS-${custCode.substring(0, 4)}`,
              lat: 4.6097 + (Math.random() * 0.01 - 0.005),
              lng: -74.0817 + (Math.random() * 0.01 - 0.005),
              last_visit: customerBlock.last_visit || dynamicLastVisit
            },
            route_order: index + 1,
            priority: 1,
            check_in: null,
            status: 'pending'
          });
          missionsMap[visitId] = [];
        }

        const tasks = customerBlock.task || [];
        tasks.forEach((taskItem: RawTaskItem, tIndex: number) => {
          const m = parseTaskToMission(taskItem, visitId, tIndex);
          missionsMap[visitId].push(m);
        });
      });
    } else if (FALLBACK_TASKS.length > 0) {
      console.log("Using Fallback Tasks");
      FALLBACK_TASKS.forEach((fbTask: FallbackTask, index: number) => {
        const custCode = fbTask.customer_code;
        const visitId = generateId(`${custCode}_${dateToSend}`);

        if (!routeMap.has(custCode)) {
          routeMap.set(custCode, {
            visit_id: visitId,
            salesperson_id: parseInt(empCode) || 0,
            customer: {
              code: custCode,
              name: fbTask.customer_name,
              address: fbTask.address,
              contact_person: fbTask.contact_person,
              segment: fbTask.segment,
              pos_id: fbTask.pos_id,
              lat: fbTask.lat,
              lng: fbTask.lng,
              last_visit: dynamicLastVisit
            },
            route_order: routeMap.size + 1,
            priority: fbTask.priority,
            check_in: null,
            status: 'pending'
          });
          missionsMap[visitId] = [];
        }

        const m = parseTaskToMission(fbTask.task_detail as RawTaskItem, visitId, routeMap.size);
        missionsMap[visitId].push(m);
      });
    }

    return {
      routes: Array.from(routeMap.values()),
      missionsMap,
    };
  },

  getGoals: async (empCode: string): Promise<Goal[]> => {
    return [
      {
        goalid: 1,
        start_date: "2024-05-01",
        end_date: "2024-05-31",
        type: 'total',
        value: {
          values: [{
            unit: "Cajas",
            total: 1000,
            progress: [{ date: "2024-05-26", value: empCode === "9876543" ? 450 : 780 }]
          }]
        },
        completion_rate: empCode === "9876543" ? 0.45 : 0.78
      }
    ];
  },

  /**
   * Look up missions from a pre-built missions map (returned by getRoutes).
   * This replaces the old pattern of reading from a module-level cache.
   */
  getMissionsFromMap: (missionsMap: Record<number, Mission[]>, visitId: number): Mission[] => {
    return missionsMap[visitId] || [];
  },

  updateTaskStatus: async (taskId: number, feedback?: TaskFeedback): Promise<boolean> => {
    // Always use server-side proxy/function — no client-side API keys
    const targetUrl = '/api/updateTask';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Workflow-Api-Key': UPDATE_API_KEY,
    };

    console.log(`[API Request] Updating task ${taskId} status to DONE. Feedback included.`);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          assignment_task_id: taskId,
          task_status: "DONE",
          feedback: feedback || {}
        })
      });

      if (!response.ok) {
        console.error(`Failed to update task. Status: ${response.status}`);
        return false;
      }

      console.log("Task updated successfully");
      return true;
    } catch (error) {
      console.error("Network error updating task", error);
      // ERR-001 FIX: Return false on network error instead of optimistic true
      return false;
    }
  }
};
