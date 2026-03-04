# Photo Verify API — Guía de Integración

> **Base URL**: `https://photo-verify-backend.vercel.app`
> **Versión**: 1.0
> **Última actualización**: 2026-03-04

---

## Tabla de Contenidos

1. [Autenticación](#1-autenticación)
2. [Endpoint Principal: POST /api/verify](#2-endpoint-principal-post-apiverify)
3. [Enviar Imagen (URL vs Base64)](#3-enviar-imagen-url-vs-base64)
4. [Modos de Operación](#4-modos-de-operación)
5. [Configuración de Verificación](#5-configuración-de-verificación)
6. [Modelos de IA Disponibles](#6-modelos-de-ia-disponibles)
7. [Idiomas Soportados](#7-idiomas-soportados)
8. [Respuesta de la API](#8-respuesta-de-la-api)
9. [Ejemplos Completos con cURL](#9-ejemplos-completos-con-curl)
10. [Rate Limits](#10-rate-limits)
11. [Códigos de Error](#11-códigos-de-error)
12. [Otros Endpoints](#12-otros-endpoints)

---

## 1. Autenticación

Todas las peticiones requieren un **JWT Bearer Token** en el header `Authorization`.

```
Authorization: Bearer <token>
```

### Generar un Token

El token se firma con **HS256** usando el secret configurado en la variable de entorno `JWT_SECRET` del servidor.

**Payload del JWT:**

```json
{
  "tenantId": "tenant_abc123",
  "tenantSlug": "mi-empresa",
  "role": "operator",
  "userId": "user_001",
  "iat": 1709568000,
  "exp": 1709654400
}
```

| Campo        | Tipo     | Requerido | Descripción                                      |
|--------------|----------|-----------|--------------------------------------------------|
| `tenantId`   | string   | ✅        | ID único del tenant                              |
| `tenantSlug` | string   | ✅        | Slug del tenant (lowercase, guiones)             |
| `role`       | string   | ✅        | Rol: `admin`, `operator`, o `viewer`             |
| `userId`     | string   | ❌        | ID del usuario que hace la petición              |
| `iat`        | number   | ✅        | Timestamp de emisión (issued at)                 |
| `exp`        | number   | ✅        | Timestamp de expiración                          |

**Ejemplo en Node.js:**

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    tenantId: 'tenant_abc123',
    tenantSlug: 'mi-empresa',
    role: 'operator',
    userId: 'user_001',
  },
  process.env.JWT_SECRET, // El mismo secret que usa el servidor
  { expiresIn: '24h' }
);
```

**Ejemplo en Python:**

```python
import jwt, time

token = jwt.encode(
    {
        "tenantId": "tenant_abc123",
        "tenantSlug": "mi-empresa",
        "role": "operator",
        "userId": "user_001",
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400,
    },
    JWT_SECRET,
    algorithm="HS256",
)
```

---

## 2. Endpoint Principal: POST /api/verify

Este es el endpoint principal para verificar fotos con IA.

```
POST /api/verify
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Body

```json
{
  "externalTaskId": "order_12345",
  "imageBase64": "<base64-encoded-image>",
  "config": {
    "prompt": "Verifica que la foto muestre un estante de productos correctamente surtido",
    "criteria": [
      {
        "id": "products_visible",
        "label": "Productos visibles en estante",
        "type": "boolean",
        "required": true,
        "expectedValue": true
      }
    ],
    "provider": "gemini",
    "model": "gemini-2.0-flash",
    "confidenceThreshold": 0.8
  },
  "lang": "es"
}
```

| Campo            | Tipo     | Requerido | Descripción                                                       |
|------------------|----------|-----------|-------------------------------------------------------------------|
| `taskId`         | string   | ❌¹       | ID de tarea interna (modo interno)                                |
| `externalTaskId` | string   | ❌¹       | ID de tarea externa — tu ID de referencia                         |
| `imageUrl`       | string   | ❌²       | URL pública de la imagen a verificar                              |
| `imageBase64`    | string   | ❌²       | Imagen codificada en Base64 (sin prefijo `data:`)                 |
| `config`         | object   | ❌³       | Configuración de verificación (requerido en modo externo)         |
| `lang`           | string   | ❌        | Idioma del feedback: `es`, `en`, `pt` (default: `es`)            |

> ¹ Se requiere **uno** de: `taskId` o `externalTaskId`
> ² Se requiere **uno** de: `imageUrl` o `imageBase64`
> ³ Requerido cuando se usa `externalTaskId`

---

## 3. Enviar Imagen (URL vs Base64)

La API acepta imágenes de **dos formas**. Usa la que mejor se adapte a tu flujo.

### Opción A: URL pública

Envía una URL accesible públicamente. Ideal cuando la imagen ya está en un CDN o storage.

```json
{
  "imageUrl": "https://storage.example.com/photos/store_123.jpg"
}
```

### Opción B: Base64 (recomendado para apps móviles)

Envía la imagen codificada en Base64. **No incluyas el prefijo `data:image/...;base64,`**, solo el string Base64 puro.

```json
{
  "imageBase64": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYH..."
}
```

**Cómo obtener el Base64 en diferentes lenguajes:**

JavaScript (Browser):
```javascript
// Desde un input file
const file = document.querySelector('input[type="file"]').files[0];
const reader = new FileReader();
reader.onload = () => {
  const base64 = reader.result.split(',')[1]; // Quitar prefijo data:image/...
  // Usar base64 en la petición
};
reader.readAsDataURL(file);
```

JavaScript (Node.js):
```javascript
const fs = require('fs');
const base64 = fs.readFileSync('photo.jpg').toString('base64');
```

Python:
```python
import base64

with open("photo.jpg", "rb") as f:
    image_base64 = base64.b64encode(f.read()).decode("utf-8")
```

React Native / Expo:
```javascript
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchCameraAsync({ base64: true });
const base64 = result.assets[0].base64; // Ya viene sin prefijo
```

Flutter/Dart:
```dart
import 'dart:convert';
import 'dart:io';

final bytes = await File('photo.jpg').readAsBytes();
final base64 = base64Encode(bytes);
```

### ¿Qué pasa internamente con Base64?

1. La API intenta subir la imagen a Vercel Blob Storage para obtener una URL
2. Si la subida tiene éxito, usa la URL generada (más eficiente en tokens)
3. Si la subida falla, envía el Base64 directamente al modelo de IA (funciona pero usa más tokens)

**Formatos de imagen soportados**: JPEG, PNG, WebP, GIF

---

## 4. Modos de Operación

### Modo Externo (recomendado para integración)

Usa `externalTaskId` + `config` para enviar toda la configuración en la misma petición. No necesitas crear tareas en nuestra base de datos.

```json
{
  "externalTaskId": "tu-id-de-referencia-123",
  "imageBase64": "<base64>",
  "config": { ... },
  "lang": "es"
}
```

### Modo Interno

Usa `taskId` que referencia una tarea creada previamente en nuestra DB vía `POST /api/tasks`. La configuración se toma de la tarea almacenada.

```json
{
  "taskId": "task_abc123",
  "imageBase64": "<base64>"
}
```

---

## 5. Configuración de Verificación

El objeto `config` define qué debe verificar la IA en la foto.

```json
{
  "prompt": "Instrucciones específicas para la IA sobre qué evaluar",
  "criteria": [ ... ],
  "provider": "gemini",
  "model": "gemini-2.0-flash",
  "maxRetries": 2,
  "fallbackToManual": true,
  "confidenceThreshold": 0.8
}
```

| Campo                  | Tipo     | Default          | Descripción                                        |
|------------------------|----------|------------------|----------------------------------------------------|
| `prompt`               | string   | —                | Instrucciones para el modelo de IA                 |
| `criteria`             | array    | —                | Lista de criterios a evaluar (mínimo 1)            |
| `provider`             | string   | `"openai"`       | Proveedor de IA: `"openai"` o `"gemini"`           |
| `model`                | string   | `"gpt-4o-mini"`  | Modelo específico del proveedor                    |
| `maxRetries`           | number   | `2`              | Reintentos si falla el modelo                      |
| `fallbackToManual`     | boolean  | `true`           | Marcar para revisión manual si no pasa             |
| `confidenceThreshold`  | number   | `0.8`            | Umbral de confianza (0.0 a 1.0)                    |

### Criterios de Verificación

Cada criterio en el array `criteria` define una condición a evaluar:

```json
{
  "id": "product_count",
  "label": "Cantidad de productos en estante",
  "type": "count",
  "required": true,
  "min": 10,
  "max": 50
}
```

| Campo           | Tipo                            | Requerido | Descripción                               |
|-----------------|---------------------------------|-----------|-------------------------------------------|
| `id`            | string                          | ✅        | Identificador único del criterio          |
| `label`         | string                          | ✅        | Descripción legible del criterio          |
| `type`          | `"boolean"` `"count"` `"text"`  | ✅        | Tipo de verificación                      |
| `required`      | boolean                         | ❌        | Si el criterio es obligatorio (default: true) |
| `expectedValue` | string / number / boolean       | ❌        | Valor esperado                            |
| `min`           | number                          | ❌        | Valor mínimo (para type: count)           |
| `max`           | number                          | ❌        | Valor máximo (para type: count)           |

**Tipos de criterio:**

- `boolean` — ¿Se cumple o no una condición? Ej: "¿El logo está visible?"
- `count` — Contar elementos. Ej: "Cantidad de productos en el estante"
- `text` — Extraer texto o información. Ej: "¿Qué marca se muestra?"

---

## 6. Modelos de IA Disponibles

| Modelo                   | Provider | Costo Input (USD/1M tokens) | Costo Output (USD/1M tokens) | Notas                     |
|--------------------------|----------|-----------------------------|-----------------------------|---------------------------|
| `gpt-4o-mini`            | openai   | $0.15                       | $0.60                       | Rápido y económico        |
| `gpt-4o`                 | openai   | $2.50                       | $10.00                      | Mayor precisión           |
| `gemini-2.0-flash`       | gemini   | $0.10                       | $0.40                       | Mejor relación costo/calidad |
| `gemini-2.0-flash-lite`  | gemini   | $0.025                      | $0.10                       | Ultra económico           |
| `gemini-1.5-pro`         | gemini   | $1.25                       | $5.00                       | Mayor precisión Gemini    |

**Recomendación**: Para la mayoría de verificaciones de campo, `gemini-2.0-flash` ofrece la mejor relación costo-precisión.

---

## 7. Idiomas Soportados

El parámetro `lang` controla el idioma del feedback de la IA (campos `reasoning` y `overall_assessment`):

| Código | Idioma     |
|--------|------------|
| `es`   | Español (default) |
| `en`   | English    |
| `pt`   | Português  |

---

## 8. Respuesta de la API

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "data": {
    "passed": true,
    "overallConfidence": 0.92,
    "criteriaResults": [
      {
        "criterionId": "products_visible",
        "label": "Productos visibles en estante",
        "passed": true,
        "value": true,
        "confidence": 0.95,
        "reasoning": "Se observan claramente múltiples productos organizados en el estante"
      },
      {
        "criterionId": "product_count",
        "label": "Cantidad de productos",
        "passed": true,
        "value": 24,
        "confidence": 0.88,
        "reasoning": "Se cuentan aproximadamente 24 productos distribuidos en 3 niveles"
      }
    ],
    "modelUsed": "gemini-2.0-flash",
    "processingTimeMs": 2340,
    "processedAt": "2026-03-04T15:30:00.000Z",
    "mode": "external",
    "taskReference": "order_12345"
  },
  "meta": {
    "tenantId": "tenant_abc123",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-03-04T15:30:02.340Z"
  }
}
```

### Campos de Respuesta

| Campo                        | Tipo     | Descripción                                        |
|------------------------------|----------|----------------------------------------------------|
| `data.passed`                | boolean  | Si la verificación pasó globalmente                |
| `data.overallConfidence`     | number   | Confianza general (0.0 - 1.0)                     |
| `data.criteriaResults[]`     | array    | Resultado por cada criterio                        |
| `data.criteriaResults[].passed`     | boolean | Si ese criterio pasó                        |
| `data.criteriaResults[].value`      | any     | Valor observado por la IA                   |
| `data.criteriaResults[].confidence` | number  | Confianza de ese criterio (0.0 - 1.0)      |
| `data.criteriaResults[].reasoning`  | string  | Explicación de la IA (en el idioma elegido) |
| `data.modelUsed`             | string   | Modelo de IA utilizado                             |
| `data.processingTimeMs`      | number   | Tiempo de procesamiento en ms                      |
| `data.mode`                  | string   | `"internal"` o `"external"`                        |
| `data.taskReference`         | string   | El `taskId` o `externalTaskId` enviado             |

---

## 9. Ejemplos Completos con cURL

### Ejemplo 1: Verificación con URL de imagen

```bash
curl -X POST https://photo-verify-backend.vercel.app/api/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu-token-jwt>" \
  -d '{
    "externalTaskId": "visit_001",
    "imageUrl": "https://storage.example.com/photos/store.jpg",
    "config": {
      "prompt": "Verifica que la foto muestre un refrigerador de bebidas correctamente surtido",
      "criteria": [
        {
          "id": "fridge_visible",
          "label": "Refrigerador visible",
          "type": "boolean",
          "required": true,
          "expectedValue": true
        },
        {
          "id": "brand_count",
          "label": "Cantidad de marcas visibles",
          "type": "count",
          "min": 3
        }
      ],
      "provider": "gemini",
      "model": "gemini-2.0-flash",
      "confidenceThreshold": 0.75
    },
    "lang": "es"
  }'
```

### Ejemplo 2: Verificación con Base64 (app móvil)

```bash
# Codificar imagen a base64
BASE64_IMAGE=$(base64 -i foto_tienda.jpg | tr -d '\n')

curl -X POST https://photo-verify-backend.vercel.app/api/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu-token-jwt>" \
  -d "{
    \"externalTaskId\": \"visit_002\",
    \"imageBase64\": \"${BASE64_IMAGE}\",
    \"config\": {
      \"prompt\": \"Verifica la exhibición de producto en punto de venta\",
      \"criteria\": [
        {
          \"id\": \"display_present\",
          \"label\": \"Exhibidor presente\",
          \"type\": \"boolean\",
          \"required\": true,
          \"expectedValue\": true
        },
        {
          \"id\": \"price_tag\",
          \"label\": \"Etiqueta de precio visible\",
          \"type\": \"text\"
        }
      ],
      \"provider\": \"openai\",
      \"model\": \"gpt-4o-mini\"
    },
    \"lang\": \"es\"
  }"
```

### Ejemplo 3: Integración desde JavaScript (fetch)

```javascript
async function verifyPhoto(imageBase64, externalTaskId) {
  const response = await fetch('https://photo-verify-backend.vercel.app/api/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JWT_TOKEN}`,
    },
    body: JSON.stringify({
      externalTaskId,
      imageBase64,
      config: {
        prompt: 'Verifica que la foto muestre el anaquel correctamente surtido',
        criteria: [
          {
            id: 'shelf_stocked',
            label: 'Anaquel surtido',
            type: 'boolean',
            required: true,
            expectedValue: true,
          },
          {
            id: 'product_count',
            label: 'Cantidad de productos',
            type: 'count',
            min: 10,
          },
        ],
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        confidenceThreshold: 0.8,
      },
      lang: 'es',
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}
```

### Ejemplo 4: Integración desde Python

```python
import requests
import base64

def verify_photo(image_path: str, external_task_id: str) -> dict:
    # Leer imagen y convertir a base64
    with open(image_path, "rb") as f:
        image_base64 = base64.b64encode(f.read()).decode("utf-8")

    response = requests.post(
        "https://photo-verify-backend.vercel.app/api/verify",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {JWT_TOKEN}",
        },
        json={
            "externalTaskId": external_task_id,
            "imageBase64": image_base64,
            "config": {
                "prompt": "Verifica la correcta colocación del material POP",
                "criteria": [
                    {
                        "id": "pop_visible",
                        "label": "Material POP visible",
                        "type": "boolean",
                        "required": True,
                        "expectedValue": True,
                    },
                    {
                        "id": "brand_name",
                        "label": "Marca del material",
                        "type": "text",
                    },
                ],
                "provider": "gemini",
                "model": "gemini-2.0-flash",
                "confidenceThreshold": 0.8,
            },
            "lang": "es",
        },
    )

    data = response.json()
    if not data["success"]:
        raise Exception(data["error"]["message"])

    return data["data"]
```

---

## 10. Rate Limits

| Operación      | Límite              |
|----------------|---------------------|
| Verificaciones | 20 por minuto       |
| Subida de archivos | 30 por minuto   |

Si excedes el límite recibirás un **429 Too Many Requests**.

---

## 11. Códigos de Error

| HTTP | Código              | Descripción                                               |
|------|---------------------|-----------------------------------------------------------|
| 400  | `VALIDATION_ERROR`  | Body inválido (falta campo, tipo incorrecto, etc.)        |
| 401  | `UNAUTHORIZED`      | Token faltante o inválido                                 |
| 403  | `FORBIDDEN`         | Rol insuficiente para la operación                        |
| 404  | `NOT_FOUND`         | Tarea o recurso no encontrado                             |
| 429  | `RATE_LIMITED`      | Se excedió el límite de peticiones                        |
| 500  | `INTERNAL_ERROR`    | Error interno del servidor                                |

### Ejemplo de error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Either imageUrl or imageBase64 must be provided"
  },
  "meta": {
    "tenantId": "tenant_abc123",
    "requestId": "...",
    "timestamp": "2026-03-04T15:30:00.000Z"
  }
}
```

---

## 12. Otros Endpoints

| Método | Endpoint              | Descripción                           |
|--------|-----------------------|---------------------------------------|
| POST   | `/api/upload`         | Subir imagen (multipart/form-data)    |
| GET    | `/api/tasks`          | Listar tareas del tenant              |
| POST   | `/api/tasks`          | Crear tarea interna                   |
| GET    | `/api/tasks/:id`      | Obtener detalle de tarea              |
| GET    | `/api/verifications`  | Historial de verificaciones           |
| GET    | `/api/billing`        | Uso de tokens y costos                |
| GET    | `/api/health`         | Health check del servicio             |

---

## Soporte

Para dudas sobre la integración, contactar al equipo de desarrollo.
