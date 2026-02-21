import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/validate-env.js';


export const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, username, role, ... }
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
