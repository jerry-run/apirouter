import express, { Express } from 'express';
import dotenv from 'dotenv';
import { KeyController } from './controllers/KeyController';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Key management routes
app.post('/api/keys', (req, res) => KeyController.createKey(req, res));
app.get('/api/keys', (req, res) => KeyController.listKeys(req, res));
app.get('/api/keys/:id', (req, res) => KeyController.getKey(req, res));
app.delete('/api/keys/:id', (req, res) => KeyController.deleteKey(req, res));

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Only listen if this is the main module (not imported for testing)
const isMainModule = process.env.NODE_ENV === 'production' || process.argv[1]?.includes('server.ts');
if (isMainModule) {
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}

export default app;
