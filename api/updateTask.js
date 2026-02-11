
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const RETOOL_URL = "https://api.retool.com/v1/workflows/6b212243-e544-4494-b114-fbc436244fc2/startTrigger";
  const API_KEY = "retool_wk_c12afdf2a34941239e8145742aa977f1";

  // Manejo de Preflight OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    const body = await req.json();
    
    // NOTA: Enviamos la Key en el HEADER como solicitaste, no en la URL.
    const response = await fetch(RETOOL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Workflow-Api-Key': API_KEY 
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

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
