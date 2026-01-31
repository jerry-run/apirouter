import { Request, Response, NextFunction } from 'express';

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

  // Verify key format (sk_xxxxx)
  if (!key.startsWith('sk_')) {
    res.status(401).json({ error: 'Invalid API key format' });
    return;
  }

  // TODO: In production, verify key against database and set req.keyId and req.keyProviders
  // For MVP, just validate format
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
