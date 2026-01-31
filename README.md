# APIRouter

Open-source lightweight API proxy service for managing multiple API integrations.

## Features

- 🔑 API Key management with permission isolation
- 🔄 Multi-provider support framework
- 📊 Usage statistics and monitoring
- 🚀 Docker-ready deployment
- 📚 Complete documentation and examples

## Quick Start

### Prerequisites

- Node.js 20 LTS
- npm 10+
- Docker & Docker Compose (optional)

### Development

```bash
# Install dependencies
npm install

# Start both backend and frontend in development
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Docker

```bash
# Start services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

## Project Structure

```
apirouter/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── utils/
│   ├── __tests__/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── services/
│   ├── __tests__/
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Health Check
- `GET /api/health` — Check backend status

### Keys (TBD)
- `GET /api/keys` — List API keys
- `POST /api/keys` — Create new key
- `DELETE /api/keys/:id` — Delete key

### Config (TBD)
- `GET /api/config/providers` — List providers
- `POST /api/config/providers/:provider` — Configure provider

### Stats (TBD)
- `GET /api/stats` — Get usage statistics

## Testing

- Backend: Jest (85%+ coverage target)
- Frontend: Vitest + React Testing Library (70%+ coverage target)
- E2E: Playwright (5 core user flows)

## Development Approach

This project uses **Test-Driven Development (TDD)**:
1. Write tests first
2. Implement functionality
3. Refactor for clarity

## License

MIT

## Contributing

See CONTRIBUTING.md (coming soon)
