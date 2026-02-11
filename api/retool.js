
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Configuración de Retool
  const RETOOL_URL = "https://api.retool.com/v1/workflows/4b021616-b398-4ef6-a425-c38647c52648/startTrigger";
  
  // CORS para permitir peticiones desde tu dominio
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Workflow-Api-Key'
      }
    });
  }

  try {
    // 1. Obtener la Key. 
    // Prioridad: Header (como solicitaste) -> Fallback: Hardcoded (para asegurar que funcione si falta el header)
    const headerKey = req.headers.get('x-workflow-api-key');
    const apiKey = headerKey || "retool_wk_a2fe1093a0b2432eb50969b486eeedba";

    // 2. Construir la URL final que Retool necesita
    const targetUrl = `${RETOOL_URL}?workflowApiKey=${apiKey}`;

    // 3. Obtener el cuerpo de la petición
    const body = await req.json();

    // 4. Hacer la petición a Retool desde el servidor
    const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    // 5. Devolver la respuesta al frontend
    return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });

  } catch (e) {
     return new Response(JSON.stringify({ error: e.message, success: false }), {
        status: 500,
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
  }
}
