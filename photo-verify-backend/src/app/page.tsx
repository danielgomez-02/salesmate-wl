export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <h1>PHOTO_VERIFY API</h1>
      <p>Multi-tenant image verification service for Salesmate Whitelabel.</p>

      <h2>Endpoints</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
            <th style={{ padding: '8px' }}>Method</th>
            <th style={{ padding: '8px' }}>Path</th>
            <th style={{ padding: '8px' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['GET', '/api/health', 'Health check'],
            ['POST', '/api/verify', 'Verify a photo against task criteria'],
            ['POST', '/api/upload', 'Upload a photo to storage'],
            ['GET', '/api/tasks', 'List tasks (filterable by status)'],
            ['POST', '/api/tasks', 'Create a new PHOTO_VERIFY task'],
            ['GET', '/api/tasks/:id', 'Get task details + verification history'],
            ['PUT', '/api/tasks/:id', 'Update a task'],
            ['DELETE', '/api/tasks/:id', 'Delete a task (admin only)'],
            ['GET', '/api/tenants', 'List tenants (admin only)'],
            ['POST', '/api/tenants', 'Create a new tenant (admin only)'],
          ].map(([method, path, desc]) => (
            <tr key={path} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '8px' }}>
                <code style={{
                  backgroundColor: method === 'GET' ? '#e8f5e9' : method === 'POST' ? '#e3f2fd' : method === 'PUT' ? '#fff3e0' : '#ffebee',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 13,
                }}>{method}</code>
              </td>
              <td style={{ padding: '8px' }}><code>{path}</code></td>
              <td style={{ padding: '8px' }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: '2rem' }}>Authentication</h2>
      <p>All endpoints (except <code>/api/health</code>) require a JWT Bearer token:</p>
      <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8, overflow: 'auto' }}>
{`Authorization: Bearer <your-jwt-token>`}
      </pre>

      <h2 style={{ marginTop: '2rem' }}>Quick Start</h2>
      <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
{`# 1. Generate a test token
npm run generate-token

# 2. Create a task
curl -X POST /api/tasks \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Verify fridge planogram",
    "type": "photo_verify",
    "photoVerificationConfig": {
      "prompt": "Analyze this retail fridge photo",
      "criteria": [{
        "id": "has_products",
        "label": "Products visible",
        "type": "boolean",
        "required": true
      }],
      "model": "gpt-4o-mini",
      "confidenceThreshold": 0.8
    }
  }'

# 3. Verify with a photo
curl -X POST /api/verify \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "taskId": "<task-id>",
    "imageUrl": "https://example.com/photo.jpg"
  }'`}
      </pre>

      <footer style={{ marginTop: '3rem', color: '#888', fontSize: 14 }}>
        <p>Salesmate Whitelabel &mdash; PHOTO_VERIFY Backend v1.0</p>
      </footer>
    </main>
  );
}
