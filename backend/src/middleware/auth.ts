import type { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';

export interface AuthedRequest extends Request {
  userId: string;
}

/**
 * Requires a valid Clerk session. All data endpoints must use this.
 * The user ID comes from the server-verified session — never from the body.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  (req as AuthedRequest).userId = userId;
  next();
}
