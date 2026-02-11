import { UserData, RouteItem, Goal, Mission, MissionCategory, Product } from '../types';

// Mock Users (Kept for login/profile simulation)
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

// Fallback data in case the API call fails
const FALLBACK_TASKS = [
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

let missionsCache: Record<number, Mission[]> = {};

export const mockApi = {
  getUserInfo: async (identifier: string, companyName?: string): Promise<UserData> => {
    return new Promise((res) => setTimeout(() => {
      const user = USERS[identifier];
      if (user) {
        // Override company name with brand-specific name if provided
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

  getRoutes: async (empCode: string, dateOverride?: string): Promise<RouteItem[]> => {
    // Generate today's date
    const d = new Date();
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    // Calculate dynamic last visit date (7 days ago)
    const lastVisitDateObj = new Date(d);
    lastVisitDateObj.setDate(d.getDate() - 7);
    const dynamicLastVisit = lastVisitDateObj.toISOString().split('T')[0];
    
    const dateToSend = dateOverride || today;

    const API_KEY = 'retool_wk_a2fe1093a0b2432eb50969b486eeedba';
    const RETOOL_BASE_URL = "https://api.retool.com/v1/workflows/4b021616-b398-4ef6-a425-c38647c52648/startTrigger";
    
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1'));
    
    const targetUrl = isLocal
        ? "https://thingproxy.freeboard.io/fetch/" + encodeURIComponent(`${RETOOL_BASE_URL}?workflowApiKey=${API_KEY}`)
        : "/api/retool";

    console.log(`[API Request] Fetching routes. Target: ${targetUrl}`);

    let customersData: any = [];

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Workflow-Api-Key': API_KEY 
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
            if(errData.message) errorMsg = errData.message;
        } catch(e) {}
        throw new Error(`API Error ${response.status}: ${errorMsg}`);
      }

      const data = await response.json();
      // Nueva estructura: userRouteTasks es un array de clientes
      customersData = data.userRouteTasks || [];
      console.log(`[API Response] Received ${customersData.length} customers.`);
      
    } catch (error) {
      console.warn("API Request failed, using fallback data.", error);
      customersData = [];
    }

    const routeMap = new Map<string, RouteItem>();
    missionsCache = {}; 

    const generateId = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };

    const processTask = (taskItem: any, visitId: number, tIndex: number) => {
        // Mapeo de Categoría
        let category: MissionCategory = 'execution';
        const catUpper = (taskItem.mission_category || taskItem.category || '').toUpperCase();
        if (catUpper.includes('SALE')) category = 'sales';
        else if (catUpper.includes('COM')) category = 'communication';
        else if (catUpper.includes('ACTIV')) category = 'activation';

        // Mapeo de Tipo de Misión
        let type: Mission['type'] = 'check';
        const typeUpper = (taskItem.type || '').toUpperCase();
        const detail = taskItem.task_detail || taskItem; // Handle fallback structure where details are mixed or nested
        
        // Fix: Handle 'type_of_ action' (with space) which comes from API sometimes
        const detailAction = detail.type_of_action || detail['type_of_ action'];

        let suggestedProducts: Product[] | undefined = undefined;
        let instructionSteps: string[] | undefined = undefined;
        let questionnaire: any = undefined;

        if ((typeUpper === 'LIST' || typeUpper === 'SINGLE_SKU_PUSH') && detail.value && Array.isArray(detail.value)) {
            type = typeUpper === 'SINGLE_SKU_PUSH' ? 'single_sku_push' : 'offer_products';
            suggestedProducts = detail.value.map((sku: any, idx: number) => ({
                id: generateId(sku.sku_code || `SKU_${idx}`),
                name: sku.sku_name || 'Producto Coca-Cola',
                price: sku.price || 0,
                suggested_qty: sku.suggested_qty || 1,
                image: sku.sku_photo || "https://www.coca-cola.com/content/dam/on-premise/us/en/products/coca-cola-original/coca-cola-original-12oz.png",
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

        const mission: Mission = {
          taskid: taskItem.assignation_id || taskItem.task_id || generateId(`TASK_${visitId}_${tIndex}`),
          code: taskItem.code || `TASK_${taskItem.task_id || tIndex}`,
          name: taskItem.task_name || taskItem.name || 'Tarea sin nombre',
          description: detail.description || taskItem.task_name,
          type: type,
          category: category,
          required: taskItem.required !== false,
          status: taskItem.status === 'DONE' ? 'done' : 'pending',
          impact_score: taskItem.score_impact || taskItem.impact_score || 10,
          suggested_products: suggestedProducts,
          instruction_steps: instructionSteps || detail.instruction_steps,
          questionnaire: questionnaire,
          instruction_text: detail.instruction_text || detail.instruction_steps?.join(' ') || detail.description || ''
        };
        
        return mission;
    };

    if (Array.isArray(customersData) && customersData.length > 0) {
      customersData.forEach((customerBlock: any, index: number) => {
        // 1. Procesar Cliente API
        const custName = customerBlock.customer_name || `Cliente ${index + 1}`;
        const custCode = customerBlock.customer_code || `CUST_${generateId(custName).toString().substring(0,6)}`;
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
                segment: "Gold", // Default to Gold for UI demo
                pos_id: `POS-${custCode.substring(0,4)}`,
                lat: 4.6097 + (Math.random() * 0.01 - 0.005),
                lng: -74.0817 + (Math.random() * 0.01 - 0.005),
                last_visit: customerBlock.last_visit || dynamicLastVisit
              },
              route_order: index + 1,
              priority: 1,
              check_in: null,
              status: 'pending'
            });
            missionsCache[visitId] = [];
        }

        // 2. Procesar Tareas
        const tasks = customerBlock.task || [];
        tasks.forEach((taskItem: any, tIndex: number) => {
             const m = processTask(taskItem, visitId, tIndex);
             missionsCache[visitId].push(m);
        });
      });
    } else if (FALLBACK_TASKS.length > 0) {
        // Fallback Logic
        console.log("Using Fallback Tasks");
        FALLBACK_TASKS.forEach((fbTask: any, index: number) => {
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
                 missionsCache[visitId] = [];
             }
             
             const m = processTask(fbTask.task_detail, visitId, routeMap.size);
             missionsCache[visitId].push(m);
        });
    }

    return Array.from(routeMap.values());
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

  getMissions: async (visitId: number): Promise<Mission[]> => {
    return new Promise((res) => {
       setTimeout(() => {
         res(missionsCache[visitId] || []);
       }, 200);
    });
  },

  updateTaskStatus: async (taskId: number, feedback?: any): Promise<boolean> => {
    // Configuración para proxy local vs producción
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1'));
    
    // Si es local, usaremos thingproxy (solo para dev).
    // Si es producción (Vercel), usaremos NUESTRA api function /api/updateTask
    
    // NOTA IMPORTANTE: Para la API function local (/api/updateTask), NO necesitamos la API Key aquí en el frontend,
    // ya que la API function la inyecta de forma segura en el servidor.
    
    let targetUrl = "/api/updateTask";
    let headers: any = { 'Content-Type': 'application/json' };

    if (isLocal) {
        // Fallback solo para desarrollo local puro sin Vercel Functions
        const API_KEY = 'retool_wk_c12afdf2a34941239e8145742aa977f1';
        const RETOOL_BASE_URL = "https://api.retool.com/v1/workflows/6b212243-e544-4494-b114-fbc436244fc2/startTrigger";
        targetUrl = "https://thingproxy.freeboard.io/fetch/" + encodeURIComponent(`${RETOOL_BASE_URL}?workflowApiKey=${API_KEY}`);
        // Thingproxy a veces filtra headers custom, así que para dev local seguimos usando query param en la URL construida arriba.
    }

    console.log(`[API Request] Updating task ${taskId} status to DONE. Feedback included.`);

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                assignment_task_id: taskId,
                task_status: "DONE",
                feedback: feedback || {} // Enviamos el objeto feedback con la completitud de la tarea
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
        return true; // Optimistic update
    }
  }
};