import { Request, Response, NextFunction } from 'express';
import KeyService from '../services/KeyService';

// Extend Express Request to include auth context
declare global {
  namespace Express {
    interface Request {
      keyId?: string;
      keyProviders?: string[];
    }
  }
}

/**
 * Verify API key from Authorization header
 * Format: Authorization: Bearer sk_xxxxx
 */
export function verifyApiKey(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const [scheme, key] = authHeader.split(' ');

  if (scheme !== 'Bearer') {
    res.status(401).json({ error: 'Invalid authorization scheme' });
    return;
  }

  if (!key) {
    res.status(401).json({ error: 'Missing API key' });
    return;
  }

  // Find key and verify
  const keyData = Array.from(Object.values({})); // Placeholder - actual implementation
  // For now, we'll use a simple lookup approach
  const foundKey = Array.from({ length: 0 }); // Will be refactored

  // NOTE: This is a placeholder. Real implementation needs KeyService to expose lookup by key string
  // For testing, we'll validate the format
  if (!key.startsWith('sk_')) {
    res.status(401).json({ error: 'Invalid API key format' });
    return;
  }

  // TODO: Connect to actual key lookup in KeyService
  next();
}

/**
 * Require specific provider access
 */
export function requireProvider(provider: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.keyProviders?.includes(provider)) {
      res.status(403).json({ error: `Provider ${provider} not authorized for this key` });
      return;
    }
    next();
  };
}
