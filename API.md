# APIRouter API Documentation

Complete REST API reference for APIRouter.

## Base URL

```
http://localhost:3001/api
```

## Authentication

All endpoints (except `/health`) support optional Bearer token authentication:

```
Authorization: Bearer ar_xxxxxxxxxxxxx
```

## Response Format

All responses are JSON with the following structure:

```json
{
  "data": { /* response data */ },
  "error": "error message if any",
  "timestamp": "2026-01-31T10:30:00Z"
}
```

---

## System Endpoints

### Health Check

Check if the server is running.

```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-31T10:30:00Z"
}
```

---

## API Keys Management

### Create API Key

Create a new API key with specified provider permissions.

```
POST /api/keys
Content-Type: application/json

{
  "name": "My First Key",
  "providers": ["brave", "openai"]
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My First Key",
  "key": "ar_abcdef123456",
  "providers": ["brave", "openai"],
  "createdAt": "2026-01-31T10:30:00Z",
  "isActive": true
}
```

**Errors:**
- `400 Bad Request` — Missing name or providers
- `400 Bad Request` — Invalid provider name

---

### List API Keys

Get all active API keys.

```
GET /api/keys
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My First Key",
    "key": "ar_abcdef123456",
    "providers": ["brave"],
    "createdAt": "2026-01-31T10:30:00Z",
    "isActive": true
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "My Second Key",
    "key": "ar_ghijkl789012",
    "providers": ["openai"],
    "createdAt": "2026-01-31T10:30:00Z",
    "isActive": true
  }
]
```

---

### Get API Key

Get details for a specific API key.

```
GET /api/keys/{keyId}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My First Key",
  "key": "ar_abcdef123456",
  "providers": ["brave"],
  "createdAt": "2026-01-31T10:30:00Z",
  "isActive": true
}
```

**Errors:**
- `404 Not Found` — Key does not exist

---

### Delete API Key

Delete (deactivate) an API key.

```
DELETE /api/keys/{keyId}
```

**Response (204 No Content):**
```
(empty body)
```

**Errors:**
- `404 Not Found` — Key does not exist

---

## Provider Configuration

### List Providers

Get configuration status for all providers.

```
GET /api/config/providers
```

**Response (200 OK):**
```json
[
  {
    "name": "brave",
    "isConfigured": true,
    "apiKey": "ar_brave_key",
    "lastChecked": "2026-01-31T10:30:00Z"
  },
  {
    "name": "openai",
    "isConfigured": false,
    "apiKey": null,
    "lastChecked": null
  },
  {
    "name": "claude",
    "isConfigured": false,
    "apiKey": null,
    "lastChecked": null
  }
]
```

---

### Get Provider Config

Get configuration for a specific provider.

```
GET /api/config/providers/{name}
```

**Response (200 OK):**
```json
{
  "name": "brave",
  "isConfigured": true,
  "apiKey": "ar_brave_key",
  "lastChecked": "2026-01-31T10:30:00Z"
}
```

**Errors:**
- `404 Not Found` — Provider does not exist

---

### Update Provider Config

Configure a provider with API key and settings.

```
POST /api/config/providers/{name}
Content-Type: application/json

{
  "apiKey": "your-api-key",
  "baseUrl": "https://api.example.com",
  "rateLimit": 100,
  "timeout": 30000
}
```

**Response (200 OK):**
```json
{
  "name": "brave",
  "isConfigured": true,
  "apiKey": "your-api-key",
  "lastChecked": "2026-01-31T10:30:00Z"
}
```

**Errors:**
- `400 Bad Request` — Invalid provider or missing API key

---

### Check Provider Health

Verify that a provider is configured and responding.

```
POST /api/config/providers/{name}/check
```

**Response (200 OK):**
```json
{
  "name": "brave",
  "healthy": true,
  "checkedAt": "2026-01-31T10:30:00Z"
}
```

**Errors:**
- `404 Not Found` — Provider does not exist

---

### Delete Provider Config

Remove configuration for a provider.

```
DELETE /api/config/providers/{name}
```

**Response (204 No Content):**
```
(empty body)
```

**Errors:**
- `404 Not Found` — Provider does not exist

---

## Search API Proxy

### Brave Search (POST)

Search using Brave Search API via POST request.

```
POST /api/proxy/brave/search
Authorization: Bearer ar_xxxxx
Content-Type: application/json

{
  "q": "javascript testing",
  "count": 10,
  "offset": 0,
  "safesearch": "moderate"
}
```

**Query Parameters:**
- `q` (required) — Search query string
- `count` (optional) — Number of results (1-100, default: 10)
- `offset` (optional) — Result offset for pagination (default: 0)
- `safesearch` (optional) — Safety level: `off`, `moderate`, `strict` (default: moderate)

**Response (200 OK):**
```json
{
  "query": "javascript testing",
  "results": [
    {
      "title": "JavaScript Testing Guide",
      "url": "https://example.com/guide",
      "description": "Learn how to test JavaScript applications..."
    }
  ],
  "resultCount": 1,
  "executionTime": 125,
  "timestamp": "2026-01-31T10:30:00Z"
}
```

**Errors:**
- `400 Bad Request` — Missing or invalid query parameters
- `403 Forbidden` — API key doesn't have access to brave provider

---

### Brave Search (GET)

Search using Brave Search API via GET request.

```
GET /api/proxy/brave/search?q=javascript&count=10&offset=0&safesearch=moderate
Authorization: Bearer ar_xxxxx
```

**Query Parameters:**
Same as POST endpoint.

**Response:**
Same as POST endpoint.

---

## Error Handling

### Error Response Format

```json
{
  "error": "Descriptive error message",
  "details": {
    "field": "error details"
  }
}
```

### Common HTTP Status Codes

- `200 OK` — Request succeeded
- `201 Created` — Resource created successfully
- `204 No Content` — Request succeeded, no content to return
- `400 Bad Request` — Invalid request parameters
- `401 Unauthorized` — Missing or invalid authentication
- `403 Forbidden` — Access denied (permissions issue)
- `404 Not Found` — Resource not found
- `500 Internal Server Error` — Server error

---

## Rate Limiting

Not currently implemented in MVP. Coming in Week 2.

---

## Pagination

Use `offset` parameter for pagination:

```
GET /api/proxy/brave/search?q=test&count=10&offset=0
GET /api/proxy/brave/search?q=test&count=10&offset=10
GET /api/proxy/brave/search?q=test&count=10&offset=20
```

---

## Examples

### Create an API Key for Brave Search

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Brave Key",
    "providers": ["brave"]
  }'
```

### Configure Brave API

```bash
curl -X POST http://localhost:3001/api/config/providers/brave \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-brave-api-key"
  }'
```

### Perform a Search

```bash
curl -X POST http://localhost:3001/api/proxy/brave/search \
  -H "Authorization: Bearer ar_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "hello world",
    "count": 5
  }'
```

### Check Server Health

```bash
curl http://localhost:3001/api/health
```

---

## Valid Providers

Currently supported:
- `brave` — Brave Search API
- `openai` — OpenAI API (Week 2+)
- `claude` — Anthropic Claude API (Week 2+)

---

## Data Types

### ApiKey Object

```json
{
  "id": "uuid",
  "name": "string",
  "key": "string (ar_xxxxx)",
  "providers": ["string"],
  "createdAt": "ISO 8601 timestamp",
  "isActive": "boolean",
  "lastUsedAt": "ISO 8601 timestamp or null"
}
```

### Provider Object

```json
{
  "name": "string",
  "apiKey": "string (optional)",
  "isConfigured": "boolean",
  "lastChecked": "ISO 8601 timestamp or null"
}
```

### SearchResult Object

```json
{
  "title": "string",
  "url": "string (URL)",
  "description": "string"
}
```

---

## Changelog

### v0.1.0 (Current)
- Initial MVP release
- Key management API
- Provider configuration API
- Brave Search proxy
- Mock mode support
