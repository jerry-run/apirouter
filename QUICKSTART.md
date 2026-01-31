# Quick Start Guide

Get APIRouter up and running in 5 minutes.

## Prerequisites

- Node.js 20 LTS
- npm 10+
- (Optional) Docker & Docker Compose

## Installation

### 1. Clone and Install

```bash
git clone https://github.com/your-org/apirouter.git
cd apirouter

# Install dependencies
npm install

# Install backend and frontend dependencies
npm run backend:install    # or: cd backend && npm install
npm run frontend:install   # or: cd frontend && npm install
```

### 2. Start the Services

**Development mode (both backend + frontend):**

```bash
npm run dev
```

This starts:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:3000`

Or start them separately:

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### 3. Open the Web UI

Navigate to `http://localhost:3000` in your browser.

---

## Scenario 1: Search with Brave API (No Configuration)

**Goal:** Search the web without any setup.

### Steps

1. **Open APIRouter**
   - Navigate to `http://localhost:3000`

2. **The app works in Mock mode by default**
   - No API keys required
   - No configuration needed
   - Get sample search results instantly

3. **Try a search**
   - Go to any page
   - The backend returns mock data (no real API calls)
   - Perfect for development/testing

---

## Scenario 2: Create Your First API Key

**Goal:** Generate an API key to access the service.

### Steps

1. **Go to Keys Page**
   - Click "🔑 API Keys" in the navigation

2. **Create a New Key**
   - Click "Create Key" button
   - Enter a name: `My First Key`
   - Select provider: `brave`
   - Click "Create"

3. **Copy Your Key**
   - Your new key appears in the list
   - Click "Copy" to copy `ar_xxxxx`
   - **Keep this safe!** (Show once, never logged)

4. **Use the Key**
   ```bash
   curl -X POST http://localhost:3001/api/proxy/brave/search \
     -H "Authorization: Bearer ar_xxxxx" \
     -H "Content-Type: application/json" \
     -d '{"q": "hello world"}'
   ```

---

## Scenario 3: Configure Real Brave API Key

**Goal:** Use your real Brave Search API credentials.

### Steps

1. **Get Your Brave API Key**
   - Visit [Brave Search Developer Console](https://cse.bing.com/)
   - Sign up and create an API key
   - Copy your API key

2. **Configure in APIRouter**
   - Open APIRouter: `http://localhost:3000`
   - Click "⚙️ Configuration"
   - Click "Brave" tab
   - Paste your API key in the "API Key" field
   - Click "Save Configuration"

3. **Verify Configuration**
   - A "Health Check" button appears
   - Click it to verify the API key works
   - You should see "Healthy" status

4. **Now Use Real Search**
   ```bash
   # Get a key first
   curl -X POST http://localhost:3001/api/keys \
     -H "Content-Type: application/json" \
     -d '{"name": "prod-key", "providers": ["brave"]}'
   
   # Use the key to search
   curl -X POST http://localhost:3001/api/proxy/brave/search \
     -H "Authorization: Bearer ar_xxxxx" \
     -H "Content-Type: application/json" \
     -d '{"q": "javascript"}'
   ```

---

## Scenario 4: Monitor Usage Statistics

**Goal:** Track API usage by key and provider.

### Steps

1. **Go to Statistics**
   - Click "📊 Statistics" in navigation

2. **View Summary**
   - Total Keys created
   - Active vs Inactive keys
   - Total requests made

3. **Filter by Provider**
   - Use the dropdown to filter by provider
   - See which keys have been used

4. **Monitor Key Activity**
   - Last used timestamp for each key
   - Status (Active/Deleted)
   - Associated providers

---

## Scenario 5: Multi-Provider Setup

**Goal:** Create a key with access to multiple providers.

### Steps

1. **Create Multi-Provider Key**
   - Go to "API Keys" page
   - Click "Create Key"
   - Name: `universal-key`
   - Select: `brave`, `openai`, and `claude`
   - Click "Create"

2. **Configure Each Provider**
   - Go to "Configuration"
   - For each provider tab:
     - Add your API key
     - Click "Save Configuration"

3. **Use the Key**
   - This single key has access to all 3 providers
   - Use with `/api/proxy/{provider}/search`
   - Example:
     ```bash
     # Brave search
     curl -X POST http://localhost:3001/api/proxy/brave/search \
       -H "Authorization: Bearer {universal-key}" \
       -d '{"q": "test"}'
     
     # OpenAI (Week 2+)
     # curl -X POST http://localhost:3001/api/proxy/openai/... \
     #   -H "Authorization: Bearer {universal-key}" \
     ```

---

## Docker Setup

### Run with Docker Compose

```bash
docker-compose up
```

This starts:
- Backend container (port 3001)
- Frontend container (port 3000)
- Redis container (port 6379) for future use

Access the app at `http://localhost:3000`

### Build and Run Individual Containers

```bash
# Build backend
docker build -t apirouter-backend ./backend

# Build frontend
docker build -t apirouter-frontend ./frontend

# Run backend
docker run -p 3001:3001 apirouter-backend

# Run frontend
docker run -p 3000:3000 apirouter-frontend
```

---

## Common Commands

```bash
# Run all tests
npm test

# Run backend tests only
cd backend && npm test

# Run frontend tests only
cd frontend && npm test

# Build for production
npm run build

# Start production build
npm run start

# Check health
curl http://localhost:3001/api/health

# See API docs
cat API.md
```

---

## API Examples

### Create an API Key

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Dev Key",
    "providers": ["brave"]
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "My Dev Key",
  "key": "ar_xxxxx",
  "providers": ["brave"],
  "createdAt": "2026-01-31T...",
  "isActive": true
}
```

### List All Keys

```bash
curl http://localhost:3001/api/keys
```

### Search Brave (with Key)

```bash
curl -X POST http://localhost:3001/api/proxy/brave/search \
  -H "Authorization: Bearer ar_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "javascript tutorials",
    "count": 5
  }'
```

**Response:**
```json
{
  "query": "javascript tutorials",
  "results": [
    {
      "title": "...",
      "url": "...",
      "description": "..."
    }
  ],
  "resultCount": 5,
  "executionTime": 125,
  "timestamp": "2026-01-31T..."
}
```

---

## Troubleshooting

### "Cannot find module X"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Backend not responding

```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check logs
tail -f /tmp/backend.log

# Restart backend
cd backend && npm run dev
```

### Frontend shows error

```bash
# Clear browser cache
# Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)

# Hard refresh
Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

### API key not working

1. Check the key format (should start with `ar_`)
2. Verify the key is active (not deleted)
3. Check the key has the required provider permission
4. Try without authentication (mock mode)

---

## Next Steps

1. **Read the full API documentation** — [API.md](./API.md)
2. **Contribute** — See [CONTRIBUTING.md](./CONTRIBUTING.md)
3. **Deploy** — See [DEPLOYMENT.md](./DEPLOYMENT.md) (coming soon)
4. **Set up real APIs** — Configure Brave, OpenAI, Claude keys

---

## Need Help?

- Check [API.md](./API.md) for API documentation
- See [README.md](./README.md) for more info
- Open an issue on GitHub
- Join our Discord community

**Happy building! 🚀**
