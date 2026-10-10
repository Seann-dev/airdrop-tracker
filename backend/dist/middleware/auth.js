import { getAuth } from '@clerk/express';
/**
 * Requires a valid Clerk session. All data endpoints must use this.
 * The user ID comes from the server-verified session — never from the body.
 */
export function requireAuth(req, res, next) {
    const { userId } = getAuth(req);
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    req.userId = userId;
    next();
}
